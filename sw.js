// ============================================================
// CHRONO CO — Service Worker
// Stratégie : Cache First + mise à jour automatique en arrière-plan
// Changer CACHE_VERSION à chaque déploiement pour forcer la mise à jour
// ============================================================

const CACHE_VERSION = 'chrono-co-v3';
const CACHE_NAME = CACHE_VERSION;

// Fichiers à mettre en cache au premier install
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ============================================================
// INSTALL — mise en cache initiale
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 🔑 Force l'activation immédiate sans attendre la fermeture de l'app
  self.skipWaiting();
});

// ============================================================
// ACTIVATE — supprime les anciens caches + prend le contrôle
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Suppression ancien cache :', name);
            return caches.delete(name);
          })
      );
    })
  );
  // 🔑 Prend le contrôle de tous les onglets ouverts immédiatement
  self.clients.claim();
});

// ============================================================
// FETCH — Stratégie : Cache First avec mise à jour réseau en arrière-plan
// (Stale While Revalidate)
// ============================================================
self.addEventListener('fetch', (event) => {
  // On ne gère que les requêtes GET
  if (event.request.method !== 'GET') return;

  // On ignore les requêtes non-http (chrome-extension, etc.)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Lancement de la requête réseau en arrière-plan
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Met à jour le cache si la réponse est valide
            if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null); // Silencieux si offline

        // Retourne le cache immédiatement si disponible, sinon attend le réseau
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// ============================================================
// MESSAGE — communication avec l'app principale
// Permet à index.html de déclencher une mise à jour manuelle
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
