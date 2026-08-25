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
- "title": a short title for what this teaches, in English.
- "summaryEn": two or three sentences, in English, telling a learner what the app you are about to design will teach them and what they will do in it. Address the learner directly. No jargon, no mention of specs or code.
- "summaryUz": the same summary in natural Latin-script Uzbek, using the characters oʻ and gʻ (U+02BB) rather than a plain apostrophe. Not a literal translation -- write it as an Uzbek speaker would.
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
    title: {type: 'string'},
    summaryEn: {type: 'string'},
    summaryUz: {type: 'string'},
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
export function buildSpecAddendum(
  palette: Palette,
  uiLang: Lang,
  kind: 'video' | 'paper' = 'video',
): string {
  const paper = kind === 'paper';

  /*
   * Learning apps stay strictly offline: they are small, and a CDN is a
   * failure point they do not need. An explainer website may need real 3D,
   * which is not worth hand-rolling in WebGL, so that path -- and only that
   * path -- may reach for three.js.
   */
  const networkRule = paper
    ? THREE_JS_RULE
    : `- Do NOT load anything over the network: no CDN scripts, no external stylesheets, no web fonts, no remote images, no fetch or XMLHttpRequest calls. Everything must be inline. Use CSS, inline SVG, emoji, or the Canvas API for visuals.`;

  const closing = paper ? PAPER_CRAFT_RULE : APP_CRAFT_RULE;

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
- Do NOT use localStorage, sessionStorage, cookies, or IndexedDB. The sandbox blocks them and any access throws an exception that will break the page. Keep all state in JavaScript variables.
${networkRule}
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

${closing}`;
}

const THREE_JS_RULE = `- Load nothing over the network EXCEPT three.js, and only if the spec calls for a 3D scene. When you need it, import it exactly like this and add no other remote resource of any kind:

  <script type="importmap">
  {"imports":{"three":"https://unpkg.com/three@0.181.1/build/three.module.js","three/addons/":"https://unpkg.com/three@0.181.1/examples/jsm/"}}
  </script>
  <script type="module">
  import * as THREE from 'three';
  import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
  </script>

  Keep any scene light enough for a phone: cap the pixel ratio at 2, keep geometry simple, pause the render loop when the canvas scrolls out of view, and if WebGL is unavailable show a diagram in its place rather than an empty box. Still no web fonts, no remote images, and no fetch or XMLHttpRequest.`;

const APP_CRAFT_RULE = `Keep the design simple, playful, and focused on the core mechanic. Working interactivity matters more than decoration.`;

const PAPER_CRAFT_RULE = `TYPOGRAPHY AND PACING
- This is a long-form site, so it must be a pleasure to read: a serif face for headings against a clean sans for body text, generous line height, a measure of roughly 65-75 characters, and real space between sections.
- Let it breathe. A confident explainer is unhurried; do not compress it into a stack of cards.
- The reader must always know where they are, so give it a slim sticky header or section markers rather than letting a long scroll run unmarked.

Working interactivity and clear explanation matter more than decoration, but this should look like something made with care.`;

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
- "summaryEn": two or three sentences, in English, telling a reader what the explainer you are about to design will show them and what they will be able to try in it. Address the reader directly. No jargon, no mention of specs or code.
- "summaryUz": the same summary in natural Latin-script Uzbek, using the characters oʻ and gʻ (U+02BB) rather than a plain apostrophe. Not a literal translation -- write it as an Uzbek speaker would.
- "facts": a JSON object, given as a STRING, that is the complete data layer for the site. Everything built later is computed from this and nothing else, so it decides how good the result can be. Include:
    * "meta": title, journal, volume and pages, year, all dates given (received, accepted, published), DOI and its URL, institution, ethics approval, funding, and any accession or registration identifiers.
    * "authors": an array of every author with name, role or contribution, institution, department and email where the paper prints them.
    * "metrics": the headline numbers, each with a label, the value, its unit, and what it means.
    * "tables": every table that matters, each with a name, its column headers, and ALL of its rows as arrays of strings. Do not summarise a table -- reproduce it.
    * "records": if the paper reports per-subject, per-sample or per-timepoint data, reproduce those individual rows in full with every field. A cohort of sixteen patients is sixteen objects, not a count. This is what allows a figure to be explored rather than merely displayed.
    * "statistics": any correlation, p-value, confidence interval or effect size, each with what was compared and the exact reported value.
    * "steps": if the paper describes a procedure, method or pipeline, its ordered stages with names and descriptions.
    * "findings" and "limitations": the paper's own claims and its own stated caveats, as arrays of sentences.
  SCALE MATTERS MORE THAN BREVITY HERE. In the reference build this data layer runs to over a thousand lines: twenty-eight genetic loci each carrying nineteen fields, every PheWAS outcome, every randomisation estimate, every author. Aim for that completeness. A record with three fields produces a figure with nothing to explore; a record with fifteen produces one worth opening. Extract every field the paper prints for every row it prints, and prefer a long, exhaustive facts object over a tidy summary.

  Use the paper's exact values and units. Never round, never estimate, never invent a figure to fill a gap. If the paper does not report something, omit the field rather than guessing.
- "identity": a JSON object, as a STRING, giving the site its own identity rather than a generic one: "name" (a short product-like name for this explainer, e.g. "ReproGenetics & Pregnancy Loss" or "AlphaQubit Decoder"), "tagline" (six to ten words describing what the reader can do here), "accent" (a hex colour drawn from the subject matter -- deep crimson for haematology, teal for marine biology, indigo for astronomy -- that works as a dark accent on a cream page), and "ctaLabel" (what the button linking to the paper should say, e.g. "Read Preprint").
- "sections": an array of FOUR to SIX section objects, named after THIS paper's own subject matter, never after a generic template. Each has "key" (a short lowercase slug), "titleEn", "titleUz", "instrument" (which kind of interactive figure it carries, chosen from: manhattan-plot, forest-plot, scatter-regression, ideogram, simulator, filterable-table, comparison-matrix, timeline, stepped-procedure, network-diagram, 3d-scene, annotated-figure), and "brief" (two or three sentences saying exactly what this section shows and what the reader can manipulate). Good section names look like "Chromosomes & Loci", "UK Biobank PheWAS", "Mendelian Randomization", "PGS Simulator" -- they name the science. Bad ones look like "Overview", "Problem", "Results", "Discussion" -- they name a template. Order them as a narrative: what the problem is, how it was attacked, what came out, what it means.
- "reason": one short sentence explaining your judgement.

Be strict. If you reached only an abstract or a landing page, say so with "unclear" rather than inventing the contents of a paper you did not read. A confident explanation of a paper you could not see is far worse than an honest refusal.

THEN, only if "teachable" is true AND "contentKind" is "educational", write the spec. Otherwise set "spec" to an empty string and stop.

When you do write it: produce a detailed, self-contained spec for an EXPLAINER WEBSITE about this publication -- a long-form, scrolling narrative site, not a small app and not a quiz. Think of how a museum or a good science magazine presents a piece of research: it opens, it unfolds, it makes one difficult idea visible. The recipient of the spec has not read the paper, so the spec must carry every fact, number, name and definition it needs.

Specify the site as a sequence of sections, and say what each one contains:

1. A HERO: the paper's title, its authors, the journal and date, and one sentence stating what was achieved. Describe the visual that sits behind or beside it.
2. THE PROBLEM: what question the paper attacks, in plain language, and why it was hard. No jargon before it is explained.
3. THE MECHANISM: the method or contribution at the heart of the paper. This is the centre of the site and should be its longest, most carefully staged part.
4. AT LEAST ONE INTERACTIVE VISUAL that makes that mechanism visible -- something the reader manipulates and sees respond, not a static picture. Say precisely what is shown, what the reader controls, and what changes as a result.
5. RESULTS: the key numbers, exactly as the paper reports them, and plainly what they mean.
6. LIMITATIONS: the open questions the paper itself acknowledges.
7. CREDITS: the authors, their institutions, and the citation with a link to the publication.

ON THREE-DIMENSIONAL VISUALS. If, and only if, the subject is genuinely spatial -- a molecular or crystal structure, an anatomical arrangement, a physical or astronomical system, a lattice, a field, a geometry, a device -- then specify a real 3D scene the reader can orbit and inspect, saying what it depicts and what the controls do. Three.js will be available for this. When the subject is not spatial, do NOT ask for 3D: a well-made 2D diagram, chart or animation explains a statistical or algorithmic result far better, and a gratuitous rotating object is worse than none.

Aim for the feel of a well-made exhibit: serious about the science, generous to the newcomer, unhurried, never padded. Every section must earn its place, and the interactive parts must show something the prose could not.

Write the spec in English regardless of the publication's language. The spec is a build brief for a developer, not user-facing text.`;

/**
 * Appended when the source is a link rather than an uploaded file.
 *
 * More than one address may be offered for the same paper, because a DOI is a
 * redirect and the retrieval tool reads what the redirect returns rather than
 * where it points. Trying the publisher's own article URL alongside it is the
 * difference between reading a paper and reporting it paywalled.
 */
const NEWLINE = String.fromCharCode(10);

export function paperUrlInstruction(urls: string[]): string {
  if (urls.length === 1) {
    return `

The publication is at this URL. Retrieve and read it before answering: ${urls[0]}`;
  }

  return `

The publication can be reached at the addresses below. They are the same paper, listed with the most likely full text first. Retrieve them and work from whichever gives you the complete article; if one is only a redirect, a landing page or an abstract, try the next before concluding that the full text is unavailable.

${urls.map((url) => `- ${url}`).join(NEWLINE)}`;
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
    summaryEn: {type: 'string'},
    summaryUz: {type: 'string'},
    identity: {type: 'string'},
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {type: 'string'},
          titleEn: {type: 'string'},
          titleUz: {type: 'string'},
          instrument: {type: 'string'},
          brief: {type: 'string'},
        },
        required: ['key', 'titleEn', 'titleUz', 'instrument', 'brief'],
      },
    },
    facts: {
      type: 'string',
      description:
        'JSON string of the paper metadata, authors, numbers and tables.',
    },
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

