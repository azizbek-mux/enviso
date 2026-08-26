/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


export const SPEC_FROM_VIDEO_PROMPT = `You are a learning designer who turns a lesson into something a student practises with, not something they read.

FIRST, screen the attached video and report on it honestly:

- "language": the primary spoken language, as an English word ("English", "Russian", "Uzbek", "Spanish", ...). Use "None" if nobody speaks.
- "durationMinutes": the video's length in minutes, as a number.
- "contentKind": one of "educational", "music", "entertainment", "promotional", "other". Choose "music" for anything whose point is a song or performance, even if it is well made. Choose "educational" only when the video is genuinely trying to teach or explain something.
- "audioQuality": "clear" if the speech is easy to follow; "unclear" if it is drowned in noise or music, heavily distorted, or largely unintelligible; "none" if there is no speech at all.
- "teachable": true only if this video contains a specific idea a learner could practise.
- "title": a short title for what this teaches, in English.
- "summaryEn": two or three sentences telling a learner what they will be able to do after using the app. Address them directly. No jargon, no mention of specs or code.
- "identity": a JSON object, as a STRING, giving the app its own identity: "name" (a short product-like name for this lesson, e.g. "Chord Function Lab" or "Krebs Cycle Trainer"), "tagline" (six to ten words saying what the learner practises), "accent" (a hex colour drawn from the subject that works as a strong accent on a light page), and "ctaLabel" (what the button linking back to the video should say, e.g. "Watch the lesson").
- "sections": an array of FOUR to SIX section objects, named after THIS lesson's own subject rather than a template. Each has "key" (a short lowercase slug), "titleEn", "instrument" (one of: concept-model, interactive-simulation, labelled-diagram, worked-example, practice-quiz, flashcards, sorting-exercise, sequence-builder, comparison-table, recap-sheet), and "brief" (two or three sentences saying exactly what the section shows and what the learner does in it).

  The order must be a learning arc, not a summary: meet the idea, manipulate it, practise it, check it, keep it. AT LEAST ONE section must be "practice-quiz" and AT LEAST ONE must be a manipulable model. End with "recap-sheet". Good names look like "How Chords Pull", "Build the Progression", "Name That Cadence". Bad ones look like "Introduction", "Content", "Summary".
- "reason": one short sentence explaining your judgement.

Be strict. Saying no to an unsuitable video is far more useful than producing a confident learning app built on something you could not properly hear or understand.

THEN, only if "teachable" is true AND "contentKind" is "educational", write the spec. Otherwise set "spec" to an empty string and stop -- do not invent a lesson out of material that does not contain one.

When you do write it: produce a detailed, self-contained spec for an interactive learning app that teaches this video's central idea. The recipient of the spec has not seen the video, so the spec must carry every fact, definition, number and example it needs.

What separates a good one from a bad one:

1. It teaches ONE idea properly rather than surveying everything the video mentioned. Name that idea in the first line.
2. The learner DOES something. Reading is not practice. Every section must have an action: manipulate, choose, order, label, predict, answer.
3. Feedback is immediate and explains WHY, not just right or wrong. A wrong answer is the most valuable moment in the app and must be met with the reason, not a red cross.
4. It builds: recognise, then apply, then transfer. Do not ask the hardest question first.
5. It ends with something the learner keeps -- a compact recap of the facts, rules or steps worth remembering.

Write the spec in English regardless of the language spoken in the video. The spec is a build brief for a developer, not user-facing text.`;

/**
 * The lesson's substance, extracted on its own.
 *
 * The mirror of the paper's data layer. A learning app built from prose is a
 * summary with buttons; one built from real definitions, worked examples and
 * a question bank has something to actually test the learner against.
 */
