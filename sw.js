// sw.js – Service Worker para cache offline

// ↕ Mude esse nome SEMPRE que acrescentar/remover arquivos pra forçar refresh
const CACHE_NAME = "tour360-v1";

// Liste TUDO que você quer pré-cachear
// Caminho RELATIVO à raiz do GitHub Pages (sem barra inicial)
const ASSETS = [
  "index.html",
  "manifest.json",

  /*------  ÍCONES  ------*/
  "icons/favicon.ico",
  "icons/apple-touch-icon.png",
  "icons/icon-192x192.png",
  "icons/icon-512x512.png",

  /*------  JS  ------*/
  "js/loader.js",
  "js/core.js",
  "js/desktop.js",
  "js/mobile.js",
  "js/vr.js",

  /*------  MÍDIAS  ------*/
  "media/pic1.jpg",
  "media/pic2.jpg",
  "media/vid1.mp4"
];

// Instala e coloca tudo no cache uma ÚNICA vez
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // força ativação imediata
});

// Depois de instalado, serve do cache; se não achar, faz fetch normal
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Se você trocar CACHE_NAME, o activate remove o cache velho
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
      )
    )
  );
});
