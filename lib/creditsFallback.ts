/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface Author {
  name?: string;
  role?: string;
  institution?: string;
  department?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the credits section directly from the extracted facts.
 *
 * Attribution is pure data: names, institutions, a DOI. When the model fails
 * to write that section there is no reason to lose it, and a research page
 * without its authors or citation is the one omission that is not survivable.
 */
export function creditsFromFacts(facts: string): string {
  let parsed: {
    meta?: Record<string, unknown>;
    authors?: Author[];
  };

  try {
    parsed = JSON.parse(facts.slice(facts.indexOf('{')));
  } catch {
    return '';
  }

  const meta = parsed.meta ?? {};
  const authors = Array.isArray(parsed.authors) ? parsed.authors : [];

  const authorCards = authors
    .map(
      (author) => `
        <li class="author-card">
          <strong>${escapeHtml(author.name)}</strong>
          <span>${escapeHtml(
            [author.role, author.department, author.institution]
              .filter(Boolean)
              .join(' &middot; '),
          )}</span>
        </li>`,
    )
    .join('');

  const rows = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const doi = String(meta.doiUrl ?? meta.doi ?? '');
  const link = doi
    ? `<p><a href="${escapeHtml(
        doi.startsWith('http') ? doi : `https://doi.org/${doi}`,
      )}" target="_blank" rel="noopener" data-uz="Maqolani ochish" data-en="Open the publication">Maqolani ochish</a></p>`
    : '';

  return `<section id="credits">
  <p class="eyebrow" data-uz="MUALLIFLAR" data-en="CREDITS">MUALLIFLAR</p>
  <h2 data-uz="Mualliflar va manba" data-en="Authors and citation">Mualliflar va manba</h2>
  <div class="rule"></div>
  ${authorCards ? `<ul class="author-list">${authorCards}</ul>` : ''}
  ${rows ? `<table class="meta-table"><tbody>${rows}</tbody></table>` : ''}
  ${link}
</section>`;
}
