/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The house style for research explainers.
 *
 * Derived by diffing three AI Studio explainers built from unrelated papers
 * -- quantum error correction, SARS-CoV-2 genomics, paediatric cardiac
 * surgery. Their scaffolds were byte-identical and the only difference in the
 * document head was the title, which means the quality of those pages comes
 * from a fixed design system rather than per-paper invention.
 *
 * So this is a template, not a description. Every paper gets the same
 * typography, palette and idioms; only the content changes.
 */

export const HOUSE_PALETTE = `PALETTE -- use these exact values.
- Page background: #F9F8F4 (warm cream)
- Panel and card background: #FFFFFF
- Primary text: #1a1a1a (near-black ink)
- Secondary text: #57534e; muted labels: #78716c
- Hairlines and borders: #e7e5e4
- Accent: #C5A059 (muted gold) -- for rules under headings, eyebrow marks,
  key figures and small emphases. Never for large fills.
- Inverted panel: #1a1a1a background with #F9F8F4 text, used ONCE for the
  most technical passage so the eye has one dark rest in a long scroll.

This is a light, printed-page identity and it does not follow the reader's
system theme. A research explainer should look like itself.`;

export const HOUSE_TYPOGRAPHY = `STYLING SYSTEM -- Tailwind, exactly as the reference build uses it.
Declare these in the head and style everything with Tailwind utility classes.
Hand-written CSS drifts between sections; a shared utility vocabulary does not.

  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            serif: ['"Playfair Display"', 'serif'],
            sans: ['"Inter"', 'sans-serif'],
          },
          colors: {
            nobel: { gold: '#C5A059', dark: '#1a1a1a', cream: '#F9F8F4' }
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    html { scroll-behavior: smooth; scroll-padding-top: 100px; }
    body { background-color: #F9F8F4; color: #1a1a1a;
           font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif; }
    /* Fallback: if the Tailwind CDN is blocked or slow, the page must still be
       readable rather than a wall of unstyled text. These carry the bones. */
    .font-serif { font-family: 'Playfair Display', Georgia, serif; }
    main > section { padding: 4rem 1.5rem; border-top: 1px solid #e7e5e4; }
    main > section > div { max-width: 80rem; margin: 0 auto; }
    img, svg, canvas { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e7e5e4; padding: .5rem; text-align: left; }
  </style>

THE CLASS VOCABULARY -- use these, not invented equivalents:
- Greys: text-stone-900 for headings, text-stone-600 and text-stone-500 for
  body and labels, border-stone-200 for hairlines, bg-stone-100 for chips.
- Cards: bg-white rounded-2xl border border-stone-200 shadow-sm p-5 lg:p-8.
- Sections: py-20 or py-24, border-t border-stone-200, inner container
  max-w-7xl mx-auto px-6.
- Eyebrow: text-xs font-bold uppercase tracking-widest text-stone-500.
- Headings: font-serif, text-3xl md:text-5xl, text-stone-900, leading-tight.
- The hero title: font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.95].
- Figures and statistics: font-mono, with text-[11px] or text-xs for detail.
- Accent: the identity's accent colour, or nobel-gold when none is given.
- Grids: grid grid-cols-1 md:grid-cols-3 gap-5 for cards;
  grid-cols-1 lg:grid-cols-12 gap-8 for a figure beside its detail panel.

`;

export const HOUSE_IDIOMS = `LAYOUT IDIOMS -- these recur throughout, and consistency is what makes it
feel designed rather than assembled.
- Sections breathe: about 6rem of vertical padding, separated by a single
  hairline border. Never stack cards to fill space.
- EYEBROW: above every section heading, a small label in 0.7rem, weight 700,
  uppercase, letter-spacing 0.15em, colour #78716c -- e.g. "METHOD", "FINDINGS",
  "FIGURE 3". It tells the reader where they are at a glance.
- GOLD RULE: a 3px by 3.5rem gold bar directly under each section heading.
- FIGURE CARD: every visual lives in a white card, 16px radius, 1px #e7e5e4
  border, a soft shadow, 1.5-2rem padding, with its own eyebrow, a serif
  sub-heading, the visual, and a caption beneath explaining what to notice.
- DROP CAP: the first paragraph of the opening section begins with a large
  gold serif initial.
- PULL QUOTE: one serif italic line, larger than body text, for the paper's
  single most important claim.
- METRIC TILES: headline numbers as a row of tiles -- the figure large in the
  serif face, a small uppercase label under it.
- AUTHOR CARDS: white card, name centred in the serif face, a short gold
  divider, then role and institution in small uppercase tracking-widest text.
- A slim sticky header, translucent with a blur, carrying the short title and
  in-page section links.`;

