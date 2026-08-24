/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {storage} from '@/lib/telegram';
import {
  FinishReason,
  type GenerateContentConfig,
  GoogleGenAI,
  type Part,
} from '@google/genai';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Last-resort model ids, used only if the model list cannot be fetched.
 *
 * Hardcoding model names is what broke this app once already: Google closed
 * the 2.5 family to new keys and every request started 404ing. The real
 * defence is resolveModels() below, which asks the user's own key what it can
 * actually run. These names are just a life raft.
 */
const FALLBACK_SPEC_MODEL = 'gemini-3.6-flash';
const FALLBACK_CODE_MODEL = 'gemini-3.6-flash';

/**
 * Waits between whole passes over the model list.
 *
 * The first pass has no delay at all. Measured against a real key, the newest
 * model returned 503 while the one directly behind it answered immediately --
 * so asking every model once beats waiting half a minute on the busiest one.
 */
const ROUND_DELAYS_MS = [0, 5000, 15000];

/** Enough alternates to outlast a busy spell, few enough to bound the wait. */
const MAX_CHAIN_LENGTH = 4;

/** Remembers the model that last worked, so the next run starts there. */
const PREFERRED_MODEL_KEY = 'preferred_model';

export class QuotaError extends Error {}
export class AuthError extends Error {}
export class ModelError extends Error {}
/** Google's capacity problem, not ours: worth asking a different model. */
export class OverloadedError extends Error {}

export interface ModelChoice {
  /** Watches the video and drafts the plan. */
  spec: string;
  /** Writes the app. */
  code: string;
  /**
   * Distinct models to walk when one is busy or out of quota, best first.
   *
   * The newest model is also the most contended, so "try the fallback" is
   * worthless if the fallback resolves to the same name. These are guaranteed
   * to be different models.
   */
  chain: string[];
}

interface GenerateOptions {
  apiKey: string;
  modelName: string;
  prompt: string;
  videoUrl?: string;
  temperature?: number;
  config?: GenerateContentConfig;
}

/* -------------------------------------------------------------------------- */
/* Model discovery                                                            */
/* -------------------------------------------------------------------------- */

/** Model families that cannot write a web app from a text prompt. */
const NOT_GENERAL_PURPOSE =
  /embedding|aqa|imagen|image|tts|audio|live|omni|veo|learnlm|gemma|customtools/i;

interface RankedModel {
  id: string;
  version: number;
  /** 3 = pro, 2 = flash, 1 = flash-lite. */
  tier: number;
  preview: boolean;
}

function rank(id: string): RankedModel | null {
  if (!id.startsWith('gemini-') || NOT_GENERAL_PURPOSE.test(id)) return null;

  const match = id.match(/^gemini-(\d+)(?:\.(\d+))?/);
  if (!match) return null;

  // "3.7" sorts above "3.6", and both above "2.5".
  const version = Number(match[1]) + (match[2] ? Number(match[2]) / 100 : 0);
  const tier = /pro/.test(id)
    ? 3
    : /lite/.test(id)
      ? 1
      : /flash/.test(id)
        ? 2
        : 0;
  if (tier === 0) return null;

  return {id, version, tier, preview: /preview|exp/.test(id)};
}

/** Newest first, with stable releases always ahead of previews. */
function byPreference(a: RankedModel, b: RankedModel) {
  if (a.preview !== b.preview) return a.preview ? 1 : -1;
  if (a.version !== b.version) return b.version - a.version;
  return b.tier - a.tier;
}

