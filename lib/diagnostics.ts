/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {listUsableModels} from '@/lib/textGeneration';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

/** A short, public, well-known video used only to test video input. */
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=JfD0nHrJDC0';

export type CheckStatus = 'ok' | 'busy' | 'quota' | 'denied' | 'missing' | 'fail';

export interface Check {
  label: string;
  status: CheckStatus;
  /** HTTP status, when the check made a request. */
  http?: number;
  detail?: string;
}

export interface Report {
  checks: Check[];
  models: string[];
  /** Plain-text summary, for pasting into a chat. */
  text: string;
}

function statusFromHttp(http: number, message: string): CheckStatus {
  if (http === 200) return 'ok';
  if (http === 429) return 'quota';
  if (http === 503 || http === 500) return 'busy';
  if (http === 404) return 'missing';
  if (http === 401 || http === 403) return 'denied';
  if (/high demand|overloaded|UNAVAILABLE/i.test(message)) return 'busy';
  return 'fail';
}

/** One minimal request. Deliberately raw fetch: we want the real HTTP status,
 *  not something the SDK has retried, wrapped, or smoothed over. */
async function probe(
  apiKey: string,
  model: string,
  parts: unknown[],
): Promise<{http: number; message: string}> {
  try {
    const response = await fetch(
      `${API_ROOT}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [{role: 'user', parts}],
          generationConfig: {maxOutputTokens: 16},
        }),
      },
    );

    if (response.ok) return {http: response.status, message: 'OK'};

    const body = await response.text();
    let message = body;
    try {
      message = JSON.parse(body)?.error?.message ?? body;
    } catch {
      /* keep the raw body */
    }
    return {http: response.status, message: message.slice(0, 200)};
  } catch (error) {
    return {http: 0, message: error instanceof Error ? error.message : String(error)};
  }
}

/**
 * Work out what this key can actually do, one narrow question at a time.
 *
 * Written because three speculative fixes to the overload handling did not
 * touch the real problem: nobody had established which models the key can see,
 * or whether text and video fail together or separately.
 */
export async function runDiagnostics(
  apiKey: string,
  onProgress?: (checks: Check[]) => void,
): Promise<Report> {
  const checks: Check[] = [];
  const push = (check: Check) => {
    checks.push(check);
    onProgress?.([...checks]);
  };

  // 1. Does the key work at all?
  let models: string[] = [];
  try {
    const usable = await listUsableModels(apiKey);
    models = usable.map((m) => m.id);
    push({
      label: 'API key',
      status: 'ok',
      detail: `valid, sees ${models.length} usable model(s)`,
    });
  } catch (error) {
    push({
      label: 'API key',
      status: 'denied',
      detail: error instanceof Error ? error.message : String(error),
    });
    return finish(checks, models);
  }

  if (models.length === 0) {
    push({
      label: 'Models',
      status: 'missing',
      detail: 'This key cannot use any text-generation model.',
    });
    return finish(checks, models);
  }

  // 2. Plain text on each candidate. Cheapest possible question.
  const candidates = models.slice(0, 4);
  for (const model of candidates) {
    const {http, message} = await probe(apiKey, model, [{text: 'Say OK'}]);
    push({
      label: `Text: ${model}`,
      status: statusFromHttp(http, message),
      http,
      detail: http === 200 ? undefined : message,
    });
  }

  // 3. Video input, which is the step that actually fails in the app.
  const textOk = checks.find(
    (c) => c.label.startsWith('Text: ') && c.status === 'ok',
  );
  const videoModel = textOk?.label.replace('Text: ', '') ?? candidates[0];

  const {http, message} = await probe(apiKey, videoModel, [
    {text: 'Reply with one word.'},
    {fileData: {mimeType: 'video/mp4', fileUri: TEST_VIDEO_URL}},
  ]);
  push({
    label: `Video: ${videoModel}`,
    status: statusFromHttp(http, message),
    http,
    detail: http === 200 ? undefined : message,
  });

  return finish(checks, models);
}

function finish(checks: Check[], models: string[]): Report {
  const lines = [
    'GEMINI DIAGNOSTIC',
    `models seen: ${models.length ? models.join(', ') : 'none'}`,
    '',
    ...checks.map((c) => {
      const http = c.http ? ` [HTTP ${c.http}]` : '';
      const detail = c.detail ? ` - ${c.detail}` : '';
      return `${c.status.toUpperCase()}  ${c.label}${http}${detail}`;
    }),
  ];
  return {checks, models, text: lines.join('\n')};
}
