const CACHE = "v2-detector";
const ASSETS = ["./", "./index.html", "./style.css", "./script.js", "./manifest.json", "./donaciones.jpg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
