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

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
