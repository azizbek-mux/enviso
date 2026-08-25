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
