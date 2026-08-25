/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {listUsableModels} from '@/lib/textGeneration';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

/** A short, public, well-known video used only to test video input. */
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=JfD0nHrJDC0';

/** An open-access paper, used only to test whether links can be fetched. */
const TEST_PAPER_URL = 'https://doi.org/10.1371/journal.pone.0298940';

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
  tools?: unknown[],
): Promise<{http: number; message: string; text?: string}> {
  try {
    const response = await fetch(
      `${API_ROOT}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [{role: 'user', parts}],
          ...(tools ? {tools} : {}),
          generationConfig: {maxOutputTokens: 200},
        }),
      },
    );

    if (response.ok) {
      const body = await response.json();
      const text: string = (body?.candidates?.[0]?.content?.parts ?? [])
        .map((part: {text?: string}) => part.text ?? '')
        .join('')
        .trim();
      return {http: response.status, message: 'OK', text};
    }

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

  // 4. Link retrieval, which the research section depends on entirely.
  const link = await probe(
    apiKey,
    videoModel,
    [
      {
        text: `Fetch this page and reply with its exact title, nothing else: ${TEST_PAPER_URL}`,
      },
    ],
    [{url_context: {}}],
  );

  // A 200 that comes back empty or apologetic means the tool ran but fetched
  // nothing -- which looks identical to success unless the text is read.
  const fetched = Boolean(
    link.text && link.text.length > 8 && !/cannot|unable|sorry/i.test(link.text),
  );
  push({
    label: `Link fetch: ${videoModel}`,
    status: link.http === 200 ? (fetched ? 'ok' : 'fail') : statusFromHttp(link.http, link.message),
    http: link.http,
    detail:
      link.http === 200
        ? fetched
          ? `read: "${link.text?.slice(0, 80)}"`
          : `tool returned nothing usable: "${(link.text ?? '').slice(0, 80)}"`
        : link.message,
  });

  // 5. How fast a real generation is, and whether the key survives two at
  //    once. Guessing at these is what turned a slow pipeline into a stalled
  //    one, so they are measured rather than assumed.
  const started = Date.now();
  const sized = await probe(apiKey, videoModel, [
    {
      text: 'Write a single self-contained HTML page of roughly 150 lines: a heading, three cards and a small inline SVG bar chart. Return only the HTML.',
    },
  ]);
  const elapsed = Date.now() - started;
  push({
    label: `Generation speed: ${videoModel}`,
    status: sized.http === 200 ? 'ok' : statusFromHttp(sized.http, sized.message),
    http: sized.http,
    detail:
      sized.http === 200
        ? `${(elapsed / 1000).toFixed(1)}s for ~${Math.round((sized.text ?? '').length / 1024)}KB`
        : `${(elapsed / 1000).toFixed(1)}s then ${sized.message}`,
  });

  const burst = await Promise.all([
    probe(apiKey, videoModel, [{text: 'Say OK'}]),
    probe(apiKey, videoModel, [{text: 'Say OK'}]),
    probe(apiKey, videoModel, [{text: 'Say OK'}]),
  ]);
  const limited = burst.filter((b) => b.http === 429).length;
  const okCount = burst.filter((b) => b.http === 200).length;
  push({
    label: 'Three requests at once',
    status: limited > 0 ? 'quota' : okCount === 3 ? 'ok' : 'fail',
    detail:
      limited > 0
        ? `${limited} of 3 rate-limited -- this key cannot run parts in parallel`
        : `${okCount} of 3 succeeded`,
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
