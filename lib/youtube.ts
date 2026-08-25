/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

// Function to extract YouTube video ID
export const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    // Handle standard watch URLs (youtube.com/watch?v=...)
    if (
      parsedUrl.hostname === 'www.youtube.com' ||
      parsedUrl.hostname === 'youtube.com'
    ) {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }
    // Handle short URLs (youtu.be/...)
    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.substring(1); // Remove leading '/'
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }
    // Handle embed URLs (youtube.com/embed/...)
    if (parsedUrl.pathname.startsWith('/embed/')) {
      const videoId = parsedUrl.pathname.substring(7); // Length of '/embed/'
      if (videoId && videoId.length === 11) {
        return videoId;
      }
    }
  } catch (e) {
    // Ignore URL parsing errors, means it's likely not a valid URL format
    console.warn('URL parsing failed:', e);
  }
  // Fallback using simplified Regex for other potential edge cases not caught by URL parsing
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }

  return null;
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

// Helper function to extract YouTube video ID and create embed URL
export function getYoutubeEmbedUrl(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[2].length === 11 ? match[2] : null;

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
