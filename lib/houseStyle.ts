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

export const HOUSE_TYPOGRAPHY = `TYPOGRAPHY
- Headings: 'Playfair Display', Georgia, serif.
- Body and UI: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif.
- Load exactly these two faces, nothing else:

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

- h1 in the hero: clamp(2.5rem, 7vw, 5.5rem), weight 400-500, line-height 0.95
  to 1.05. It should feel like a title page.
- h2 opening a section: clamp(1.9rem, 4.5vw, 3rem), weight 400-600.
- Body: 1.05-1.15rem, line-height 1.7, colour #57534e, measure 65-72
  characters. Never let prose run the full width of a wide screen.
- Numbers presented as findings are set in the serif face at large size, so a
  figure reads as a statement rather than as data exhaust.`;

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

/** Everything above, in the order a builder needs it. */
export const HOUSE_STYLE = [
  HOUSE_PALETTE,
  HOUSE_TYPOGRAPHY,
  HOUSE_IDIOMS,
  HOUSE_DATA_RULE,
  HOUSE_INTERACTION_RULE,
].join('\n\n');
