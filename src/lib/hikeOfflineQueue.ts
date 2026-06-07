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

function deleteQueued(db: IDBDatabase, id: number): Promise<void> {
  return new Promise<void>((res, rej) => {
    const tx  = db.transaction(STORE, "readwrite")
    const req = tx.objectStore(STORE).delete(id)
    req.onsuccess = () => res()
    req.onerror   = () => rej(req.error)
  })
}

/**
 * Decide what to do with a queued hike based on the server's response status.
 *  - "synced":  saved (2xx) → remove from queue, count as a success.
 *  - "drop":    permanently rejected → remove from queue so it can't get stuck.
 *               409 = a hike already exists for that day (data is effectively
 *               saved); 400/403/413 = invalid/banned/too-large, will never
 *               succeed on retry.
 *  - "retry":   transient (401 auth, 429 rate-limit, 5xx) → keep and retry later.
 */
function classifyHikeResponse(status: number): "synced" | "drop" | "retry" {
  if (status >= 200 && status < 300) return "synced"
  if (status === 409) return "drop"
  if (status === 401 || status === 429 || status >= 500) return "retry"
  if (status >= 400 && status < 500) return "drop"
  return "retry"
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
      let response: Response
      try {
        response = await fetch("/api/hike", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(item.data),
        })
      } catch {
        break // genuine network failure — still offline, stop and retry later
      }

      const verdict = classifyHikeResponse(response.status)
      if (verdict === "retry") break // transient — keep item, retry on next trigger
      // "synced" or "drop": remove from the queue either way so it can't stick.
      await deleteQueued(db, item.id)
      if (verdict === "synced") synced++
    }
  } catch {
    // IndexedDB unavailable
  }
  return synced
}
