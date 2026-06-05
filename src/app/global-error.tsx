"use client"

import { useEffect } from "react"

// Catches errors thrown in the ROOT layout itself — the last line of defense.
// It replaces the entire document, so globals.css / theme variables / fonts are
// NOT available here: everything must be self-contained with hardcoded styles.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#0b0f0e",
          color: "#f5f7f6",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: 900,
            color: "rgba(220,80,80,0.18)",
            lineHeight: 1,
            marginBottom: "16px",
            letterSpacing: "-0.04em",
          }}
        >
          500
        </div>
        <div style={{ fontSize: "22px", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
          Something went wrong
        </div>
        <p style={{ fontSize: "14px", color: "#9aa3a1", marginBottom: "32px", maxWidth: "300px", lineHeight: 1.6 }}>
          An unexpected error occurred. Try again, or head back to your schedule.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "#1265fe",
              color: "#ffffff",
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
          <a
            href="/schedule"
            style={{
              background: "transparent",
              color: "#f5f7f6",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: "14px",
              padding: "13px 28px",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Go to schedule
          </a>
        </div>
      </body>
    </html>
  )
}
