/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Videos longer than this are refused before any Gemini call is made. */
export const MAX_DURATION_MINUTES = 30;

/**
 * Spoken languages the app accepts.
 *
 * Deliberately narrow. Gemini understands Uzbek far less reliably than English
 * or Russian, and a plan built on a misheard lecture produces a confident,
 * wrong learning app -- worse for a student than being told no.
 */
export const ALLOWED_LANGUAGES = ['english', 'russian'];

export type RejectionReason =
  | 'tooLong'
  | 'language'
  | 'music'
  | 'noisy'
  | 'notEducational'
  | 'unreadable'
  | 'notResearch';

/** A video the app declines to work with, as opposed to a failure. */
export class VideoRejectedError extends Error {
  constructor(
    readonly reason: RejectionReason,
    /** Extra context, e.g. the detected language or length. */
    readonly detail?: string,
  ) {
    super(reason);
    this.name = 'VideoRejectedError';
  }
}

/** What the model reports back about the video before writing anything. */
export interface Screening {
  language: string;
  durationMinutes?: number;
  contentKind: 'educational' | 'music' | 'entertainment' | 'promotional' | 'other';
  /** For a paper this reports readability rather than sound. */
  audioQuality: 'clear' | 'unclear' | 'none';
  teachable: boolean;
  title?: string;
  /** Learner-facing description of the result, written in both languages. */
  summaryEn?: string;
  summaryUz?: string;
  reason?: string;
  spec: string;
}

/** True when the video runs longer than the app will accept. */
export function isTooLong(seconds: number | null): boolean {
  if (seconds === null) return false;
  return seconds > MAX_DURATION_MINUTES * 60;
}

function normalise(language: string): string {
  return language.trim().toLowerCase();
}

/**
 * Apply the guards to a screening verdict, throwing on the first failure.
 *
 * Ordered so the user gets the most actionable objection: length and language
 * are things they can fix by choosing a different source, whereas "nothing to
 * teach" is a judgement they can only argue with.
 *
 * Both sources share these rules; only the wording of the refusal differs,
 * since "the audio is unclear" makes no sense about a PDF.
 */
export function assertUsable(
  screening: Screening,
  kind: 'video' | 'paper' = 'video',
): void {
  const {language, durationMinutes, contentKind, audioQuality, teachable} =
    screening;

  const paper = kind === 'paper';

  // Backstop for the client-side duration check, which returns null for live
  // streams and whenever the iframe player refuses to load.
  if (durationMinutes && durationMinutes > MAX_DURATION_MINUTES) {
    throw new VideoRejectedError(
      'tooLong',
      `${Math.round(durationMinutes)} min`,
    );
  }

  if (!paper && contentKind === 'music') {
    throw new VideoRejectedError('music');
  }

  // For a paper this means the model reached a paywall, a scan it could not
  // parse, or nothing at all -- so anything it wrote would be invention.
  if (audioQuality === 'none' || audioQuality === 'unclear') {
    throw new VideoRejectedError(paper ? 'unreadable' : 'noisy');
  }

  const spoken = normalise(language);
  if (!ALLOWED_LANGUAGES.some((allowed) => spoken.startsWith(allowed))) {
    throw new VideoRejectedError('language', language);
  }

  if (!teachable || contentKind !== 'educational') {
    throw new VideoRejectedError(paper ? 'notResearch' : 'notEducational');
  }

  if (!screening.spec?.trim()) {
    throw new VideoRejectedError(paper ? 'notResearch' : 'notEducational');
  }
}
