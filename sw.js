/* GitHub Pages-compatible service worker; URLs resolve from this repository's Pages scope. */
const APP_ROOT = new URL("./", self.registration.scope);
const CACHE_NAME = "blssnvj21-pathology-v34";
const APP_SHELL = [
  APP_ROOT.href,
  new URL("app.html", APP_ROOT).href,
  new URL("static/css/pathology.css", APP_ROOT).href,
  new URL("static/js/pathology-v27.js", APP_ROOT).href,
  new URL("static/manifest.webmanifest", APP_ROOT).href,
  new URL("static/icons/icon.svg", APP_ROOT).href
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("blssnvj21-pathology-") && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy))); }
      return response;
    }).catch(async () => (await caches.match(request)) || caches.match(APP_ROOT.href)));
    return;
  }
  event.respondWith(fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy))); }
    return response;
  }).catch(() => caches.match(request)));
});
