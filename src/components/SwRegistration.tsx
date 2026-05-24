"use client"

import { useEffect } from "react"

/**
 * Registers the service worker globally so tile caching and background sync
 * are active on every page — not just when the user enables push notifications.
 */
export function SwRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silently ignore registration errors (e.g. in unsupported browsers)
    })

    // Listen for "hike-synced" messages from the SW so pages can react
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "hike-synced") {
        window.dispatchEvent(
          new CustomEvent("hike-synced", { detail: { count: event.data.count } })
        )
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [])

  return null
}
