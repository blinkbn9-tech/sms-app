const CACHE_NAME = 'sms-font-v42';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/quicksand/v30/6xKtdSZaM9iE8KbpRA_LJ3z8mH9BOJvgkMV0mLtfZw.woff2'
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
    caches.match(e.request).then(response => {
      if (response) return response;
      return fetch(e.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return networkResponse;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});