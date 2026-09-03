const CACHE_NAME = 'sms-offline-v29';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local files, ignore external CDN failures
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

// OFFLINE FIRST: Use saved files instantly, only use network if not saved
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // If file is in cache, return it instantly (WORKS OFFLINE)
      if (response) return response;
      
      // If not in cache, try to fetch from network
      return fetch(e.request).then(networkResponse => {
        // Save the new file to cache for next time
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return networkResponse;
      }).catch(() => {
        // If completely offline and not cached, return the main index.html
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});