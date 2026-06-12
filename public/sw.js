// ============================================================================
// CHARCAS CAPITAL - PWA Service Worker
// Cache de recursos estáticos y fallback offline
// ============================================================================

const CACHE_NAME = 'charcas-capital-v1';

// Recursos estáticos clave para precachear
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/globals.css'
];

// Evento de instalación: cachear recursos estáticos iniciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precachando recursos clave...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Evento de activación: limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Limpiando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Omitir peticiones de la API o métodos no-GET
  if (url.pathname.startsWith('/api/') || request.method !== 'GET') {
    return;
  }

  // Estrategia: Network-First con Fallback a Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, clonarla y guardarla en la caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // En caso de fallo de red (offline), intentar retornar desde caché
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si no está en cache y es navegación de página, retornar raíz
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
