/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {LinkSource, Source} from '@/lib/source';

/**
 * Where this Mini App lives, e.g. "yourbot/learn".
 *
 * Fill this in after BotFather gives you the link. Until then sharing falls
 * back to passing the bare source URL, which still works -- the recipient just
 * does not land inside the app.
 */
export const MINI_APP_PATH = '';

/**
 * Pack a source into a startapp payload.
 *
 * Telegram restricts start_param to URL-safe characters and a modest length,
 * hence base64url. Only links can travel: an uploaded PDF exists on one device
 * and there is no server to put it on.
 */
export function encodeSource(source: Source): string | null {
  const url =
    source.kind === 'video'
      ? source.url
      : source.via === 'url'
        ? source.url
        : null;
  if (!url) return null;

  const payload = JSON.stringify({k: source.kind === 'video' ? 'v' : 'p', u: url});

  try {
    const base64 = btoa(unescape(encodeURIComponent(payload)));
    const packed = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // Telegram caps start_param at 512 characters.
    return packed.length <= 512 ? packed : null;
  } catch (error) {
    console.warn('Could not encode a share link:', error);
    return null;
  }
}

/** Unpack a startapp payload back into a source. */
export function decodeSource(param: string): LinkSource | null {
  try {
    const base64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(json) as {k?: string; u?: string};

    if (!parsed.u) return null;
    if (parsed.k === 'v') return {kind: 'video', url: parsed.u};
    if (parsed.k === 'p') return {kind: 'paper', via: 'url', url: parsed.u};
    return null;
  } catch (error) {
    console.warn('Could not read the shared link:', error);
    return null;
  }
}

/** A link that opens this Mini App with the given source ready to build. */
export function shareLink(source: Source): string | null {
  const packed = encodeSource(source);
  if (!packed) return null;
  if (!MINI_APP_PATH) {
    // No bot registered yet: share the source itself rather than nothing.
    return source.kind === 'video'
      ? source.url
      : source.via === 'url'
        ? source.url
        : null;
  }
  return `https://t.me/${MINI_APP_PATH}?startapp=${packed}`;
}
