const CACHE_NAME = 'tour360-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './js/aframe.min.js',
  './js/aframe-stereo-component.min.js',
  './js/core.js',
  './js/motionControllers.js',
  './media/img_01_stereo.jpg',
  './media/img_02_mono.jpg'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request)
      .then(resp => resp || fetch(evt.request))
  );
});
