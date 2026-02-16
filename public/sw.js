const CACHE_NAME = 'restumap-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate' && !request.url.match(/\.(js|css|png|svg|woff2?|ico)$/)) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const clone = res.clone();
      if (res.status === 200 && request.method === 'GET') caches.open(CACHE_NAME).then((c) => c.put(request, clone));
      return res;
    }))
  );
});
