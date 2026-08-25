/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Lang} from '@/lib/i18n';
import {
  CODE_REGION_CLOSER,
  CODE_REGION_OPENER,
  type Palette,
} from '@/lib/prompts';

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
    key: 'problem',
    brief:
      'The problem the paper attacks, and why it was hard. Plain language, no jargon before it is explained. Set the stakes.',
  },
  {
    key: 'mechanism',
    brief:
      'The method or contribution at the heart of the paper, staged at length. This is the centre of the site and must carry its main interactive visual -- a 3D scene the reader can orbit if the subject is genuinely spatial, otherwise an animated or manipulable 2D diagram.',
  },
  {
    key: 'results',
    brief:
      "The findings, driven by the paper's real numbers. Include at least one data visual built from the FACTS data -- a chart, a matrix or a timeline -- and say plainly what the figures mean.",
  },
  {
    key: 'limits',
    brief:
      'The limitations and open questions the paper itself acknowledges, stated honestly and without hedging.',
  },
  {
    key: 'credits',
    brief:
      'The authors with their affiliations, the funding and approvals if the paper gives them, and the citation with a link to the publication.',
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
- The page must never scroll sideways. Interactive targets at least 44x44px. Never rely on hover.`;

function paletteBlock(palette: Palette): string {
  return `VISUAL THEME
- Colour scheme: ${palette.scheme}
- Page background: ${palette.background}
- Primary text: ${palette.text}
- Secondary text: ${palette.hint}
- Accent: ${palette.accent}
- Text on accent: ${palette.accentText}`;
}

/**
 * First call: the document everything else slots into.
 *
 * It owns the head, all shared CSS, the language machinery and the navigation,
 * so later sections only have to agree with it rather than reinvent it.
 */
export function buildShellPrompt(
  spec: string,
  facts: string,
  palette: Palette,
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

4. A slim sticky header with the paper's short title, in-page links to the sections, and a compact language toggle showing O'Z and EN.
5. A HERO: the paper's full title, its authors, the journal and date, and one sentence stating what was achieved.
6. A <main> containing these markers, each alone on its own line, in this order and spelled exactly. Put NOTHING between them -- they are placeholders that get replaced:

${markers}

7. A footer.
8. One <script>, at the end of the body, defining the language machinery and nothing else:

${languageScript}

  The toggle buttons carry data-lang-btn="uz" and data-lang-btn="en". Sections are inserted before this script runs, so it translates them too.

${BILINGUAL_CONTRACT}

${SANDBOX_CONTRACT}

${paletteBlock(palette)}

TYPOGRAPHY: serif headings against a clean sans body, generous line height, real space between sections. It should read like a well-made exhibit: unhurried and confident. Use only fonts already on the device -- Georgia or Times New Roman for serif, the system UI stack for sans.

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
