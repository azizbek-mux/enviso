/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Lang} from '@/lib/i18n';

export const SPEC_FROM_VIDEO_PROMPT = `You are a pedagogist and product designer with deep expertise in crafting engaging learning experiences via interactive web apps.

FIRST, screen the attached video and report on it honestly:

- "language": the primary spoken language, as an English word ("English", "Russian", "Uzbek", "Spanish", ...). Use "None" if nobody speaks.
- "durationMinutes": the video's length in minutes, as a number.
- "contentKind": one of "educational", "music", "entertainment", "promotional", "other". Choose "music" for anything whose point is a song or performance, even if it is well made. Choose "educational" only when the video is genuinely trying to teach or explain something.
- "audioQuality": "clear" if the speech is easy to follow; "unclear" if it is drowned in noise or music, heavily distorted, or largely unintelligible; "none" if there is no speech at all.
- "teachable": true only if this video contains a specific idea a learner could practise with an interactive app.
- "reason": one short sentence explaining your judgement.

Be strict. Saying no to an unsuitable video is far more useful than producing a confident learning app built on something you could not properly hear or understand.

THEN, only if "teachable" is true AND "contentKind" is "educational", write the spec. Otherwise set "spec" to an empty string and stop -- do not invent a lesson out of material that does not contain one.

When you do write it: write a detailed and carefully considered spec for an interactive web app designed to complement the video and reinforce its key idea or ideas. The recipient of the spec does not have access to the video, so the spec must be thorough and self-contained (the spec must not mention that it is based on a video). Here is an example of a spec written in response to a video about functional harmony:

"In music, chords create expectations of movement toward certain other chords and resolution towards a tonal center. This is called functional harmony.

Build me an interactive web app to help a learner understand the concept of functional harmony.

SPECIFICATIONS:
1. The app must feature an interactive keyboard.
2. The app must showcase all 7 diatonic triads that can be created in a major key (i.e., tonic, supertonic, mediant, subdominant, dominant, submediant, leading chord).
3. The app must somehow describe the function of each of the diatonic triads, and state which other chords each triad tends to lead to.
4. The app must provide a way for users to play different chords in sequence and see the results.
[etc.]"

The goal of the app that is to be built based on the spec is to enhance understanding through simple and playful design. The provided spec should not be overly complex, i.e., a junior web developer should be able to implement it in a single html file (with all styles and scripts inline). Most importantly, the spec must clearly outline the core mechanics of the app, and those mechanics must be highly effective in reinforcing the given video's key idea(s).

Write the spec in English regardless of the language spoken in the video. The spec is a build brief for a developer, not user-facing text.`;

/**
 * JSON shape the screening call must return, enforced by the API itself.
 *
 * Screening and spec-writing share one request: the expensive part is watching
 * the video, so asking separately would double the cost of every rejection.
 */
export const SPEC_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    language: {
      type: 'string',
      description: 'Primary spoken language in English, or "None".',
    },
    durationMinutes: {type: 'number', description: 'Video length in minutes.'},
    contentKind: {
      type: 'string',
      enum: ['educational', 'music', 'entertainment', 'promotional', 'other'],
    },
    audioQuality: {type: 'string', enum: ['clear', 'unclear', 'none']},
    teachable: {type: 'boolean'},
    reason: {type: 'string'},
    spec: {
      type: 'string',
      description: 'The specification, or an empty string if unsuitable.',
    },
  },
  required: [
    'language',
    'durationMinutes',
    'contentKind',
    'audioQuality',
    'teachable',
    'spec',
  ],
} as const;

export const CODE_REGION_OPENER = '```';
export const CODE_REGION_CLOSER = '```';

export interface Palette {
  scheme: string;
  background: string;
  text: string;
  hint: string;
  accent: string;
  accentText: string;
}

/**
 * Requirements appended to every spec before it is handed to the code model.
 *
 * Three things make this different from the stock single-language prompt:
 *
 *  1. Bilingual output. Every user-facing string ships in both Uzbek and
 *     English behind an in-app toggle, so one generation serves both audiences.
 *  2. Telegram Mini App constraints. The result renders inside a sandboxed
 *     iframe on a phone: no web storage, no network, touch-sized controls.
 *  3. Theme matching. The live Telegram palette is injected so the generated
 *     app does not flash white inside a dark Telegram.
 */
