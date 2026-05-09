const CACHE = "churros-v1";

// Arquivos do app shell para cachear na instalação
const SHELL = [
  "/",
  "/login",
  "/cardapio",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  // Remove caches antigos
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Requisições para o Supabase e APIs externas: sempre network, sem cache
  if (url.hostname.includes("supabase.co") || url.hostname.includes("supabase.in")) {
    return; // deixa o browser tratar normalmente
  }

  // Arquivos de imagem e assets estáticos: cache first
  if (
    e.request.destination === "image" ||
    e.request.destination === "font" ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/)
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        }).catch(() => cached ?? new Response("", { status: 404 }));
      })
    );
    return;
  }

  // JS/CSS (assets do Vite): cache first
  if (url.pathname.startsWith("/_build/") || url.pathname.match(/\.(js|css)$/)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        }).catch(() => cached ?? new Response("", { status: 404 }));
      })
    );
    return;
  }

  // Navegação (HTML): network first, fallback para cache
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached ?? caches.match("/")))
    );
  }
});