export const LESSON_FROM_VIDEO_PROMPT = `Watch the attached video and extract everything a learning app would need to teach and test its content. Return ONLY a JSON object, with no prose, no markdown fence and no commentary.

Include:

- "topic": what the video teaches, in one sentence.
- "concepts": each key idea, with "name", "definition" in plain language, and "why" it matters.
- "terms": vocabulary the learner must know, each with the term and a short definition.
- "facts": every concrete number, rule, formula, date or threshold stated, with what it applies to. Use the video's exact values.
- "steps": if a process or method is demonstrated, its ordered stages with names and what happens at each.
- "examples": every worked example given, with the problem, the reasoning and the answer.
- "misconceptions": the mistakes a learner is likely to make here, each with the wrong belief and the correction. If the video calls one out, use it.
- "questions": a bank of TWELVE to TWENTY practice questions covering the material. Each has "q", "type" (one of "multiple-choice", "true-false", "order", "match", "short-answer"), "options" where the type needs them, "answer", "why" explaining the reasoning, and "level" (one of "recall", "apply", "transfer"). Spread them across all three levels; do not make them all recall.

Base everything on what the video actually says. Never invent a fact, a number or an example it did not give. If the video does not cover something, leave it out rather than filling the gap.

COMPLETE, BUT COMPACT: short keys, no indentation, no repeated prose. Keep the whole object under roughly 700 lines of dense JSON.`;

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
    identity: {type: 'string'},
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {type: 'string'},
          titleEn: {type: 'string'},
          instrument: {type: 'string'},
          brief: {type: 'string'},
        },
        required: ['key', 'titleEn', 'instrument', 'brief'],
      },
    },
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

Return ONLY a JSON object, with no markdown fence and no commentary, with exactly these fields: "language" (string), "contentKind" (one of "educational", "music", "entertainment", "promotional", "other"), "audioQuality" (one of "clear", "unclear", "none"), "teachable" (boolean), "title" (string), "summaryEn" (string), "identity" (string containing JSON), "sections" (array of objects with key, titleEn, titleUz, instrument, brief), "facts" (string containing JSON), "reason" (string), "spec" (string).`;

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

/**
 * The data layer, extracted on its own.
 *
 * This used to ride along with the plan in one call, which made that call the
 * slowest thing in the pipeline: a verdict, a plan, two summaries, an identity,
 * a section list and a thousand lines of tables all in one response. Asking
 * separately costs a second read of the paper and buys back half the wait,
 * because the two calls now run at the same time.
 */
export const FACTS_FROM_PAPER_PROMPT = `Read the attached publication (or the one at the URL below) and extract its complete data layer. Return ONLY a JSON object, with no prose, no markdown fence and no commentary.

Everything the explainer site shows will be computed from this object, so its completeness decides how good the result can be. Include:

- "meta": title, journal, volume and pages, year, every date given (received, accepted, published), DOI and its URL, institution, ethics approval, funding, and any accession or registration identifiers.
- "authors": every author, with name, role or contribution, institution, department and email where the paper prints them.
- "metrics": the headline numbers, each with a label, the value, its unit, and what it means.
- "tables": every table that matters, each with a name, its column headers, and ALL of its rows as arrays of strings. Do not summarise a table -- reproduce it.
- "records": if the paper reports per-subject, per-sample, per-locus or per-timepoint data, reproduce those rows in full with every field the paper prints. A cohort of sixteen patients is sixteen objects, not a count. This is what allows a figure to be explored rather than merely displayed.
- "statistics": every correlation, p-value, confidence interval, odds ratio and effect size, each with what was compared and the exact reported value.
- "steps": if the paper describes a procedure, method or pipeline, its ordered stages with names and descriptions.
- "findings" and "limitations": the paper's own claims and its own stated caveats, as arrays of sentences.

COMPLETE, BUT COMPACT. Reproduce every row and every field the paper prints -- a cohort of sixteen is sixteen rows, a table of thirty loci is thirty rows -- but write the JSON densely: short keys, arrays of values rather than objects of named fields where a table has fixed columns, no indentation, and NO explanatory prose inside records. Description belongs in "findings", not repeated on every row. A row is data for a figure to compute from, not a paragraph.

Keep the whole object under roughly 900 lines of dense JSON. If the paper has more data than fits, keep the tables and records the figures need and drop the least useful table, saying which in a "omitted" field. An object that never finishes being written is worth nothing.

Use the paper's exact values and units. Never round, never estimate, never invent a figure to fill a gap. If the paper does not report something, omit the field rather than guessing.`;
