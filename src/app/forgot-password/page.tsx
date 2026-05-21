"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    setLoading(false)
    if (res.ok) {
      setSent(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Something went wrong")
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: ["linear-gradient(180deg, rgba(107,191,184,0.12) 0%, transparent 38vh)", "radial-gradient(circle at 18% -8rem, rgba(107,191,184,0.18), transparent 28rem)", "var(--bg)"].join(", "),
      display: "flex", flexDirection: "column",
      padding: "0 16px 40px",
    }}>
      <div style={{ padding: "20px 0 0" }}>
        <button onClick={() => router.push("/register")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: 0 }}>
          <ArrowLeft size={15} strokeWidth={2} /> Back
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: "400px", margin: "0 auto", width: "100%" }}>
        {sent ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6bbfb8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Check your email</div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 28 }}>
              If <strong style={{ color: "var(--text)" }}>{email}</strong> has a FitSched account, we&apos;ve sent a reset link. It expires in 1 hour.
            </p>
            <button onClick={() => router.push("/register")} style={{ background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "14px", padding: "13px", width: "100%", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
              Back to sign in
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Forgot password?</div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 28 }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: "var(--surface-2)", border: "1px solid #ff4444", borderRadius: "10px", padding: "12px 16px", color: "#ff6666", fontSize: "13px", marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Email</div>
              <input
                type="email" required autoCapitalize="none" autoCorrect="off"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: "100%", boxSizing: "border-box", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", color: "var(--text)", fontSize: "14px", outline: "none", marginBottom: 20 }}
              />
              <button type="submit" disabled={loading} style={{ width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "14px", padding: "14px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.55 : 1 }}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  )
}
