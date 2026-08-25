/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resolve a paper reference to somewhere its full text actually lives.
 *
 * A PubMed link only ever shows an abstract, and a DOI is a redirect, so both
 * were being refused as unreadable even when the paper was free. Europe PMC
 * indexes both and says where the full text is -- and unlike NCBI's own ID
 * converter, its API is reachable from a browser, which matters because this
 * app has no server to proxy through.
 */

const EPMC_SEARCH = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

export interface PaperRecord {
  title?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  journal?: string;
  openAccess: boolean;
  /** Addresses to try, best first. */
  candidates: string[];
}

/** Pull a PubMed id out of a URL, if it is one. */
function pmidFrom(url: string): string | null {
  const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{5,9})/i);
  return match ? match[1] : null;
}

/** Pull a DOI out of a URL, whether from doi.org or a publisher path. */
function doiFrom(url: string): string | null {
  const match = url.match(/(10\.\d{4,9}\/[^\s"'<>&?#]+)/);
  return match ? match[1].replace(/[.,;]$/, '') : null;
}

function pmcidFrom(url: string): string | null {
  const match = url.match(/(PMC\d{5,9})/i);
  return match ? match[1].toUpperCase() : null;
}

/** Build the query Europe PMC understands for whichever identifier we have. */
function queryFor(url: string): string | null {
  const pmid = pmidFrom(url);
  if (pmid) return `EXT_ID:${pmid} AND SRC:MED`;

  const pmcid = pmcidFrom(url);
  if (pmcid) return `PMCID:${pmcid}`;

  const doi = doiFrom(url);
  if (doi) return `DOI:"${doi}"`;

  return null;
}

/**
 * Look the paper up and return every address worth trying.
 *
 * Returns null rather than throwing on any failure: the original URL is
 * always usable, and a lookup that fails must not block a generation.
 */
export async function lookupPaper(url: string): Promise<PaperRecord | null> {
  const query = queryFor(url);
  if (!query) return null;

  try {
    const response = await fetch(
      `${EPMC_SEARCH}?query=${encodeURIComponent(
        query,
      )}&format=json&resultType=core&pageSize=1`,
    );
    if (!response.ok) return null;

    const body = await response.json();
    const record = body?.resultList?.result?.[0];
    if (!record) return null;

    const pmcid: string | undefined = record.pmcid;
    const doi: string | undefined = record.doi;
    const openAccess = record.isOpenAccess === 'Y' || record.inEPMC === 'Y';

    const candidates: string[] = [];

    // Full text first, since that is the whole point of looking it up.
    if (pmcid) {
      candidates.push(`https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`);
      candidates.push(`https://europepmc.org/article/PMC/${pmcid}`);
    }
    if (record.id && record.source === 'MED') {
      candidates.push(`https://europepmc.org/article/MED/${record.id}`);
    }
    if (doi) candidates.push(`https://doi.org/${doi}`);

    // The address the user gave is always worth keeping, and last is fine.
    if (!candidates.includes(url)) candidates.push(url);

    return {
      title: record.title,
      doi,
      pmid: record.source === 'MED' ? record.id : undefined,
      pmcid,
      journal: record.journalInfo?.journal?.title,
      openAccess,
      candidates: [...new Set(candidates)].slice(0, 5),
    };
  } catch (error) {
    console.warn('Europe PMC lookup failed:', error);
    return null;
  }
}
