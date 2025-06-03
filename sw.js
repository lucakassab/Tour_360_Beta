// sw.js – cache-first genérico; mídias são adicionadas dinamicamente pelo loader.js
const CACHE_CORE  = "tour360-core-v1";
const CORE_FILES  = [
  "index.html",
  "manifest.json",
  "icons/favicon.ico",
  "icons/apple-touch-icon.png",
  "icons/icon-192x192.png",
  "icons/icon-512x512.png",
  "js/loader.js",
  "js/core.js",
  "js/desktop.js",
  "js/mobile.js",
  "js/vr.js"
];

// Instalamos apenas os arquivos essenciais (não inclui mídias)
self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(CACHE_CORE).then(c => c.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

// Cache-first: tenta cache, senão rede
self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(
      resp => resp || fetch(evt.request)
    )
  );
});

// Limpa caches antigos se o nome mudar
self.addEventListener("activate", evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_CORE || k === "tour360-media-v1") ? null : caches.delete(k)))
    )
  );
  self.clients.claim();
});
