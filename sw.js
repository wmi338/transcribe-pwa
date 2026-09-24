const CACHE_NAME = 'transcribe-pwa-v0.5.21'
const AI_RUNTIME_CACHE = 'transcribe-pwa-ai-assets-v4'
const AI_RUNTIME_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/'
const AI_RUNTIME_FILES = new Set([
  `${AI_RUNTIME_BASE}ort-wasm-simd-threaded.mjs`,
  `${AI_RUNTIME_BASE}ort-wasm-simd-threaded.wasm`,
])
const APP_SHELL = ['./', './manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME && key !== AI_RUNTIME_CACHE).map((key) => caches.delete(key)),
    )),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (AI_RUNTIME_FILES.has(url.href)) {
    event.respondWith(
      caches.open(AI_RUNTIME_CACHE).then((cache) => cache.match(request).then((cached) => cached ?? fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone())
        return response
      }))),
    )
    return
  }
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('./', copy))
          return response
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
      }
      return response
    })),
  )
})
