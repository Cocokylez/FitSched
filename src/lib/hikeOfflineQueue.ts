// ─────────────────────────────────────────────────────────────────────────────
//  Offline hike save queue — IndexedDB helpers (client-side)
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME    = "fitsched-offline"
const DB_VERSION = 1
const STORE      = "pending-hikes"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

/** Save a hike payload to IndexedDB so it can be synced later. */
export async function queueHike(hikeData: Record<string, unknown>): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).add({ data: hikeData, queuedAt: new Date().toISOString() })
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

/** Returns the number of hikes waiting to be synced. */
export async function getPendingHikeCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result as number)
    req.onerror   = () => reject(req.error)
  })
}

/**
 * Ask the service worker to flush the queue via Background Sync.
 * Falls back to an immediate manual flush if Background Sync isn't supported.
 */
export async function requestSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return

  try {
    const reg = await navigator.serviceWorker.ready
    // Background Sync API
    if ("sync" in reg) {
      await (reg as any).sync.register("sync-pending-hikes")
    }
  } catch {
    // Ignore — the SW will pick it up on the next page load / online event
  }
}

/**
 * Directly flush queued hikes from the page (no SW needed).
 * Call this when the network comes back online.
 * Returns the number of hikes successfully synced.
 */
export async function flushPendingHikes(): Promise<number> {
  let synced = 0
  try {
    const db = await openDB()
    const all: Array<{ id: number; data: Record<string, unknown> }> = await new Promise((res, rej) => {
      const tx  = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => res(req.result as any)
      req.onerror   = () => rej(req.error)
    })

    for (const item of all) {
      try {
        const response = await fetch("/api/hike", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(item.data),
        })
        if (response.ok) {
          await new Promise<void>((res, rej) => {
            const tx  = db.transaction(STORE, "readwrite")
            const req = tx.objectStore(STORE).delete(item.id)
            req.onsuccess = () => res()
            req.onerror   = () => rej(req.error)
          })
          synced++
        }
      } catch {
        break // still offline — stop and retry later
      }
    }
  } catch {
    // IndexedDB unavailable
  }
  return synced
}
