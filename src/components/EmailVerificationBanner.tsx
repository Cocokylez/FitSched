"use client"

import { useState } from "react"

export function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (dismissed) return null

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch("/api/auth/send-verification", { method: "POST" })
      const d = await res.json().catch(() => ({}))
      if (d.alreadyVerified) { setDismissed(true); return }
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      background: "rgba(251,191,36,0.08)",
      borderBottom: "1px solid rgba(251,191,36,0.2)",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "12px",
      color: "#f5c842",
      flexWrap: "wrap",
    }}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
      <span style={{ flex: 1, color: "#e8d87a" }}>
        {sent ? "Verification email sent — check your inbox." : "Verify your email to secure your account."}
      </span>
      {!sent && (
        <button onClick={handleSend} disabled={sending}
          style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "4px 12px", fontSize: "11px", fontWeight: 700, color: "#f5c842", cursor: sending ? "default" : "pointer", opacity: sending ? 0.6 : 1, fontFamily: "inherit" }}>
          {sending ? "Sending…" : "Send verification email"}
        </button>
      )}
      <button onClick={() => setDismissed(true)}
        style={{ background: "none", border: "none", color: "rgba(251,191,36,0.5)", cursor: "pointer", padding: "2px 4px", fontSize: "16px", lineHeight: 1, fontFamily: "inherit" }}>
        ×
      </button>
    </div>
  )
}
