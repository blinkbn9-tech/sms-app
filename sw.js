const CACHE_NAME = 'sms-final-v22'; // Bumped to v22
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
  clients.claim();
});

// NEW: Network First strategy for HTML, Cache First for everything else
self.addEventListener('fetch', e => {
  const request = e.request;
  
  // For HTML navigation requests, always check the network first
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then(networkResponse => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return networkResponse;
      }).catch(() => caches.match(request))
    );
  } else {
    // For CSS/JS/Images, use Cache First
    e.respondWith(
      caches.match(request).then(response => response || fetch(request))
    );
  }
});