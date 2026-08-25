/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {HOUSE_STYLE} from '@/lib/houseStyle';
import {REFERENCE_SECTION} from '@/lib/referenceExample';
import type {Lang} from '@/lib/i18n';
import {CODE_REGION_CLOSER, CODE_REGION_OPENER} from '@/lib/prompts';

/**
 * Why an explainer is written in pieces.
 *
 * A single generation has one output budget, so the hero, the 3D scene, every
 * chart and all the prose compete for it -- which caps richness however good
 * the brief is. Writing a shell and then each section separately gives every
 * part a full budget of its own, and lets one weak section be retried without
 * discarding the rest.
 */
export const EXPLAINER_SECTIONS = [
  {
    key: 'overview',
    brief:
      'An at-a-glance opening: a row of metric tiles carrying the headline numbers from the facts, and a short standfirst saying what was done and what was found. This is the first thing the reader meets after the hero, so it must be concrete and specific, never a restatement of the title.',
  },
  {
    key: 'problem',
    brief:
      'The problem the paper attacks and why it was hard. Plain language, no jargon before it is explained, and open it with the drop cap. End by stating what a solution would have to achieve.',
  },
  {
    key: 'mechanism',
    brief:
      'The method or contribution at the heart of the paper, staged at length and set as the inverted dark panel. This carries the main interactive figure: an orbitable 3D scene if the subject is genuinely spatial, otherwise a manipulable 2D diagram or a stepped walkthrough of the procedure from the facts.',
  },
  {
    key: 'results',
    brief:
      "The findings, built from the tables and records in the facts. Reproduce the real tables in full, and turn the reported statistics into figures the reader can operate -- a correlation becomes a plot with its regression and a control to move, a comparison of two groups shows both with the p-value. Caption each figure with what to notice.",
  },
  {
    key: 'limits',
    brief:
      "The limitations and open questions the paper itself acknowledges, taken from the facts, stated plainly and without softening. Include the pull quote here if the paper's central caveat deserves it.",
  },
  {
    key: 'credits',
    brief:
      'Author cards for every author in the facts, with role, institution and department. Then the funding, the ethics approval and any accession identifiers, and the full citation with a link to the publication. This section is pure data from the facts, so it must be complete.',
  },
] as const;

export interface PlannedSection {
  key: string;
  titleEn?: string;
  titleUz?: string;
  instrument?: string;
  brief: string;
}

/**
 * Use the sections the paper suggested, falling back to the generic plan.
 *
 * Generic names are the tell that a page came from a template: a reference
 * explainer's navigation reads "Chromosomes & Loci" and "PGS Simulator",
 * naming the science, where a template reads "Overview" and "Results". Credits
 * is always appended, since attribution is not the model's to drop.
 */
export function planSections(
  proposed?: PlannedSection[] | null,
): PlannedSection[] {
  const usable = (proposed ?? []).filter(
    (section) => section?.key && section?.brief,
  );
  if (usable.length < 3) return [...EXPLAINER_SECTIONS];

  const sections = usable.slice(0, 6);
  return sections.some((section) => section.key === 'credits')
    ? sections
    : [...sections, EXPLAINER_SECTIONS[EXPLAINER_SECTIONS.length - 1]];
}

/** Placeholder the shell leaves behind for each section to be stitched into. */
export function sectionMarker(key: string): string {
  return `<!--SECTION:${key}-->`;
}

const NEWLINE = String.fromCharCode(10);

/**
 * The contract that lets independently written parts share one toggle.
 *
 * Each element carries both languages itself, so no section has to know what
 * any other section named its strings.
 */
const BILINGUAL_CONTRACT = `BILINGUAL TEXT -- follow this exactly, it is what lets the parts fit together.
Every element whose text the reader sees carries BOTH languages as attributes:

  <h2 data-uz="Muammo" data-en="The problem">Muammo</h2>

- Put data-uz and data-en only on an element whose entire content is that one piece of text. Never on an element containing other elements, because switching language replaces its text and would delete them.
- Uzbek must be natural, modern, Latin-script Uzbek using the characters o' and g' written as U+02BB, never a plain apostrophe and never Cyrillic. For a technical term with no settled Uzbek word, give the Uzbek then the English in parentheses on first use.
- Text that is not an element's own content still has to switch. For a <select>, put data-uz and data-en on each <option>. For an attribute, use data-placeholder-uz / data-placeholder-en, and the same pattern for title and aria-label. For a label a script writes at runtime, read window.__lang and write the matching string rather than a fixed one.
- Do not define your own language dictionary or toggle. The shell provides both.`;

