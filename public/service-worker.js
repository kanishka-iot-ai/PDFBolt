/**
 * PDFBolt Production Service Worker (v1.1.0)
 * Tiered Cache Architecture:
 * - CORE: App shell & critical assets (cached during install)
 * - TOOLS: Large optional processing engines like OpenCV / JScanify (cached strictly on-demand at runtime)
 * - SECURITY: API responses, private PDF streams, and user document contents are NEVER cached.
 */

const CORE_CACHE = 'pdfbolt-core-v1.1.0';
const TOOLS_CACHE = 'pdfbolt-tools-v1.1.0';
const ALLOWED_CACHES = [CORE_CACHE, TOOLS_CACHE];

// Core shell assets only - NO multi-megabyte optional libraries during install
const CORE_STATIC_ASSETS = [
  '/',
  '/index.html',
  '/pdfbolt-logo.webp',
  '/pdfbolt-logo-transparent.png',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// Install event - cache ONLY lightweight core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[ServiceWorker] Core asset caching error:', err))
  );
});

// Activate event - purge outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => !ALLOWED_CACHES.includes(name))
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch handler with strict security & performance rules
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never intercept non-GET requests
  if (event.request.method !== 'GET') return;

  // 2. Never cache private APIs, backend endpoints, blob URLs, or signed cloud URLs
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/jobs/') ||
    url.searchParams.has('sig') ||
    url.searchParams.has('token') ||
    url.protocol === 'blob:'
  ) {
    return;
  }

  // 3. Optional heavy tools (/lib/opencv.js, /lib/jscanify.min.js) -> Cache-first in TOOLS_CACHE only when explicitly requested
  if (url.pathname.startsWith('/lib/')) {
    event.respondWith(
      caches.open(TOOLS_CACHE).then((toolsCache) =>
        toolsCache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              toolsCache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        })
      )
    );
    return;
  }

  // 4. Core shell & hashed static JS/CSS assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cache immutable built assets in core cache
          if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.webp') || url.pathname.endsWith('.png')) {
            const respClone = response.clone();
            caches.open(CORE_CACHE).then((coreCache) => {
              coreCache.put(event.request, respClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Navigation fallback for SPA routes
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Network unavailable', { status: 503, statusText: 'Offline' });
        });
    })
  );
});

// Skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

