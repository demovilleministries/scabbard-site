// Scabbard service worker — cache the app shell so it installs and opens offline.
// v2: pages are network-first, so a new deploy is never hidden behind a stale
// cached shell; static assets stay cache-first.
var CACHE = 'scabbard-v2';
var SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var isPage = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html' || url.pathname.slice(-5) === '.html';
  if (isPage) {
    // Network first for pages: always serve the newest deploy; fall back to cache when offline.
    e.respondWith(fetch(e.request).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () { return caches.match(e.request); }));
  } else {
    // Cache first for static assets, refreshing the cache in the background.
    e.respondWith(caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    }));
  }
});