const SANDBOX_CONTRACT = `RUNTIME -- a sandboxed iframe on a phone.
- Do NOT use localStorage, sessionStorage, cookies or IndexedDB. Access throws and breaks the page.
- Do NOT fetch anything. The only remote assets are the ones the shell already declares: Tailwind, Google Fonts, and three.js through its importmap. Add no others.
- The page must never scroll sideways. Interactive targets at least 44x44px. Never rely on hover.
- Never navigate. No <a href> to another page, no location changes, no target="_blank" except a real external citation link. In-page links are handled for you by the shell.`;

/**
 * First call: the document everything else slots into.
 *
 * It owns the head, all shared CSS, the language machinery and the navigation,
 * so later sections only have to agree with it rather than reinvent it.
 */
export function buildShellPrompt(
  spec: string,
  facts: string,
  uiLang: Lang,
  sections: PlannedSection[],
  identity: string,
): string {
  const markers = sections
    .map((section) => `    ${sectionMarker(section.key)}`)
    .join(NEWLINE);

  const navPlan = sections
    .map(
      (section) =>
        `    - #${section.key} -- "${section.titleUz ?? section.key}" / "${section.titleEn ?? section.key}"`,
    )
    .join(NEWLINE);

  const languageScript = [
    '  <script>',
    '  function applyLanguage(lang){',
    '    document.documentElement.lang = lang;',
    "    document.querySelectorAll('[data-uz][data-en]').forEach(function(el){",
    "      var next = el.getAttribute('data-' + lang);",
    '      if (next !== null) el.textContent = next;',
    '    });',
    "    document.querySelectorAll('[data-lang-btn]').forEach(function(b){",
    "      b.classList.toggle('active', b.getAttribute('data-lang-btn') === lang);",
    '    });',
    '  }',
    "  document.addEventListener('click', function(e){",
    "    var btn = e.target.closest('[data-lang-btn]');",
    "    if (btn) applyLanguage(btn.getAttribute('data-lang-btn'));",
    '  });',
    '',
    '  // In-page links must never navigate: this document is rendered through',
    '  // srcdoc, where a fragment navigation discards the page and leaves a',
    '  // blank frame. Scroll programmatically instead.',
    "  document.addEventListener('click', function(e){",
    "    var link = e.target.closest && e.target.closest('a[href^=\"#\"]');",
    '    if (!link) return;',
    '    e.preventDefault();',
    "    var href = link.getAttribute('href');",
    "    if (href === '#'){ window.scrollTo({top:0, behavior:'smooth'}); return; }",
    '    var target = document.getElementById(href.slice(1));',
    '    if (!target) return;',
    "    var header = document.querySelector('header');",
    '    var offset = header ? header.getBoundingClientRect().height + 16 : 24;',
    '    var top = target.getBoundingClientRect().top + window.pageYOffset - offset;',
    "    window.scrollTo({top: top, behavior: 'smooth'});",
    '  });',
    '',
    `  applyLanguage('${uiLang}');`,
    '  </script>',
  ].join(NEWLINE);

  return `You are building a long-form explainer WEBSITE about a research publication. This first step produces the SHELL: the complete document every later section is inserted into.

THE PLAN FOR THE WHOLE SITE:

${spec}

THE PAPER'S FACTS, as extracted data. Use these exact values and never invent one:

${facts}

THE SITE'S IDENTITY -- its own name, tagline, accent colour and call to action. Use the accent colour in place of the default gold wherever the house style calls for an accent:

${identity}

PRODUCE a complete, valid HTML document with exactly this skeleton, which is the reference build's own:

1. <!DOCTYPE html>, head with charset and viewport, a <title>, and the Tailwind, fonts and base styles given in the styling system below.
2. If any section's instrument is a 3d-scene, add this importmap to the head. Otherwise leave it out:

  <script type="importmap">
  {"imports":{"three":"https://unpkg.com/three@0.181.1/build/three.module.js","three/addons/":"https://unpkg.com/three@0.181.1/examples/jsm/"}}
  </script>

3. A FIXED HEADER, full width, that becomes translucent with a blur and shrinks once the page scrolls past 50px:
   - Left: a small square accent-filled tile holding a simple inline-SVG mark, then the site's own name from the identity in font-serif font-bold, with the source and study named beneath it in text-xs font-mono text-stone-500.
   - Centre: a rounded-2xl bg-white border border-stone-200 bar holding the section links, each two lines at most, using exactly these labels and carrying both languages:

${navPlan}

   - Right: a solid accent-filled rounded-full button linking to the publication, labelled from the identity, with a small external-link SVG. Beside it a compact O'Z / EN toggle whose buttons carry data-lang-btn="uz" and data-lang-btn="en".
   - Below the bar on mobile, collapse the links behind a menu button.
4. A HERO, py-20 or taller, containing in order: a small rounded-full outlined pill carrying the identity's tagline in the accent colour; the paper's full title as an h1 in font-serif at text-5xl md:text-7xl lg:text-8xl with leading-[0.95]; a standfirst paragraph of one or two sentences in text-lg text-stone-600 max-w-3xl saying concretely what was done and found; then a grid of three or four METRIC TILES, each a white rounded-2xl bordered card with an uppercase text-[10px] tracking-widest label, the figure large in font-serif, and a one-line caption beneath.
5. A <main> containing these markers, each alone on its own line, in this order and spelled exactly. Put NOTHING between them:

${markers}

6. A dark bg-nobel-dark footer carrying the site name in font-serif, the full citation, the licence, and the DOI link.
7. One <script> at the end of the body containing the language machinery, the scroll handler and the header shrink, and nothing else:

${languageScript}

${HOUSE_STYLE}

Return ONLY the HTML document, between ${CODE_REGION_OPENER} and ${CODE_REGION_CLOSER}.`;
}

