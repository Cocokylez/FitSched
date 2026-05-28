"use client"

import { useEffect } from "react"

// Removes the #__fs-sp splash div once React has hydrated.
// The inline script in layout.tsx creates the splash immediately on HTML parse;
// this component dismisses it once the app is actually ready to show content.
// A minimum display time (700ms) prevents an invisible flash on super-fast loads.

const MIN_MS = 3000  // always visible for at least this long
const FADE_MS = 380  // fade-out duration (must match the CSS transition below)

export function SplashRemover() {
  useEffect(() => {
    const el = document.getElementById("__fs-sp") as HTMLDivElement | null
    if (!el) return

    const shownAt = Number(el.dataset.shown ?? 0)
    const elapsed = shownAt ? Date.now() - shownAt : MIN_MS
    const wait = Math.max(0, MIN_MS - elapsed)

    const t = setTimeout(() => {
      el.style.transition = `opacity ${FADE_MS}ms ease`
      el.style.opacity = "0"
      el.style.pointerEvents = "none"
      setTimeout(() => el.parentNode?.removeChild(el), FADE_MS + 50)
    }, wait)

    return () => clearTimeout(t)
  }, [])

  return null
}
