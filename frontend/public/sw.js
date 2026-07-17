// region MODULE_SW [DOMAIN(6): PWA; CONCEPT(5): OfflineCache; TECH(7): ServiceWorker]
// ## @purpose Minimal Service Worker for PWA: caches essential assets on install.
// GREP_SUMMARY: service worker, SW, PWA, cache, install, activate, offline
// STRUCTURE: ▶ install → cache.addAll(['/','/index.html','/src/main.jsx']) → activate → claim clients

const CACHE_NAME = 'wallet-v1';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request),
    ),
  );
});
// endregion MODULE_SW
