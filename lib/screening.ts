/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {SourceKind} from '@/lib/source';

/** Videos longer than this are refused before any Gemini call is made. */
export const MAX_DURATION_MINUTES = 30;

/**
 * Spoken languages the app accepts.
 *
 * English only. Comprehension falls away outside it, and a plan built on a
 * misheard lecture produces a confident, wrong app -- worse for a student
 * than being told no. The app itself is English throughout, so this is one
 * rule rather than two.
 */
export const ALLOWED_LANGUAGES = ['english'];

export type RejectionReason =
  | 'tooLong'
  | 'language'
  | 'music'
  | 'noSpeech'
  | 'notEducational'
  | 'unreadable'
  | 'notResearch'
  | 'illegible';

/** A video the app declines to work with, as opposed to a failure. */
export class VideoRejectedError extends Error {
  constructor(
    readonly reason: RejectionReason,
    /** Extra context, e.g. the detected language or length. */
    readonly detail?: string,
    /** The model's own sentence explaining the judgement. */
    readonly said?: string,
  ) {
    super(reason);
    this.name = 'VideoRejectedError';
  }
}

/**
 * Whether the user may overrule this refusal.
 *
 * Length is a hard limit -- an hour of video costs what it costs. The rest are
 * judgements about content, and the person who chose the video knows it better
 * than a model that watched it once.
 */
export function isOverridable(reason: RejectionReason): boolean {
  return reason !== 'tooLong';
}

/** What the model reports back about the video before writing anything. */
export interface Screening {
  language: string;
  durationMinutes?: number;
  contentKind: 'educational' | 'music' | 'entertainment' | 'promotional' | 'other';
  /** For a paper or a diagram this reports legibility rather than sound. */
  audioQuality: 'clear' | 'unclear' | 'none';
  teachable: boolean;
  title?: string;
  /** Learner-facing description of the result, written in both languages. */
  summaryEn?: string;
  summaryUz?: string;
  /** JSON string of the paper's metadata, numbers and tables. */
  facts?: string;
  /** JSON string giving the site a name, tagline, accent and call to action. */
  identity?: string;
  /** Sections named after this paper's subject, not after a template. */
  sections?: {
    key: string;
    titleEn: string;
    titleUz: string;
    instrument: string;
    brief: string;
  }[];
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
  kind: SourceKind = 'video',
): void {
  const said = screening.reason;
  const {language, durationMinutes, contentKind, audioQuality, teachable} =
    screening;

  const paper = kind === 'paper';

  /*
   * A diagram is judged on one thing: whether anything can be made out.
   *
   * The language guard cannot apply -- a napkin sketch has no language, and
   * "None" is the normal answer for a wireframe rather than grounds to
   * refuse. Nor can teachability: the whole point is that a photograph of a
   * cluttered desk becomes a tidying game. If the model could see it, there
   * is something to build.
   */
  if (kind === 'diagram') {
    if (audioQuality === 'none') {
      throw new VideoRejectedError('illegible', undefined, said);
    }
    if (!screening.spec?.trim()) {
      throw new VideoRejectedError('illegible', undefined, said);
    }
    return;
  }

  // Backstop for the client-side duration check, which returns null for live
  // streams and whenever the iframe player refuses to load.
  if (durationMinutes && durationMinutes > MAX_DURATION_MINUTES) {
    throw new VideoRejectedError(
      'tooLong',
      `${Math.round(durationMinutes)} min`,
      said,
    );
  }

  const spoken = normalise(language);
  const wrongLanguage = !ALLOWED_LANGUAGES.some((allowed) =>
    spoken.startsWith(allowed),
  );

  /*
   * A video is refused for three things only.
   *
   * Whether a subject is teachable is a judgement, and it was being made
   * badly -- an essay on attention was called unteachable while an essay on
   * friendship became a good app. So the judgement is gone. What remains are
   * facts about the recording: it is a song, nobody speaks, or nobody speaks
   * a language the model can follow. Everything else is built.
   */
  if (!paper) {
    if (contentKind === 'music') {
      throw new VideoRejectedError('music', undefined, said);
    }
    // Rain, birdsong, ambience: there is no lesson in a video with no words.
    if (audioQuality === 'none') {
      throw new VideoRejectedError('noSpeech', undefined, said);
    }
    if (wrongLanguage) {
      throw new VideoRejectedError('language', language, said);
    }
    if (!screening.spec?.trim()) {
      throw new VideoRejectedError('notEducational', undefined, said);
    }
    return;
  }

  // A paper is a different matter: it is either readable or it is not, and
  // an explainer written from a paywall page would be invention.
  if (audioQuality === 'none' || audioQuality === 'unclear') {
    throw new VideoRejectedError('unreadable', undefined, said);
  }

  if (wrongLanguage) {
    throw new VideoRejectedError('language', language, said);
  }

  if (!teachable || contentKind !== 'educational' || !screening.spec?.trim()) {
    throw new VideoRejectedError('notResearch', undefined, said);
  }
}