/** Rules for building visuals from extracted data rather than from memory. */
export const HOUSE_DATA_RULE = `BUILD EVERY VISUAL FROM THE DATA, NOT FROM MEMORY.
- The FACTS block is the single source of truth. Read values from it and
  compute from them; never retype a number into markup you did not take from
  it, and never invent one to fill a gap.
- Where the facts contain rows -- a cohort, a table, a time series -- render
  the actual rows. A table of sixteen patients is sixteen rows, not "n = 16".
- Where the facts contain a statistic, make it operable: a reported
  correlation becomes a plot with the regression drawn and a control the
  reader can move; a comparison between two groups becomes a chart where both
  are visible at once with the p-value shown.
- If a figure needs a number the facts do not contain, leave the figure out
  and say what is missing. An honest gap beats a fabricated value.`;

/** The interactive quality bar, as observed in the reference explainers. */
export const HOUSE_INTERACTION_RULE = `INTERACTION
- Every figure card that can be manipulated should be. Selecting a row to
  highlight it, dragging a slider to see a predicted outcome change, stepping
  through a procedure, toggling between two techniques -- these are what make
  an explainer worth more than the paper's own figures.
- Interactive state belongs in plain JavaScript inside the section, in an
  IIFE. Recompute from the data on every change rather than hardcoding the
  result of each state.
- One 3D scene, and only when the subject is genuinely spatial: an anatomy, a
  molecular or crystal structure, a device, a physical system. It must be
  orbitable, lit properly, and labelled. When the subject is statistical or
  algorithmic, a precise 2D figure is the better answer and a rotating object
  would be decoration.`;

/**
 * The instrument catalogue.
 *
 * The reference explainers do not write sections about a paper; they build
 * named instruments from it -- a Manhattan plot with category filters, a
 * polygenic score simulator, a chromosome ideogram, a randomisation matrix.
 * Naming the instrument in the brief is what turns "a section about the
 * results" into something the reader operates.
 */
export const INSTRUMENT_CATALOGUE = `INSTRUMENTS -- build the one named in the brief, from the facts.
- manhattan-plot: significance against position or category, with a threshold
  line drawn and labelled, points selectable to reveal their detail, and
  category filter chips above it.
- forest-plot: effect sizes with confidence intervals against a null line,
  each row labelled, significant rows visually distinguished.
- scatter-regression: two variables plotted with the reported line drawn, the
  coefficient shown, and a control that moves a predicted value along it.
- ideogram: positions marked along a linear or banded structure, hoverable and
  selectable, with a detail panel.
- simulator: sliders or inputs feeding the paper's own model, showing an
  outcome recomputed live, with the assumptions stated.
- filterable-table: the real rows, with search, sortable columns and filter
  chips. Never truncate to a sample.
- comparison-matrix: two or more groups against several measures at once, with
  significance marked per cell.
- timeline: ordered periods with their measures, selectable to expand.
- stepped-procedure: numbered stages the reader advances through, one shown at
  a time with its detail.
- network-diagram: entities and their relationships, selectable.
- 3d-scene: an orbitable three.js scene, lit and labelled. Only for genuinely
  spatial subjects.
- annotated-figure: a diagram with numbered callouts the reader steps through.

Every instrument needs: an eyebrow naming it and its figure number, a serif
title, the instrument itself, a caption saying what to notice, and a source
line citing which table or figure of the paper it came from.`;

