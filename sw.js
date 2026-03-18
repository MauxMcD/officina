/*
 * Officina — Service Worker v12.8
 * Strategia: Cache-first per il file HTML (che contiene tutto),
 * Network-first per eventuali risorse esterne.
 *
 * Questo file deve trovarsi nella stessa directory di index.html
 * quando Officina è ospitata su un server HTTPS (es. GitHub Pages).
 *
 * v12.8: rimosso skipWaiting() automatico dall'install — il nuovo SW
 * entra in stato "waiting" e viene attivato solo su richiesta esplicita
 * dell'utente tramite il banner di aggiornamento nell'app.
 */

const CACHE_NAME = 'officina-v12.8';
const APP_FILES = [
    './',
    './index.html'
];

// Install: pre-cache il file HTML.
// NON chiamare skipWaiting() qui — il nuovo SW deve restare in "waiting"
// finché l'utente non clicca "Aggiorna" nel banner dell'app.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(APP_FILES);
        })
    );
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

// Message: gestisce il comando SKIP_WAITING inviato dall'app
// quando l'utente clicca "Aggiorna" nel banner di aggiornamento.
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
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