export function buildSpecAddendum(palette: Palette, uiLang: Lang): string {
  return `


---

IMPLEMENTATION REQUIREMENTS

Provide the code as a single, self-contained HTML document. All styles and scripts must be inline. In the result, encase the code between "${CODE_REGION_OPENER}" and "${CODE_REGION_CLOSER}" for easy parsing.

BILINGUAL INTERFACE (this is a hard requirement, not a nice-to-have)
- Every single piece of user-facing text must be available in BOTH Uzbek and English: titles, labels, buttons, instructions, hints, feedback messages, tooltips, error text, and any explanatory prose.
- Do not translate at runtime and do not call any translation service. Author both languages by hand and hold them in one JavaScript object, for example: const T = { uz: { title: "..." }, en: { title: "..." } }.
- Give every text node a stable identifier (such as a data-i18n attribute) and write one applyLanguage(lang) function that rewrites all of them. Switching must be instant, with no page reload and no loss of the learner's current progress or state.
- Put a compact language toggle showing "OʻZ" and "EN" in a corner that is always reachable. Make the active language visually obvious.
- The starting language must be "${uiLang}".
- Uzbek must be natural, modern, Latin-script Uzbek. Use the correct characters oʻ and gʻ (U+02BB), never a plain apostrophe. Do not use Cyrillic.
- For scientific or technical terms with no settled Uzbek equivalent, give the Uzbek term followed by the English in parentheses on first use, e.g. "fotosintez (photosynthesis)".
- Design the layout so it does not break when text length changes between languages: Uzbek strings are often noticeably longer than their English counterparts. Avoid fixed-width buttons and single-line assumptions.

RUNTIME ENVIRONMENT (a sandboxed iframe inside a Telegram Mini App on a phone)
- Mobile-first. Assume a viewport about 360px wide with a touch screen. It must also scale up gracefully on desktop.
- Interactive targets must be at least 44x44px. Never rely on :hover, right-click, or keyboard-only interactions to convey information or drive core mechanics; support tap and drag.
- Do NOT use localStorage, sessionStorage, cookies, or IndexedDB. The sandbox blocks them and any access throws an exception that will break the app. Keep all state in JavaScript variables.
- Do NOT load anything over the network: no CDN scripts, no external stylesheets, no web fonts, no remote images, no fetch or XMLHttpRequest calls. Everything must be inline. Use CSS, inline SVG, emoji, or the Canvas API for visuals.
- If you need audio, synthesize it with the Web Audio API and only start the AudioContext inside a user gesture handler, since mobile browsers block autoplay.
- The document must never scroll horizontally. Long content scrolls vertically inside its own container.

VISUAL THEME (match the surrounding Telegram client)
- Colour scheme: ${palette.scheme}
- Page background: ${palette.background}
- Primary text: ${palette.text}
- Secondary / hint text: ${palette.hint}
- Accent and primary buttons: ${palette.accent}
- Text on accent: ${palette.accentText}
Use these exact values as the base palette. Derived shades are fine, but the app must feel like it belongs inside this theme, and text must stay readable against its background.

Keep the design simple, playful, and focused on the core mechanic. Working interactivity matters more than decoration.`;
}

/* -------------------------------------------------------------------------- */
/* Research papers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Screening plus plan for a research publication.
 *
 * Deliberately parallel to the video prompt: same screen-first discipline,
 * same JSON shape, so both sources flow through one pipeline. The brief asks
 * for an explanatory narrative rather than a quiz, because the thing a paper
 * most needs is for its central mechanism to become visible.
 */
export const SPEC_FROM_PAPER_PROMPT = `You are a science communicator and product designer who turns research publications into interactive explanatory web experiences.

FIRST, screen the publication provided (attached as a file, or at the URL given below) and report on it honestly:

- "language": the language the publication is written in, as an English word ("English", "Russian", "Uzbek", ...).
- "contentKind": "educational" for a genuine research paper, preprint, thesis, or serious technical report. Use "promotional" for marketing or press material, and "other" for anything else, including a page you could not actually read.
- "audioQuality": "clear" if you could read the full text, "unclear" if you could only reach an abstract, a paywall, or a scanned page you could not parse reliably, "none" if you could not read it at all.
- "teachable": true only if there is a specific, concrete mechanism, method or finding that an interactive explanation could make clearer.
- "title": the publication's title, as printed.
- "reason": one short sentence explaining your judgement.

Be strict. If you reached only an abstract or a landing page, say so with "unclear" rather than inventing the contents of a paper you did not read. A confident explanation of a paper you could not see is far worse than an honest refusal.

THEN, only if "teachable" is true AND "contentKind" is "educational", write the spec. Otherwise set "spec" to an empty string and stop.

When you do write it: produce a detailed, self-contained spec for a single-page interactive web experience that explains this publication to a curious reader who is not a specialist. The recipient of the spec has not read the paper, so the spec must carry every fact, number and definition it needs. The spec must:

1. Open by stating the problem the paper attacks, in plain language, and why it was hard.
2. Explain the core mechanism or method the paper contributes. This is the heart of it.
3. Include at least one INTERACTIVE diagram or simulation that makes that mechanism visible -- something the reader manipulates and sees respond, not a static picture. Describe precisely what it shows, what the reader controls, and what changes as a result.
4. Present the key quantitative results, with the actual numbers from the paper, and say plainly what they mean.
5. State the limitations or open questions the paper itself acknowledges.
6. Credit the authors and cite the publication.

Aim for the feel of a well-made museum exhibit: serious about the science, generous to the newcomer, and never padded. Every section must earn its place, and the interactive element must teach something a paragraph could not.

Write the spec in English regardless of the publication's language. The spec is a build brief for a developer, not user-facing text.`;

/** Appended when the source is a link rather than an uploaded file. */
export function paperUrlInstruction(url: string): string {
  return `

The publication is at this URL. Retrieve and read it before answering: ${url}`;
}

/**
 * Schema for the paper screening call.
 *
 * Shares the video screening's field names so one guard function judges both.
 * `durationMinutes` is absent because a paper has no length in minutes.
 */
export const PAPER_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    language: {type: 'string'},
    contentKind: {
      type: 'string',
      enum: ['educational', 'music', 'entertainment', 'promotional', 'other'],
    },
    audioQuality: {type: 'string', enum: ['clear', 'unclear', 'none']},
    teachable: {type: 'boolean'},
    title: {type: 'string'},
    reason: {type: 'string'},
    spec: {type: 'string'},
  },
  required: ['language', 'contentKind', 'audioQuality', 'teachable', 'spec'],
} as const;

/**
 * Asks for the same JSON without a response schema.
 *
 * Structured-output mode and server-side tools do not reliably combine, and
 * the URL path needs the retrieval tool, so that path states the shape in
 * words and leans on the tolerant parser instead.
 */
export const JSON_ONLY_INSTRUCTION = `

Return ONLY a JSON object, with no markdown fence and no commentary, with exactly these fields: "language" (string), "contentKind" (one of "educational", "music", "entertainment", "promotional", "other"), "audioQuality" (one of "clear", "unclear", "none"), "teachable" (boolean), "title" (string), "reason" (string), "spec" (string).`;
