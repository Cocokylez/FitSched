"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

export default function AuthPopupCompletePage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const next = searchParams.get("next") || "/onboarding"

    if (window.opener) {
      const timer = window.setTimeout(() => {
        window.opener.postMessage(
          { type: "fitsched:google-auth-complete", next },
          window.location.origin
        )
        window.close()
      }, 250)

      return () => window.clearTimeout(timer)
    } else {
      window.location.replace(next)
    }
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
        Finishing Google sign in...
      </div>
    </div>
  )
}
