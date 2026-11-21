/* Only the application shell is cached. Storage and cloud responses are never touched. */
const CACHE = 'asya-moonlight-v4';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'tgbk.js', 'ydsync.js', 'core.js', 'app.js', 'app2.js', 'pwa.js', 'beauty.css', 'moonlight-decor.svg'];
const FILES = new Set(SHELL.map(path => new URL(path, self.registration.scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('asya-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !FILES.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const path = request.mode === 'navigate' ? new URL('index.html', self.registration.scope) : request;
    const cached = await cache.match(path);
    if (cached) return cached;
    return fetch(request);
  })());
});
