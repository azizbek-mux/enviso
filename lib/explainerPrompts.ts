/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {HOUSE_STYLE} from '@/lib/houseStyle';
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

export type SectionKey = (typeof EXPLAINER_SECTIONS)[number]['key'];

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
- Do not define your own language dictionary or toggle. The shell provides both.`;

const SANDBOX_CONTRACT = `RUNTIME -- a sandboxed iframe on a phone.
- Do NOT use localStorage, sessionStorage, cookies or IndexedDB. Access throws and breaks the page.
- Do NOT fetch anything, and load no remote asset except three.js through the importmap the shell declares.
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
): string {
  const markers = EXPLAINER_SECTIONS.map(
    (section) => `    ${sectionMarker(section.key)}`,
  ).join(NEWLINE);

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

PRODUCE a complete, valid HTML document containing:

1. <!DOCTYPE html>, a head with charset and viewport, and a <title>.
2. ALL the CSS for the entire site, in one inline <style>. Later sections will use your classes, so define a full system now: layout containers, a reading measure of roughly 65-75 characters, section spacing, headings, body text, figures and captions, tables, chart and canvas containers, cards, and the sticky header. Name classes clearly and predictably.
3. If the plan calls for a 3D scene anywhere, declare this importmap in the head so a section can import three.js. Include it ONLY if 3D is genuinely needed:

  <script type="importmap">
  {"imports":{"three":"https://unpkg.com/three@0.181.1/build/three.module.js","three/addons/":"https://unpkg.com/three@0.181.1/examples/jsm/"}}
  </script>

4. A slim sticky header with the paper's short title, in-page links to every section, and a compact language toggle showing O'Z and EN. The links point at the section ids below. Do NOT attach your own click handlers to them -- the script in point 8 already scrolls them, and a plain fragment navigation would blank the page in this runtime. Give the CSS "scroll-behavior: smooth" and a "scroll-padding-top" clear of the header.
5. A HERO: the paper's full title, its authors, the journal and date, and one sentence stating what was achieved.
6. A <main> containing these markers, each alone on its own line, in this order and spelled exactly. Put NOTHING between them -- they are placeholders that get replaced:

${markers}

7. A footer.
8. One <script>, at the end of the body, defining the language machinery and nothing else:

${languageScript}

  The toggle buttons carry data-lang-btn="uz" and data-lang-btn="en". Sections are inserted before this script runs, so it translates them too.

${BILINGUAL_CONTRACT}

${SANDBOX_CONTRACT}

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
  section: {key: string; brief: string},
  spec: string,
  facts: string,
  shell: string,
): string {
  return `You are writing ONE section of a long-form explainer website about a research publication. The rest of the site already exists.

THE SECTION TO WRITE -- "${section.key}":
${section.brief}

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
