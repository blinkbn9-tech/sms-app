const CACHE_NAME = 'sms-system-v51';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './true_logo.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(e.request).then(response => {
        if (response) return response;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});