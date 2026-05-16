const CACHE_NAME = 'tour-360-v18';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/vendor/three.min.js',
  './main/core.js?v=17',
  './main/mobile.js?v=16',
  './main/desktop.js?v=16',
  './main/shared/utils.js?v=16',
  './assets/brand/logo-feel-pontal-oceanico-transparent.png',
  './assets/brand/logo-feel-pontal-oceanico-header.png',
  './assets/brand/logo-mark-transparent.png',
  './assets/icons/favicon.ico',
  './assets/icons/favicon-16x16.png',
  './assets/icons/favicon-32x32.png',
  './assets/icons/favicon-48x48.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/mstile-150x150.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-icon-192.png',
  './assets/icons/maskable-icon-512.png'
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
      caches.open(CACHE_NAME)
        .then((cache) => cache.put(request, response.clone()))
        .catch(() => {});
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
