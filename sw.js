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
  console.log('[SW] Install event');
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets:', STATIC_ASSETS);
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(e => console.error('[SW] Falha cache estático:', e))
  );
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  console.log('[SW] Fetch:', url.pathname);
  // mídia dinâmica
  if (url.pathname.includes('/media/')) {
    evt.respondWith(
      caches.match(evt.request).then(cached => {
        if (cached) {
          console.log('[SW] Servindo mídia do cache:', url.pathname);
          return cached;
        }
        console.log('[SW] Buscando mídia online:', url.pathname);
        return fetch(evt.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(evt.request, copy));
          return res;
        });
      }).catch(e => {
        console.error('[SW] Erro no cache/fetch mídia:', e);
        return fetch(evt.request);
      })
    );
  } else {
    // assets estáticos
    evt.respondWith(
      caches.match(evt.request).then(cached => {
        if (cached) {
          console.log('[SW] Servindo estático do cache:', url.pathname);
          return cached;
        }
        console.log('[SW] Buscando estático online:', url.pathname);
        return fetch(evt.request);
      }).catch(e => {
        console.error('[SW] Erro no cache/fetch estático:', e);
        return fetch(evt.request);
      })
    );
  }
});
