/*
 * Service worker do New Fit.
 *
 * - Página (navegação): rede primeiro. Com internet, sempre a versão mais nova;
 *   sem internet, abre a última versão salva.
 * - Arquivos de /assets/ (com hash no nome, nunca mudam): cache primeiro.
 * - Ícones e manifest: usa o cache e atualiza em segundo plano.
 * - NADA que não seja GET do próprio site passa por aqui: o envio de vendas
 *   para o n8n (POST em outro domínio) vai sempre direto para a rede.
 */
const VERSION = 'newfit-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const MAX_ASSETS = 60;

const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Página: rede primeiro, cache como reserva (offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // JS/CSS com hash: cache primeiro
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(ASSETS)
                .then((cache) => cache.put(request, copy))
                .then(() => trimCache(ASSETS, MAX_ASSETS));
            }
            return response;
          })
      )
    );
    return;
  }

  // Demais arquivos do site: cache e atualiza em segundo plano
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
