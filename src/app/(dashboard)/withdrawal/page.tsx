"use client"

import { useRouter } from "next/navigation"

const ACCENT = "#6bbfb8"

export default function WithdrawalPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 16px 32px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => router.push("/settings")}
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            borderRadius: "999px",
            padding: "9px 14px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: "18px",
          }}
        >
          Back to Profile
        </button>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "22px",
            padding: "28px 22px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "999px",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(107, 191, 184, 0.38)",
              background: "rgba(107, 191, 184, 0.12)",
              color: ACCENT,
              fontSize: "17px",
              fontWeight: 900,
            }}
          >
            FT
          </div>
          <div style={{ color: "var(--text)", fontSize: "26px", fontWeight: 900, marginBottom: "8px" }}>
            Coming soon
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.5 }}>
            FitToken withdrawals are not available yet. Your balance stays visible while the reward system is being prepared.
          </div>
        </div>
      </div>
    </div>
  )
}
