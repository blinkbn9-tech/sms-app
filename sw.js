const CACHE_NAME = 'sms-icons-v31'; // Bumped to v31
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' // ADDED ICONS HERE
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