"use client"

import { useEffect } from "react"

const MIN_MS = 1000   // show at least this long so it reads as a real loading moment
const MAX_MS = 4000   // hard cap — the splash can never block the app
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

    const shownAt = Number(el.dataset.shown ?? 0)
    const elapsed = shownAt ? Date.now() - shownAt : 0

    // This effect running means the app shell has hydrated and is interactive —
    // so we're ready to reveal it. Keep the splash for a short minimum so it
    // doesn't flicker, then fade it out. The fallback is just a safety net.
    const minTimer = setTimeout(dismiss, Math.max(0, MIN_MS - elapsed))
    const fallback = setTimeout(dismiss, Math.max(0, MAX_MS - elapsed))

    return () => {
      clearTimeout(minTimer)
      clearTimeout(fallback)
    }
  }, [])

  return null
}
