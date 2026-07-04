self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("nutri-cache").then(cache =>
      cache.addAll(["/", "/styles.css", "/app.js"])
    )
  );
});