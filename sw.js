/* Black Belt Cut — offline support. Online: always fetch fresh files (so updates show up right away) and keep a copy.
   Offline: serve the saved copy. Login and sync traffic is never cached. */
const CACHE = 'bbc-v2';
const SHELL = ['./', 'index.html', 'logic.js', 'ranks.js', 'firebase-config.js', 'app.js', 'sync.js', 'train.js', 'status.js', 'views.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const appFile = url.origin === self.location.origin;
  const library = url.host === 'www.gstatic.com' || url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (!appFile && !library) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
