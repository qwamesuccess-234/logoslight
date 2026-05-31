/**
 * public/sw.js — Service Worker for LogosLight PWA
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS A SERVICE WORKER?
 * A service worker is a script the browser runs in the background — separate
 * from the web page. It intercepts network requests and can:
 *   - Cache responses so the app works offline
 *   - Serve cached pages when there's no internet
 *   - Update the cache when new versions are available
 *
 * CACHE STRATEGY USED HERE:
 *   - App shell (HTML, CSS, JS): Cache First → load instantly from cache
 *   - API calls: Network First → try network, fall back to cache if offline
 *   - Bible/devotional data: Stale While Revalidate → show cache, update bg
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CACHE_NAME    = 'logoslight-v1'
const API_CACHE     = 'logoslight-api-v1'
const OFFLINE_URL   = '/offline.html'

// App shell files to cache on install
const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
]

// API routes to cache for offline use
const CACHEABLE_API_PATTERNS = [
  /\/api\/v1\/bible\/verse-of-the-day/,
  /\/api\/v1\/devotional\/plans/,
  /\/api\/v1\/devotional\/entries/,
  /\/api\/v1\/bible\/passage/,
  /\/api\/v1\/notes/,
  /\/api\/v1\/bible\/bookmarks/,
]

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS).catch((err) => {
        console.warn('[SW] Failed to cache some shell URLs:', err)
      })
    })
  )
  self.skipWaiting()
})

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: intercept network requests ─────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return

  // API requests — Network First with cache fallback
  const isApiRequest = CACHEABLE_API_PATTERNS.some(p => p.test(url.pathname))
  if (isApiRequest) {
    event.respondWith(networkFirstWithCache(request))
    return
  }

  // App navigation — Cache First with network fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request))
    return
  }

  // Static assets (JS, CSS, images) — Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(request))
    return
  }
})

// ── Strategy: Network First ───────────────────────────────────────────────────
async function networkFirstWithCache(request) {
  const cache = await caches.open(API_CACHE)
  try {
    const networkResponse = await fetch(request.clone())
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: 'offline', message: 'No internet connection' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ── Strategy: Cache First ─────────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
    return response
  } catch {
    return new Response('Asset unavailable offline', { status: 503 })
  }
}

// ── Strategy: Navigation (SPA support) ───────────────────────────────────────
async function navigationHandler(request) {
  try {
    const response = await fetch(request)
    return response
  } catch {
    // If offline, serve the cached index.html (SPA still works)
    const cached = await caches.match('/')
    if (cached) return cached
    // Last resort: offline page
    const offline = await caches.match(OFFLINE_URL)
    return offline || new Response('<h1>You are offline</h1>', {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}