/**
 * Later calls: one section at a time, written against the finished shell.
 *
 * The shell is passed in full rather than summarised, because a section that
 * invents its own class names produces a page that looks assembled from parts.
 */
export function buildSectionPrompt(
  section: PlannedSection,
  spec: string,
  facts: string,
  shell: string,
): string {
  return `You are writing ONE section of a long-form explainer website about a research publication. The rest of the site already exists.

THE SECTION TO WRITE -- "${section.titleEn ?? section.key}" (id="${section.key}"):
${section.brief}

THE INSTRUMENT it must carry: ${section.instrument ?? 'annotated-figure'}. Build that, from the facts, and make it operable.

THE PLAN FOR THE WHOLE SITE, for context. Write only your own part of it:

${spec}

THE PAPER'S FACTS, as extracted data. Build every figure, table and chart from these exact values. If a number is not here, do not state it:

${facts}

THE SHELL this is inserted into. Reuse its CSS classes and match its voice. Do not restate its styles and do not redefine anything it already provides:

${shell}

RULES
- Return exactly one <section> element with id="${section.key}", and nothing outside it.
- Any JavaScript goes in a <script> INSIDE that section, wrapped in an IIFE so it cannot collide with another section. For three.js use a <script type="module"> inside your section, relying on the importmap the shell declares.
- Use the shell's existing classes. Add a <style> inside your section only for rules genuinely specific to it.
- Make it substantial. This is the only section covering this ground, so give it the depth the plan asks for rather than a summary.

${HOUSE_STYLE}

A WORKED EXAMPLE. This is a real section from the reference build, in the exact idiom you must use: Tailwind classes, inline SVG drawn from a data array by arithmetic, plain JavaScript in an IIFE, statistics set in mono with real superscripts, cards tinted by meaning, chips that drive the figure, and a detail panel that updates on selection. Match this level of construction. Do not copy its subject matter -- copy how it is built.

${REFERENCE_SECTION}

${BILINGUAL_CONTRACT}

${SANDBOX_CONTRACT}

Return ONLY the section, between ${CODE_REGION_OPENER} and ${CODE_REGION_CLOSER}.`;
}

/** Drop a finished section into the shell, replacing its placeholder. */
export function stitchSection(
  document: string,
  key: string,
  html: string,
): string {
  const marker = sectionMarker(key);
  return document.includes(marker)
    ? document.replace(marker, html)
    : // The shell omitted the marker; appending beats losing the section.
      document.replace('</main>', `${html}${NEWLINE}</main>`);
}

/** Clear any placeholder a section failed to fill, so none reaches the reader. */
export function clearMarkers(document: string): string {
  return EXPLAINER_SECTIONS.reduce(
    (out, section) => out.split(sectionMarker(section.key)).join(''),
    document,
  );
}