/** Ask the key which models it may call. Costs no tokens. */
export async function listUsableModels(apiKey: string): Promise<RankedModel[]> {
  const response = await fetch(
    `${API_ROOT}/models?key=${encodeURIComponent(apiKey)}&pageSize=1000`,
  );
  if (!response.ok) {
    throw new Error(`Could not list models (HTTP ${response.status})`);
  }

  const body = (await response.json()) as {
    models?: {name?: string; supportedGenerationMethods?: string[]}[];
  };

  return (body.models ?? [])
    .filter((model) =>
      model.supportedGenerationMethods?.includes('generateContent'),
    )
    .map((model) => rank((model.name ?? '').replace(/^models\//, '')))
    .filter((model): model is RankedModel => model !== null)
    .sort(byPreference);
}

let cachedChoice: ModelChoice | null = null;
let preferredModel: string | null = null;

/** Forget the resolved models, so the next call re-reads the live list. */
export function resetModelCache() {
  cachedChoice = null;
}

function moveToFront(chain: string[], id: string): string[] {
  if (!chain.includes(id)) return chain;
  return [id, ...chain.filter((entry) => entry !== id)];
}

/**
 * Record the model that just worked.
 *
 * Contention is not evenly spread: one key's newest model can be busy all day
 * while the previous release sits idle. Starting from whatever last succeeded
 * skips paying that discovery cost on every later run.
 */
export function rememberWorkingModel(id: string) {
  if (preferredModel === id) return;
  preferredModel = id;
  void storage.set(PREFERRED_MODEL_KEY, id);
  if (cachedChoice) {
    cachedChoice = {...cachedChoice, chain: moveToFront(cachedChoice.chain, id)};
  }
}

/**
 * Pick the models this key should try, best first.
 *
 * Version outranks tier. Preferring Pro unconditionally would reach past a
 * current Flash for a Pro two generations old -- exactly the retired model
 * that broke this app once.
 */
export async function resolveModels(apiKey: string): Promise<ModelChoice> {
  if (cachedChoice) return cachedChoice;

  if (preferredModel === null) {
    preferredModel = await storage.get(PREFERRED_MODEL_KEY);
  }

  try {
    const models = await listUsableModels(apiKey);
    const flash = models.filter((m) => m.tier === 2);
    const capable = models.filter((m) => m.tier >= 2);
    // A key limited to flash-lite should still work, badly, rather than fail.
    const bestSpec = flash[0] ?? capable[0] ?? models[0];
    const bestCode = capable[0] ?? models[0];

    // Capable models first, then lite ones, which are far less contended and
    // still beat showing the user nothing.
    let chain = [...new Set([...capable, ...models].map((m) => m.id))];
    if (preferredModel) chain = moveToFront(chain, preferredModel);
    chain = chain.slice(0, MAX_CHAIN_LENGTH);

    if (bestSpec && bestCode && chain.length) {
      // A model already proven to work on this key outranks a theoretically
      // better one that may be refusing requests.
      const proven = preferredModel && chain[0] === preferredModel;
      cachedChoice = {
        spec: proven ? chain[0] : bestSpec.id,
        code: proven ? chain[0] : bestCode.id,
        chain,
      };
      console.info('Resolved Gemini models:', cachedChoice);
      return cachedChoice;
    }
  } catch (error) {
    console.warn('Model discovery failed, using defaults:', error);
  }

  cachedChoice = {
    spec: FALLBACK_SPEC_MODEL,
    code: FALLBACK_CODE_MODEL,
    chain: [...new Set([FALLBACK_SPEC_MODEL, FALLBACK_CODE_MODEL])],
  };
  return cachedChoice;
}

/* -------------------------------------------------------------------------- */
/* Running a call across several models                                       */
/* -------------------------------------------------------------------------- */

export interface AcrossModelsHooks {
  /** A model failed and another is about to be tried. */
  onSwitch?: (nextModel: string, previous: Error) => void;
  /** Every model refused; pausing before another pass. */
  onWait?: (waitMs: number, round: number, of: number) => void;
}

function isRecoverable(error: unknown) {
  return (
    error instanceof OverloadedError ||
    error instanceof QuotaError ||
    error instanceof ModelError
  );
}

/**
 * Try `attempt` on each model, in rounds.
 *
 * The first round runs straight through the list with no delay, because a
 * different model is the fastest cure for a busy one. Only once every model
 * has refused does it start waiting between passes.
 *
 * Anything that is not busy, spent or missing -- a bad key, a blocked prompt
 * -- fails immediately, because no other model would answer differently.
 */
export async function acrossModels<T>(
  chain: string[],
  attempt: (modelName: string) => Promise<T>,
  hooks: AcrossModelsHooks = {},
): Promise<T> {
  let lastError: Error = new Error('No usable Gemini model found');

  for (let round = 0; round < ROUND_DELAYS_MS.length; round++) {
    const wait = ROUND_DELAYS_MS[round];
    if (wait > 0) {
      hooks.onWait?.(wait, round, ROUND_DELAYS_MS.length - 1);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }

    for (let i = 0; i < chain.length; i++) {
      const model = chain[i];
      try {
        const result = await attempt(model);
        rememberWorkingModel(model);
        return result;
      } catch (error) {
        if (!isRecoverable(error)) throw error;
        lastError = error as Error;

        const next = chain[i + 1];
        if (next) hooks.onSwitch?.(next, lastError);
      }
    }
  }

  throw lastError;
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

function buildParts(prompt: string, videoUrl?: string): Part[] {
  const parts: Part[] = [{text: prompt}];
  if (videoUrl) {
    parts.push({fileData: {mimeType: 'video/mp4', fileUri: videoUrl}});
  }
  return parts;
}

/** Google returns its errors as a JSON blob; show the sentence, not the blob. */
function readableMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{')));
    return parsed?.error?.message || raw;
  } catch {
    return raw;
  }
}

/**
 * Turn whatever the SDK threw into something the caller can act on, so a busy
 * model reads as "ask someone else" rather than a raw stack trace.
 */
function classify(error: unknown): Error {
  const raw =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const message = readableMessage(raw);
  const status = (error as {status?: number})?.status;

  if (status === 429 || /quota|rate limit|RESOURCE_EXHAUSTED/i.test(raw)) {
    return new QuotaError(message);
  }
  if (
    status === 503 ||
    status === 500 ||
    /overloaded|high demand|UNAVAILABLE|try again later|temporarily/i.test(raw)
  ) {
    return new OverloadedError(message);
  }
  if (
    status === 404 ||
    /not found|no longer available|NOT_FOUND|is not supported/i.test(raw)
  ) {
    return new ModelError(message);
  }
  if (
    status === 401 ||
    status === 403 ||
    /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(
      raw,
    )
  ) {
    return new AuthError(message);
  }
  return new Error(message);
}

function checkCandidate(response: {
  promptFeedback?: {blockReason?: string};
  candidates?: {finishReason?: FinishReason}[];
}) {
  if (response.promptFeedback?.blockReason) {
    throw new Error(
      `Prompt blocked (${response.promptFeedback.blockReason}). Try a different video.`,
    );
  }
  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error('The model returned no output. Try again.');
  }
  const reason = candidate.finishReason;
  if (reason && reason !== FinishReason.STOP) {
    if (reason === FinishReason.SAFETY) {
      throw new Error('Response blocked by safety settings.');
    }
    if (reason === FinishReason.MAX_TOKENS) {
      throw new Error(
        'The app was too long to finish. Try a shorter video or simplify the plan.',
      );
    }
    throw new Error(`Generation stopped early (${reason}).`);
  }
}

/** One-shot generation. Used for the spec, which is small and needs JSON. */
export async function generateText(options: GenerateOptions): Promise<string> {
  const {apiKey, modelName, prompt, videoUrl, temperature = 0.75} = options;
  if (!apiKey) throw new AuthError('Gemini API key is missing');

  const ai = new GoogleGenAI({apiKey});

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{role: 'user', parts: buildParts(prompt, videoUrl)}],
      config: {temperature, ...options.config},
    });
    checkCandidate(response);
    return response.text ?? '';
  } catch (error) {
    console.error(`Gemini call failed on ${modelName}:`, error);
    throw classify(error);
  }
}

