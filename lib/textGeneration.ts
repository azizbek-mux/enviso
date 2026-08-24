/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
const FALLBACK_SPEC_MODEL = 'gemini-3.7-flash';
const FALLBACK_CODE_MODEL = 'gemini-3.7-flash';

export class QuotaError extends Error {}
export class AuthError extends Error {}
export class ModelError extends Error {}

export interface ModelChoice {
  /** Watches the video and drafts the plan. */
  spec: string;
  /** Writes the app. */
  code: string;
  /** Used when `code` has no quota left. */
  fallback: string;
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
  /embedding|aqa|imagen|image|tts|audio|live|omni|veo|learnlm|gemma/i;

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
  const tier = /pro/.test(id) ? 3 : /lite/.test(id) ? 1 : /flash/.test(id) ? 2 : 0;
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

/** Forget the resolved models, so the next call re-reads the live list. */
export function resetModelCache() {
  cachedChoice = null;
}

/**
 * Pick the best models this particular key can use.
 *
 * Version outranks tier. Preferring Pro unconditionally would reach past a
 * current Flash for a Pro two generations old -- exactly the retired model
 * that broke this app. Because the sort already places Pro ahead of Flash at
 * equal version, taking the top entry gets the newest Pro when one exists and
 * the newest Flash otherwise.
 */
export async function resolveModels(apiKey: string): Promise<ModelChoice> {
  if (cachedChoice) return cachedChoice;

  try {
    const models = await listUsableModels(apiKey);
    const flash = models.filter((m) => m.tier === 2);
    const capable = models.filter((m) => m.tier >= 2);
    // A key limited to flash-lite should still work, badly, rather than fail.
    const spec = flash[0] ?? capable[0] ?? models[0];
    const code = capable[0] ?? models[0];
    const fallback = flash[0] ?? capable[0] ?? models[0];

    if (spec && code) {
      cachedChoice = {
        spec: spec.id,
        code: code.id,
        fallback: (fallback ?? spec).id,
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
    fallback: FALLBACK_SPEC_MODEL,
  };
  return cachedChoice;
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
 * Turn whatever the SDK threw into something the UI can act on, so a spent
 * free quota reads as "retry smaller" rather than a raw stack trace.
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
    console.error('Gemini call failed:', error);
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
  let accumulated = '';

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
    console.error('Gemini stream failed:', error);
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
