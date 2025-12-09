const CACHE_NAME = 'beastboard-cache-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-graphql-requests') {
        event.waitUntil(handleQueuedGraphqlRequests());
    }
});

async function handleQueuedGraphqlRequests() {
    // TODO: replay queued requests
    console.log("Syncing queued GraphQL requests...");
}
