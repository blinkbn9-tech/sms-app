const CACHE_NAME = 'sms-font-v50'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './true_logo.png',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2'
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

// NETWORK FIRST: Always check GitHub for updates before using offline files
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(networkResponse => {
      // If found on network, save a copy to cache and return it
      if (networkResponse && networkResponse.status === 200) {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      }
      return networkResponse;
    }).catch(() => {
      // If offline, use the saved cache
      return caches.match(e.request).then(response => {
        if (response) return response;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});