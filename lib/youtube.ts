/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

/** A YouTube id is always eleven characters of this alphabet. */
const VIDEO_ID = /^[\w-]{11}$/;

/**
 * Paths that carry the id in the segment straight after them.
 *
 * "shorts" and "live" are the ones that used to be missing, and both were
 * refused outright as invalid links -- a short is nearly always under the
 * length limit, so it was the one kind of video guaranteed to pass screening
 * and yet impossible to submit.
 */
const ID_BEARING = new Set(['embed', 'shorts', 'live', 'v']);

/** The eleven-character id in a YouTube link, or null if there is not one. */
export const getYouTubeVideoId = (url: string): string | null => {
  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      if (VIDEO_ID.test(id)) return id;
    }

    // Covers m.youtube.com and music.youtube.com as well as the bare host.
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      const query = parsed.searchParams.get('v');
      if (query && VIDEO_ID.test(query)) return query;

      const [, section, id] = parsed.pathname.split('/');
      if (ID_BEARING.has(section) && VIDEO_ID.test(id ?? '')) return id;
    }
  } catch {
    // Not a parseable URL. The looser match below still rescues a bare id
    // pasted with surrounding text.
  }

  const loose = trimmed.match(
    /(?:youtu\.be\/|\/embed\/|\/shorts\/|\/live\/|\/v\/|[?&]v=)([\w-]{11})/,
  );
  return loose ? loose[1] : null;
};

// Helper function to validate a YouTube video URL
export async function validateYoutubeUrl(
  url: string,
): Promise<{isValid: boolean; error?: string}> {
  if (getYouTubeVideoId(url)) {
    return {isValid: true};
  }
  return {isValid: false, error: 'Invalid YouTube URL'};
}

/** The embeddable form of a YouTube link. */
export function getYoutubeEmbedUrl(url: string): string {
  // Parsed by the one function that knows the shapes, rather than by a second
  // copy of the pattern that has to be kept in step with it.
  const videoId = getYouTubeVideoId(url);

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // This fallback is unlikely to be hit if validation is working
  console.warn(
    'Could not extract video ID for embedding, using original URL:',
    url,
  );
  return url;
}

export async function getYouTubeVideoTitle(url: string) {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  const response = await fetch(oEmbedUrl);

  if (!response.ok) {
    throw new Error('Not valid Url');
  }

  // Parse the JSON response
  const data = await response.json();

  // Display the title
  if (data && data.title) {
    return data.title;
  } else {
    throw new Error('Error: No title found in the response.');
  }
}

/* -------------------------------------------------------------------------- */
/* Duration                                                                   */
/* -------------------------------------------------------------------------- */

let iframeApiReady: Promise<void> | null = null;

/**
 * Load YouTube's iframe player API once.
 *
 * This is the only way to read a video's length without a YouTube Data API
 * key, and the whole point of this app is that it needs no key but the user's
 * own Gemini one.
 */
function loadIframeApi(): Promise<void> {
  if (iframeApiReady) return iframeApiReady;

  iframeApiReady = new Promise((resolve, reject) => {
    const global = globalThis as any;
    if (global.YT?.Player) return resolve();

    const previous = global.onYouTubeIframeAPIReady;
    global.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Could not load the YouTube player'));
    document.head.appendChild(script);
  });

  return iframeApiReady;
}

/**
 * Video length in seconds, or null when it cannot be determined.
 *
 * Returns null rather than throwing: a video whose length we cannot read
 * should still be allowed through, since the screening step reports duration
 * as a backstop. Blocking on our own uncertainty would be the worse failure.
 */
export async function getVideoDurationSeconds(
  url: string,
): Promise<number | null> {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    await loadIframeApi();
  } catch (error) {
    console.warn('YouTube iframe API unavailable:', error);
    return null;
  }

  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.cssText =
      'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(host);

    let settled = false;
    let player: {destroy?: () => void} | undefined;

    const finish = (seconds: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        player?.destroy?.();
      } catch {
        /* the player may already be gone */
      }
      host.remove();
      resolve(seconds);
    };

    // A player that never becomes ready must not hang the submit button.
    const timer = setTimeout(() => finish(null), 8000);

    try {
      player = new (globalThis as any).YT.Player(host, {
        videoId,
        events: {
          onReady: (event: {target: {getDuration: () => number}}) => {
            const seconds = event.target.getDuration();
            // Live streams and unplayable videos report 0.
            finish(seconds > 0 ? seconds : null);
          },
          onError: () => finish(null),
        },
      });
    } catch (error) {
      console.warn('Could not measure video duration:', error);
      finish(null);
    }
  });
}