Return ONLY a JSON object, with no markdown fence and no commentary, with exactly these fields: "language" (string), "contentKind" (one of "educational", "music", "entertainment", "promotional", "other"), "audioQuality" (one of "clear", "unclear", "none"), "teachable" (boolean), "title" (string), "summaryEn" (string), "summaryUz" (string), "identity" (string containing JSON), "sections" (array of objects with key, titleEn, titleUz, instrument, brief), "facts" (string containing JSON), "reason" (string), "spec" (string).`;

/* -------------------------------------------------------------------------- */
/* Variations                                                                 */
/* -------------------------------------------------------------------------- */

export type VariationKind = 'simpler' | 'visual' | 'quiz';

/**
 * A nudge appended to an existing plan.
 *
 * Rebuilding from the same plan costs one call rather than two, since the
 * source never has to be read again -- which is what makes "try another
 * version" cheap enough to offer at all.
 */
export const VARIATIONS: Record<VariationKind, string> = {
  simpler: `

REVISION: Make this markedly simpler. Cut every secondary feature and keep only the single core mechanic. Assume a learner meeting this topic for the first time, and shorten all explanatory text.`,
  visual: `

REVISION: Make this far more visual. Replace explanatory prose with diagrams, animation and direct manipulation wherever possible, so the learner sees the idea behind the words rather than reading about it.`,
  quiz: `

REVISION: Restructure this as active recall. Build it around questions the learner answers and gets immediate feedback on, with a visible score, rather than around exposition they read.`,
};
