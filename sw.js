const CACHE_NAME = 'tour360-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/favicon.ico',
  './icons/icon-180x180.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './js/aframe.min.js',
  './js/aframe-stereo-component.min.js',
  './js/core.js',
  './js/motionControllers.js'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  // se for mídia, tenta do cache, senão fetch e cacheia
  if (url.pathname.includes('/media/')) {
    evt.respondWith(
      caches.match(evt.request).then(cached => {
        if (cached) return cached;
        return fetch(evt.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(evt.request, copy));
          return res;
        });
      })
    );
  } else {
    // assets estáticos
    evt.respondWith(
      caches.match(evt.request).then(cached => cached || fetch(evt.request))
    );
  }
});
