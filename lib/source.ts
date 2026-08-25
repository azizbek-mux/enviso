/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Largest PDF we will inline into a request, before base64 expansion. */
export const MAX_PDF_BYTES = 12 * 1024 * 1024;

export type SourceKind = 'video' | 'paper';

/**
 * What a generation is built from.
 *
 * A paper arrives either as a file the user picked or as a link the model
 * retrieves itself; both end up here so one pipeline serves all three inputs.
 */
export type Source =
  | {kind: 'video'; url: string}
  | {kind: 'paper'; via: 'url'; url: string}
  | {kind: 'paper'; via: 'file'; name: string; mimeType: string; base64: string};

/**
 * The subset of sources that can be described by a link alone.
 *
 * An uploaded PDF lives on one device with no server to put it on, so only
 * these can be shared or restored from a URL.
 */
export type LinkSource =
  | {kind: 'video'; url: string}
  | {kind: 'paper'; via: 'url'; url: string};

/** Stable identity for a source, used to key the generating component. */
export function sourceLabel(source: Source): string {
  if (source.kind === 'video') return source.url;
  return source.via === 'url' ? source.url : source.name;
}

/**
 * Read a picked file as base64.
 *
 * The result is inlined into the request rather than uploaded, which avoids
 * the upload lifecycle entirely -- no waiting for a file to become active, no
 * expiry to reason about. The size cap keeps the request inside the inline
 * limit once base64 has added its third.
 */
export function readFileAsBase64(
  file: File,
): Promise<{name: string; mimeType: string; base64: string}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      if (comma === -1) {
        reject(new Error('Could not read that file'));
        return;
      }
      resolve({
        name: file.name,
        mimeType: file.type || 'application/pdf',
        base64: result.slice(comma + 1),
      });
    };

    reader.readAsDataURL(file);
  });
}

/** True for something that plausibly points at a publication. */
export function looksLikeUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Link hints                                                                 */
/* -------------------------------------------------------------------------- */

export type LinkHint = 'paywall' | 'abstractOnly' | 'blocked' | 'doi';

/**
 * Hosts whose pages usually yield less than the full text.
 *
 * These are hints, never refusals: plenty of papers on these publishers are
 * open access, and the app cannot know which until it has actually read one.
 * The point is to warn before a generation is spent, not to decide.
 */
const HINTS: {hint: LinkHint; hosts: string[]}[] = [
  {
    hint: 'blocked',
    hosts: ['researchgate.net', 'academia.edu', 'drive.google.com', 'dropbox.com'],
  },
  {
    hint: 'abstractOnly',
    hosts: ['pubmed.ncbi.nlm.nih.gov'],
  },
  {
    hint: 'paywall',
    hosts: [
      'sciencedirect.com',
      'elsevier.com',
      'link.springer.com',
      'springer.com',
      'onlinelibrary.wiley.com',
      'wiley.com',
      'tandfonline.com',
      'jstor.org',
      'nejm.org',
      'thelancet.com',
      'jamanetwork.com',
      'cell.com',
      'ieeexplore.ieee.org',
      'dl.acm.org',
      'academic.oup.com',
      'karger.com',
      'thieme-connect.com',
      'sagepub.com',
    ],
  },
  {
    hint: 'doi',
    hosts: ['doi.org', 'dx.doi.org'],
  },
];

/** What to warn about for a pasted link, or null when it looks fine. */
export function linkHintFor(value: string): LinkHint | null {
  const trimmed = value.trim();
  if (!looksLikeUrl(trimmed)) return null;

  let host: string;
  try {
    host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }

  // A direct PDF is the thing itself, whoever is hosting it.
  if (new URL(trimmed).pathname.toLowerCase().endsWith('.pdf')) return null;

  for (const {hint, hosts} of HINTS) {
    if (hosts.some((known) => host === known || host.endsWith(`.${known}`))) {
      return hint;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* DOI expansion                                                              */
/* -------------------------------------------------------------------------- */

/** PLOS DOI suffixes map to their own journal sites. */
const PLOS_JOURNALS: Record<string, string> = {
  pone: 'plosone',
  pbio: 'plosbiology',
  pmed: 'plosmedicine',
  pgen: 'plosgenetics',
  pcbi: 'ploscompbiol',
  ppat: 'plospathogens',
  pntd: 'plosntds',
};

/**
 * Turn a link into every address worth trying for the full text.
 *
 * A doi.org URL is a redirect, and the retrieval tool appears to read the
 * redirect stub rather than following it -- which is why an open-access PLOS
 * paper came back reported as paywalled. Handing over the publisher's own
 * article URL as well removes the redirect from the path entirely.
 *
 * The original is always kept and always first; these are additions, not
 * replacements, since a guess that misses costs nothing.
 */
export function expandPaperUrl(url: string): string[] {
  const candidates = [url.trim()];

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return candidates;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'doi.org' && host !== 'dx.doi.org') return candidates;

  const doi = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

  // PLOS: 10.1371/journal.pone.0298940 -> journals.plos.org/plosone/article?id=
  const plos = doi.match(/^10\.1371\/journal\.([a-z]+)\./i);
  if (plos) {
    const journal = PLOS_JOURNALS[plos[1].toLowerCase()];
    if (journal) {
      candidates.push(
        `https://journals.plos.org/${journal}/article?id=${doi}`,
        `https://journals.plos.org/${journal}/article/file?id=${doi}&type=printable`,
      );
    }
  }

  // arXiv: 10.48550/arXiv.2404.01234 -> arxiv.org/abs/2404.01234
  const arxiv = doi.match(/^10\.48550\/arxiv\.(.+)$/i);
  if (arxiv) {
    candidates.push(`https://arxiv.org/abs/${arxiv[1]}`);
  }

  // bioRxiv and medRxiv publish full text under the DOI path.
  if (/^10\.1101\//.test(doi)) {
    candidates.push(`https://www.biorxiv.org/content/${doi}v1.full`);
    candidates.push(`https://www.medrxiv.org/content/${doi}v1.full`);
  }

  return [...new Set(candidates)];
}
