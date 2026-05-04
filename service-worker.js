const CACHE_NAME = 'tour-360-v4';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/vendor/three.min.js',
  './main/core.js',
  './main/mobile.js',
  './main/desktop.js',
  './main/shared/utils.js',
  './assets/panoramas/panorama_01.jpg',
  './assets/panoramas/panorama_02.jpg',
  './assets/panoramas/panorama_03.jpg',
  './assets/panoramas/panorama_04.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response && (response.ok || response.type === 'opaque')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');

      if (fallback) {
        return fallback;
      }

      return new Response('<!doctype html><title>Tour 360</title><p>Tour 360 indisponível offline.</p>', {
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    }

    return new Response('', {
      status: 504,
      statusText: 'Offline'
    });
  }
}
