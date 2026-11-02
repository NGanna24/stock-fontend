/* eslint-disable no-restricted-globals */
// src/service-worker.js
//
// Permet d'ouvrir Miyo SANS internet (navigateur et application de bureau qui charge le site) :
//   - les fichiers de l'application (JS, CSS, page) sont gardés sur l'appareil à chaque mise à jour ;
//   - la page est d'abord demandée au serveur (toujours la dernière version), et si internet
//     ne répond pas, la copie gardée est affichée ;
//   - les appels à l'API ne sont JAMAIS mis en cache ici (les ventes hors ligne sont gérées
//     par src/offline/horsLigne.js).
// Généré au « npm run build » par react-scripts (Workbox InjectManifest).
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

// Le fichier principal de l'application dépasse la limite du pré-cache automatique (2 Mo) :
// à l'installation, on garde nous-mêmes tous les fichiers JS/CSS listés dans asset-manifest.json.
const CACHE_FICHIERS = 'miyo-fichiers';
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const rep = await fetch(`${process.env.PUBLIC_URL}/asset-manifest.json`, { cache: 'no-store' });
      const manifeste = await rep.json();
      const fichiers = Object.values(manifeste.files || {})
        .filter((f) => typeof f === 'string' && /\.(js|css)$/.test(f) && !f.endsWith('.map'));
      const cache = await caches.open(CACHE_FICHIERS);
      await Promise.all(fichiers.map((f) => cache.add(f).catch(() => {})));
    } catch {
      // Pas grave : les fichiers seront gardés au fil de l'utilisation
    }
  })());
});

const estApi = (url) => url.pathname.startsWith('/api/') || url.pathname === '/api';

// ---------- Pages (navigation) : réseau d'abord, copie locale si pas d'internet ----------
const pages = new NetworkFirst({
  cacheName: 'miyo-pages',
  networkTimeoutSeconds: 5,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    {
      // Pas de réseau et page jamais visitée : on sert l'application gardée (index.html)
      handlerDidError: async () => matchPrecache(`${process.env.PUBLIC_URL}/index.html`),
    },
  ],
});
registerRoute(new NavigationRoute(pages, { denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/] }));

// ---------- Fichiers de l'application (/static/ : nom unique par version → la copie locale suffit) ----------
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith(`${process.env.PUBLIC_URL}/static/`),
  new CacheFirst({
    cacheName: CACHE_FICHIERS,
    plugins: [new CacheableResponsePlugin({ statuses: [200] }), new ExpirationPlugin({ maxEntries: 150 })],
  })
);

// ---------- Autres fichiers publics du site (logos, worker PDF, manifest) ----------
registerRoute(
  ({ url, request }) => url.origin === self.location.origin && !estApi(url)
    && ['image', 'script', 'style', 'font', 'manifest', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: 'miyo-publics',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] }), new ExpirationPlugin({ maxEntries: 60 })],
  })
);

// ---------- Polices Google (Inter) ----------
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'miyo-polices-css' })
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'miyo-polices',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 3600 }),
    ],
  })
);
