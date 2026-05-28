"use client"

import { useEffect } from "react"

const MIN_MS = 3000   // always visible for at least this long even if video fails
const MAX_MS = 15000  // hard cap so a broken video never blocks the app
const FADE_MS = 380

export function SplashRemover() {
  useEffect(() => {
    const el = document.getElementById("__fs-sp") as HTMLDivElement | null
    if (!el) return

    let dismissed = false
    const dismiss = () => {
      if (dismissed) return
      dismissed = true
      el.style.transition = `opacity ${FADE_MS}ms ease`
      el.style.opacity = "0"
      el.style.pointerEvents = "none"
      setTimeout(() => el.parentNode?.removeChild(el), FADE_MS + 50)
    }

    const video = el.querySelector("video")
    const shownAt = Number(el.dataset.shown ?? 0)
    const elapsed = shownAt ? Date.now() - shownAt : 0

    // Hard-cap fallback — always dismiss by MAX_MS
    const fallback = setTimeout(dismiss, Math.max(0, MAX_MS - elapsed))

    if (video) {
      // Dismiss when video ends, but respect MIN_MS
      const onEnded = () => {
        const remaining = Math.max(0, MIN_MS - (shownAt ? Date.now() - shownAt : MIN_MS))
        setTimeout(dismiss, remaining)
      }
      video.addEventListener("ended", onEnded, { once: true })
      // If video never plays (autoplay blocked, missing file), fall through to MAX_MS fallback
      return () => {
        clearTimeout(fallback)
        video.removeEventListener("ended", onEnded)
      }
    }

    // No video element — just respect MIN_MS
    const t = setTimeout(dismiss, Math.max(0, MIN_MS - elapsed))
    return () => { clearTimeout(fallback); clearTimeout(t) }
  }, [])

  return null
}
