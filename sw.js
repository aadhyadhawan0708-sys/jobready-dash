// App-shell cache only. Dashboard data is never cached: it always comes live from the API.
const CACHE = "jr-live-v7";
const SHELL = ["./", "index.html", "app.css", "app2.css", "app.js", "render.js", "sections.js", "sections2.js", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png", "icons/avatar.jpg"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // API calls go straight to the network
  // network first so updates show up, cache as offline fallback
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