/**
 * Streaming generation. The app can take a minute or more to write, so the
 * code path streams and reports partial text -- on a phone, visible progress
 * is the difference between waiting and closing the app.
 */
export async function generateTextStream(
  options: GenerateOptions & {onChunk?: (accumulated: string) => void},
): Promise<string> {
  const {
    apiKey,
    modelName,
    prompt,
    videoUrl,
    temperature = 0.75,
    onChunk,
  } = options;
  if (!apiKey) throw new AuthError('Gemini API key is missing');

  const ai = new GoogleGenAI({apiKey});

  // Each attempt starts from nothing, so a stream that dies halfway cannot
  // leave half a document glued to the front of the next model's output.
  let accumulated = '';
  onChunk?.('');

  try {
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: [{role: 'user', parts: buildParts(prompt, videoUrl)}],
      config: {temperature, ...options.config},
    });

    let last: Parameters<typeof checkCandidate>[0] | undefined;
    for await (const chunk of stream) {
      last = chunk;
      if (chunk.text) {
        accumulated += chunk.text;
        onChunk?.(accumulated);
      }
    }

    if (last) checkCandidate(last);
    if (!accumulated) throw new Error('The model returned no output.');
    return accumulated;
  } catch (error) {
    console.error(`Gemini stream failed on ${modelName}:`, error);
    throw classify(error);
  }
}

/**
 * Cheap key check that costs no tokens: list the models the key can see.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  const key = apiKey.trim();
  if (!key) return false;
  try {
    const response = await fetch(
      `${API_ROOT}/models?key=${encodeURIComponent(key)}&pageSize=1`,
    );
    return response.ok;
  } catch (error) {
    console.warn('Key validation request failed:', error);
    return false;
  }
}
