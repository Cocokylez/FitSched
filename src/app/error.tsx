"use client"

import { useEffect } from "react"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 24px",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: "72px",
        fontWeight: 900,
        color: "rgba(220,80,80,0.15)",
        lineHeight: 1,
        marginBottom: "16px",
        fontFamily: "var(--font-display)",
        letterSpacing: "-0.04em",
      }}>
        500
      </div>
      <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
        Something went wrong
      </div>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "32px", maxWidth: "280px", lineHeight: 1.6 }}>
        An unexpected error occurred. Try again or come back later.
      </p>
      <button
        onClick={reset}
        style={{
          background: "var(--text)",
          color: "var(--bg)",
          border: "none",
          borderRadius: "14px",
          padding: "13px 28px",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  )
}
