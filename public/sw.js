/**
 * DocSpace service worker.
 *
 * Because every tool runs in the browser, caching the app shell makes the
 * whole product genuinely usable offline — compress, merge, split, convert,
 * sign and write all keep working with no connection.
 *
 * Strategy:
 *   - Navigations: network-first (so a new deploy is picked up immediately),
 *     falling back to cache, then to the cached home page.
 *   - Hashed build assets and pdf.js data: cache-first, they never change.
 *   - Everything else same-origin: cache with background refresh.
 *   - Cross-origin (e.g. the OCR engine CDN): left alone entirely.
 */
const CACHE = "docspace-v1";
const APP_SHELL = ["/", "/write"];

/** Paths that are safe to serve cache-first (content-hashed or immutable). */
function isImmutable(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/standard_fonts/") ||
    pathname.startsWith("/cmaps/") ||
    pathname === "/pdf.worker.min.mjs"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Never let a failed precache (e.g. offline install) block activation.
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // leave CDNs alone

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  if (isImmutable(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
