"use client"

import { useEffect, useRef } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

export default function GooglePopupPage() {
  const searchParams = useSearchParams()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const next = searchParams.get("next") || "/onboarding"
    const completeUrl = new URL("/auth/popup-complete", window.location.origin)
    completeUrl.searchParams.set("next", next)

    signIn("google", { callbackUrl: completeUrl.toString() })
  }, [searchParams])

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "8px",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "20px", fontWeight: 800 }}>FitSched</div>
      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        Opening Google sign in...
      </div>
    </div>
  )
}
