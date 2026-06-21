// Cambia este numero de version cada vez que subas un index.html nuevo.
// Forzar el cambio de version es lo que hace que los moviles detecten
// que hay una actualizacion del Service Worker y la instalen.
const CACHE_NAME = 'adif-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting(); // activa la nueva version sin esperar a cerrar todas las pestañas
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); }) // borra cachés de versiones antiguas
      );
    }).then(function() {
      return self.clients.claim(); // toma el control de la app inmediatamente
    })
  );
});

// Estrategia NETWORK-FIRST:
// 1) Intenta siempre traer la version mas reciente de internet
// 2) Si lo consigue, la guarda en cache y la devuelve
// 3) Si NO hay conexion, usa la copia guardada como respaldo (modo offline)
self.addEventListener('fetch', function(e) {
  // Solo aplicamos esta estrategia a peticiones de navegacion/recursos propios,
  // dejamos pasar tal cual las peticiones a otros dominios (CDN de SheetJS, CoreLink, Google, etc.)
  const esMismoOrigen = new URL(e.request.url).origin === self.location.origin;
  if (!esMismoOrigen) return;

  e.respondWith(
    fetch(e.request)
      .then(function(respuestaRed) {
        // Guardamos una copia fresca en cache para el modo offline
        const copia = respuestaRed.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, copia);
        });
        return respuestaRed;
      })
      .catch(function() {
        // Sin conexion: usamos lo que tengamos guardado
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
  );
});
