/*
 * Officina — Service Worker v11.1
 * Strategia: Cache-first per il file HTML (che contiene tutto),
 * Network-first per eventuali risorse esterne.
 * 
 * Questo file deve trovarsi nella stessa directory di index.html
 * quando Officina è ospitata su un server HTTPS (es. GitHub Pages).
 */

const CACHE_NAME = 'officina-v11.1';
const APP_FILES = [
    './',
    './index.html'
];

// Install: pre-cache il file HTML
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(APP_FILES);
        })
    );
    // Attiva subito senza aspettare che le tab vecchie si chiudano
    self.skipWaiting();
});

// Activate: elimina cache vecchie di versioni precedenti
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    // Prendi il controllo di tutte le tab aperte immediatamente
    self.clients.claim();
});

// Fetch: cache-first per navigazione, network-first per il resto
self.addEventListener('fetch', event => {
    const request = event.request;

    // Per richieste di navigazione (la pagina HTML): cache-first
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match(request).then(cached => {
                // Aggiorna la cache in background (stale-while-revalidate)
                const fetchPromise = fetch(request).then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }
                    return response;
                }).catch(() => null);

                // Restituisci la versione cached se disponibile, altrimenti aspetta la rete
                return cached || fetchPromise;
            })
        );
        return;
    }

    // Per tutte le altre risorse: network-first con fallback a cache
    event.respondWith(
        fetch(request).then(response => {
            if (response && response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return response;
        }).catch(() => caches.match(request))
    );
});