export const HOUSE_DETAIL = `DETAIL THAT SEPARATES A PRODUCT FROM A DOCUMENT
- IDENTITY: the header carries a small mark, the site's own short name in the
  serif face, a one-line descriptor beneath it, and a solid accent-filled
  button linking to the publication. Not a bare title.
- SCIENTIFIC TYPOGRAPHY: render statistics properly. Exponents as real
  superscripts (P = 9.15 x 10<sup>-7</sup>), effect sizes with their interval
  in brackets, and all figures in a monospace face so columns align. A p-value
  written as plain text reads like prose; set properly it reads like evidence.
- SEMANTIC COLOUR: tint cards by meaning -- a significant result, a null
  result, a caution -- using pale washes of a hue with a matching border.
  Never colour for decoration alone.
- ICONS: small inline SVG glyphs, drawn with strokes and currentColor, beside
  eyebrows and in callouts. No icon fonts and no remote sprites.
- CALLOUTS: a bordered, tinted box for a threshold, a caveat or a definition,
  with an icon and a bold lead-in.
- DENSITY: prose stays in a 65-72 character column, but figures, tables and
  card grids use the full width, three or four across on a wide screen. A
  desktop reader should never see a narrow ribbon of content in a sea of
  margin.
- A dark panel for funding, approvals and identifiers near the end, and a dark
  footer carrying the full citation and licence.`;

/**
 * The learning instrument catalogue.
 *
 * The research path names what each section builds, and that is what turned
 * "a section about the results" into something a reader operates. A lesson
 * needs the same, with pedagogy in place of exposition: the point is not to
 * show the idea but to make the learner use it.
 */
export const LEARNING_INSTRUMENTS = `INSTRUMENTS -- build the one named in the brief, from the lesson data.
- concept-model: the idea shown as a diagram the learner changes -- a control
  that alters one variable while the consequence updates in front of them,
  with the rule stated beneath.
- interactive-simulation: the process running, steppable and resettable, with
  the state visible at each moment rather than only the outcome.
- labelled-diagram: parts the learner must name or drag into place, checked
  with an explanation for each miss.
- worked-example: the example from the video revealed one reasoning step at a
  time, the learner predicting the next step before it opens.
- practice-quiz: questions from the bank, one at a time, immediate feedback
  that gives the REASON rather than a mark, a visible score, and a retry of
  the ones missed. Never a wall of questions with a score at the end.
- flashcards: term on one side, definition on the other, flipped and shuffled,
  with the learner marking what they knew.
- sorting-exercise: items dragged or tapped into the right category, wrong
  placements explained.
- sequence-builder: steps put into the right order, checked with why the order
  matters.
- comparison-table: two or more things against several measures, with the
  distinguishing row highlighted on selection.
- recap-sheet: the compact thing the learner keeps -- the definitions, rules,
  numbers and common mistakes, laid out to be read in a minute.

Every instrument needs: an eyebrow naming it, a serif title, the instrument
itself, and one line saying what the learner should take from it.

FEEDBACK IS THE PRODUCT. A wrong answer is the most valuable moment in the
app, so meet it with the reason from the lesson data, never a bare cross.
Track what the learner got right and show it, so they can see themselves
improving rather than guessing.`;

/** Everything above, in the order a builder needs it. */
export const HOUSE_STYLE = [
  HOUSE_PALETTE,
  HOUSE_TYPOGRAPHY,
  HOUSE_IDIOMS,
  HOUSE_DETAIL,
  HOUSE_DATA_RULE,
  HOUSE_INTERACTION_RULE,
  INSTRUMENT_CATALOGUE,
].join(String.fromCharCode(10, 10));

/** The same system, with learning instruments in place of explainer ones. */
export const LESSON_STYLE = [
  HOUSE_PALETTE,
  HOUSE_TYPOGRAPHY,
  HOUSE_IDIOMS,
  HOUSE_DETAIL,
  HOUSE_DATA_RULE,
  LEARNING_INSTRUMENTS,
].join(String.fromCharCode(10, 10));
