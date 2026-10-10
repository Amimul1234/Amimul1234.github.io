const CACHE = "ae-2026-10-10-1";
const CORE = [
  "./",
  "index.html",
  "assets/site.css",
  "assets/site.js",
  "assets/fonts.css",
  "assets/mark.svg",
  "assets/fonts/ibm-plex-mono-400-latin.woff2",
  "assets/fonts/ibm-plex-mono-500-latin.woff2",
  "assets/fonts/ibm-plex-sans-400-latin.woff2",
  "assets/fonts/ibm-plex-sans-400i-latin.woff2",
  "assets/fonts/ibm-plex-sans-500-latin.woff2",
  "assets/fonts/ibm-plex-sans-600-latin.woff2",
  "assets/fonts/ibm-plex-sans-condensed-500-latin.woff2",
  "assets/fonts/ibm-plex-sans-condensed-600-latin.woff2",
  "assets/fonts/ibm-plex-sans-condensed-700-latin.woff2",
  "assets/fonts/noto-sans-bengali-var.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
      return hit || net;
    })
  );
});
