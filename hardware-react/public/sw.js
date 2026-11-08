const CACHE_NAME = "Hardware Inventory-v2";

const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/manifest.json",
    "/favicon.svg",
    "/icons.svg",
    "/logo/192.PNG.png",
    "/logo/512.PNG.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            await Promise.all(
                FILES_TO_CACHE.map(async url => {
                    try {
                        const response = await fetch(url, { cache: "reload" });
                        if (response.ok && response.type === "basic") {
                            await cache.put(url, response);
                        }
                    } catch (error) {
                        console.warn("Failed to precache:", url, error);
                    }
                })
            );
        })
    );

    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    // Keep live API calls, Firebase requests, and third-party assets network-only.
    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(async () => {
                const cachedApp = await caches.match("/index.html");
                if (cachedApp) {
                    return cachedApp;
                }

                return new Response(
                    "You are offline. Please reconnect to load the Hardware Inventory app.",
                    {
                        status: 503,
                        headers: { "Content-Type": "text/plain; charset=utf-8" }
                    }
                );
            })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(async cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            try {
                const networkResponse = await fetch(request);

                if (networkResponse.ok && networkResponse.type === "basic") {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, networkResponse.clone());
                }

                return networkResponse;
            } catch (error) {
                console.warn("Fetch failed and no cached response is available:", request.url);
                return new Response("This resource is unavailable offline.", {
                    status: 503,
                    headers: { "Content-Type": "text/plain; charset=utf-8" }
                });
            }
        })
    );
});
