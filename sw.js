const CACHE_NAME = 'tour360-v2';
const ASSETS = [
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
  './js/motionControllers.js',
  './media/img_01_stereo.jpg',
  './media/img_02_mono.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
  