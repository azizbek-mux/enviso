/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The service worker exists so the app can be installed and so its shell
 * survives a bad connection. It deliberately does not try to be clever.
 *
 * The one hazard of caching a site that deploys several times a day is
 * serving yesterday's app forever, so the two kinds of request are treated
 * oppositely:
 *
 *   - A navigation goes to the network first. If a deploy has happened, the
 *     user gets it immediately; the cache is only a fallback for being
 *     offline, where a slightly old shell beats a dinosaur.
 *   - Everything under /assets/ is content-hashed by the build, so a given
 *     URL can never change meaning. Those are cached first and kept.
 *
 * Nothing cross-origin is touched: the fonts and the Telegram SDK are left to
 * the browser's own HTTP cache rather than duplicated here.
 */

const VERSION = 'enviso-v1';
const SHELL = VERSION + '-shell';

self.addEventListener('install', () => {
  // Nothing is precached. A precache list is one more thing that can go stale,
  // and the shell lands in the cache on first visit anyway.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== SHELL).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const {request} = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The document itself: newest wins, cache is the safety net.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || caches.match('./index.html').then((r) => r || Response.error());
        }
      })(),
    );
    return;
  }

  // Hashed build output: the URL is the version, so it can be kept for good.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL);
        cache.put(request, fresh.clone());
        return fresh;
      })(),
    );
  }
});
