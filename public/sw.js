// ─────────────────────────────────────────────────────────────────────────────
//  FitSched Service Worker
//  Handles: push notifications · map tile caching · offline hike save queue
// ─────────────────────────────────────────────────────────────────────────────

const TILE_CACHE  = "fitsched-tiles-v2"   // bump = forces browser to re-install SW
const TILE_MAX    = 1200   // ~50 MB at ~40 KB/tile

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Remove any old tile caches from previous versions
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith("fitsched-tiles-") && k !== TILE_CACHE)
            .map(k => caches.delete(k))
        )
      ),
    ])
  )
})

// ── Fetch — intercept map tiles ───────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const url = event.request.url

  // Cache OpenTopoMap tiles with a cache-first strategy
  if (url.includes("tile.opentopomap.org")) {
    event.respondWith(handleTile(event.request))
  }
  // Everything else: fall through to the network normally
})

async function handleTile(request) {
  const cache = await caches.open(TILE_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    // Cache regardless of CORS mode — opaque (no-cors) responses have ok=false
    // but can still be stored and served from the Cache API
    const toStore = response.clone()
    cache.keys().then(keys => {
      if (keys.length >= TILE_MAX) cache.delete(keys[0])
      cache.put(request, toStore).catch(() => {})
    }).catch(() => {})
    return response
  } catch {
    // Offline and not cached — return a transparent 1×1 PNG placeholder
    return new Response(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
      { status: 200, headers: { "Content-Type": "image/png" } }
    )
  }
}

// ── Background sync — flush queued hike saves ─────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-hikes") {
    event.waitUntil(flushPendingHikes())
  }
})

async function flushPendingHikes() {
  let db
  try { db = await openIDB() } catch { return }

  const pending = await idbGetAll(db, "pending-hikes")
  if (pending.length === 0) return

  let synced = 0
  let changed = 0
  for (const item of pending) {
    let res
    try {
      res = await fetch("/api/hike", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(item.data),
      })
    } catch {
      break // network still down — stop and retry on the next sync event
    }

    // Classify the response so the queue can't get stuck on a poison item.
    //  2xx       → saved
    //  409       → already logged for that day; data effectively saved → drop
    //  400/403/413 (other 4xx) → permanently rejected → drop
    //  401/429/5xx → transient → keep and retry later
    const s = res.status
    const transient = s === 401 || s === 429 || s >= 500
    if (transient) break
    await idbDelete(db, "pending-hikes", item.id)
    changed++
    if (s >= 200 && s < 300) synced++
  }

  if (changed > 0) {
    // Tell every open tab so they can refresh their logs list + pending badge
    const all = await self.clients.matchAll({ type: "window" })
    all.forEach(c => c.postMessage({ type: "hike-synced", count: synced }))
  }
}

// ── IndexedDB helpers (SW context) ────────────────────────────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("fitsched-offline", 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("pending-hikes")) {
        req.result.createObjectStore("pending-hikes", { keyPath: "id", autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror  = () => reject(req.error)
  })
}

function idbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, "readonly")
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

function idbDelete(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, "readwrite")
    const req = tx.objectStore(storeName).delete(key)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body:     data.body  || "You have a new notification",
    icon:     data.icon  || "/logo.png",
    badge:    "/logo.png",
    tag:      "fitsched-notification",
    renotify: true,
    data:     { url: data.url || "/schedule" },
    actions: [
      { action: "view",    title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "FitSched", options)
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/schedule"
  if (event.action === "dismiss") return

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
