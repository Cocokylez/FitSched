"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirm) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    setLoading(true)

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })

    setLoading(false)
    if (res.ok) {
      setDone(true)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Something went wrong")
    }
  }

  if (!token) {
    return (
      <div style={{ textAlign: "center" }}>
        <div className="display-text" style={{ fontSize: "20px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Invalid link</div>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: 24 }}>This reset link is invalid or has expired.</p>
        <button onClick={() => router.push("/forgot-password")} style={{ background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "14px", padding: "13px 28px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
          Request new link
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6bbfb8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Password updated</div>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: 28 }}>Your password has been changed. You can now sign in.</p>
        <button onClick={() => router.push("/register")} style={{ background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "14px", padding: "13px 28px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
          Sign in
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>New password</div>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: "var(--surface-2)", border: "1px solid #ff4444", borderRadius: "10px", padding: "12px 16px", color: "#ff6666", fontSize: "13px", marginBottom: 16 }}>
            {error}
          </div>
        )}
        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>New password</div>
        <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
          style={{ width: "100%", boxSizing: "border-box", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", color: "var(--text)", fontSize: "14px", outline: "none", marginBottom: 16 }} />
        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Confirm password</div>
        <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
          style={{ width: "100%", boxSizing: "border-box", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", color: "var(--text)", fontSize: "14px", outline: "none", marginBottom: 24 }} />
        <button type="submit" disabled={loading} style={{ width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "14px", padding: "14px", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.55 : 1 }}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </motion.div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: ["linear-gradient(180deg, rgba(107,191,184,0.12) 0%, transparent 38vh)", "radial-gradient(circle at 18% -8rem, rgba(107,191,184,0.18), transparent 28rem)", "var(--bg)"].join(", "),
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 16px 40px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
