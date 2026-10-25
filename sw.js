
const CACHE_NAME = "sk-boy-studio-v3";

const CORE_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./qr.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const path of CORE_FILES) {
      try {
        const response = await fetch(path, {cache:"reload"});
        if (response.ok) {
          await cache.put(path, response.clone());
        }
      } catch (error) {
        // अनुपलब्ध फाइल के कारण इंस्टॉल रुकने न दें।
      }
    }

    // PDF लाइब्रेरी को भी कैश करने का प्रयास।
    const libraries = [
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
    ];

    for (const url of libraries) {
      try {
        const response = await fetch(url, {mode:"cors"});
        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch (error) {
        // पहली बार इंटरनेट उपलब्ध न होने पर बाद में प्रयास हो सकता है।
      }
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith("sk-boy-studio-") &&
          key !== CACHE_NAME
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // दूसरे वेबसाइटों के अनुरोधों को अपने नियमों से न बदलें।
  if (url.origin !== self.location.origin &&
      !url.hostname.endsWith("cdnjs.cloudflare.com")) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const response = await fetch(request);

      if (response && response.ok) {
        await cache.put(request, response.clone()).catch(() => {});
      }

      return response;
    } catch (error) {
      const cached = await cache.match(request);

      if (cached) return cached;

      // कैश की गई वेबसाइट को नेविगेशन के समय खोलने की कोशिश।
      if (request.mode === "navigate") {
        const page = await cache.match("./index.html");
        if (page) return page;
      }

      return Response.error();
    }
  })());
});
