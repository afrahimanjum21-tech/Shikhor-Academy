/* Uttoron Coaching Centre — Service Worker
 * Offline app-shell caching. API/media traffic is always network-only so
 * existing functionality (live data) is never affected.
 */
// H-low7: bump this version on every release that changes the shell assets so
// `activate` purges the previous cache (see the cleanup below). Private/API
// responses are never cached (see `isApiOrMedia`).
const STATIC_CACHE = 'uttoron-static-v2';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/safari-pinned-tab.svg',
];

self.addEventListener('install', (event) => {
  // H-low7: add each shell URL individually with allSettled so ONE missing
  // optional asset (e.g. a favicon that isn't deployed) can't reject the whole
  // install and leave the app with no service worker at all. `cache.addAll`
  // was all-or-nothing.
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const isSameOrigin = (url) => url.origin === self.location.origin;
const isApiOrMedia = (url) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/storage/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (!isSameOrigin(url) || isApiOrMedia(url)) return;

  // Navigations: network first, fall back to cached app shell (offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets (hashed JS/CSS/images): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
