const CACHE_NAME = 'cine-o-matic-v4';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // {cache:'reload'} forces each fetch past the browser's own HTTP cache —
      // without it, a stale network-cached response could get baked into the
      // service worker's cache at install time, undoing the whole point of updating.
      Promise.all(APP_SHELL.map((url) =>
        fetch(url, { cache: 'reload' }).then((res) => cache.put(url, res))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin (OMDb/TMDB) requests pass through untouched

  // Network-first: always prefer whatever's actually deployed right now. Only fall
  // back to the cached copy if the network is genuinely unreachable (offline), so
  // stale cached content can never silently reappear after backgrounding the app.
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
