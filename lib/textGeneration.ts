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

/** Model used to watch the video and draft the plan. */
export const SPEC_MODEL = 'gemini-2.5-flash';
/** Model used to write the app. */
export const CODE_MODEL = 'gemini-2.5-pro';
/** Used when the account has no free quota left on the larger model. */
export const CODE_FALLBACK_MODEL = 'gemini-2.5-flash';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

export class QuotaError extends Error {}
export class AuthError extends Error {}

interface GenerateOptions {
  apiKey: string;
  modelName: string;
  prompt: string;
  videoUrl?: string;
  temperature?: number;
  config?: GenerateContentConfig;
}

function buildParts(prompt: string, videoUrl?: string): Part[] {
  const parts: Part[] = [{text: prompt}];
  if (videoUrl) {
    parts.push({fileData: {mimeType: 'video/mp4', fileUri: videoUrl}});
  }
  return parts;
}

/**
 * Turn whatever the SDK threw into something the UI can act on, so a spent
 * free quota reads as "retry smaller" rather than a raw stack trace.
 */
function classify(error: unknown): Error {
  const message =
    error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const status = (error as {status?: number})?.status;

  if (status === 429 || /quota|rate limit|RESOURCE_EXHAUSTED/i.test(message)) {
    return new QuotaError(message);
  }
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(
      message,
    )
  ) {
    return new AuthError(message);
  }
  return error instanceof Error ? error : new Error(message);
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
