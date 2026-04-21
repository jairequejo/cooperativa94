// ══════════════════════════════════════════════
//  SERVICE WORKER — Cooperativa 94 PWA
//  Estrategia: Cache-first para assets estáticos
//              Network-first para datos de Google Sheets
// ══════════════════════════════════════════════

const CACHE_NAME = 'cooperativa94-v5';

// Assets estáticos a cachear en la instalación
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/app.js',
  './assets/img/logo.png',
  './assets/img/favicon.ico',
  './icons/icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── INSTALL: precachear assets estáticos ──────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets estáticos...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches viejos ──────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia según tipo de recurso ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Sheets → Network-first (datos en tiempo real, sin caché)
  if (url.hostname.includes('docs.google.com') || url.hostname.includes('spreadsheets')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('', { status: 503, statusText: 'Sin conexión' });
      })
    );
    return;
  }

  // CDN externas (Google Fonts, jsPDF) → Network-first con fallback a caché
  if (url.hostname !== location.hostname && url.hostname !== 'localhost') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets locales → Cache-first con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
