"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { AuthTopControls } from "@/components/AuthTopControls"
import Link from "next/link"

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

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
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirm) { setError("Passwords don't match."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setDone(true)
      } else {
        setError(d.error || "Something went wrong. Please try again.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: ["linear-gradient(180deg, rgba(107,191,184,0.12) 0%, transparent 38vh)", "radial-gradient(circle at 18% -8rem, rgba(107,191,184,0.18), transparent 28rem)", "radial-gradient(circle at 88% 65%, rgba(107,191,184,0.07), transparent 22rem)", "var(--bg)"].join(", "), display: "flex", flexDirection: "column", position: "relative", padding: "0 16px 24px" }}>
      <AuthTopControls />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        style={{ minHeight: "36vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div className="brand-wordmark" style={{ fontSize: "34px", fontWeight: 900, color: "var(--text)" }}>FitSched</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>Set a new password</div>
      </motion.div>

      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "28px", padding: "32px 24px 40px", position: "relative", zIndex: 2, margin: "-28px auto 0", width: "100%", maxWidth: "480px", boxShadow: "var(--shadow-lg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}>

          {done ? (
            <>
              <motion.div variants={fadeIn}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#6bbfb8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Password updated!</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 28 }}>Your password has been changed. Sign in with your new password.</div>
              </motion.div>
              <motion.div variants={fadeIn}>
                <button onClick={() => router.push("/login")} style={{ width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "16px", padding: "15px", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>
                  Sign in
                </button>
              </motion.div>
            </>
          ) : !token ? (
            <>
              <motion.div variants={fadeIn}>
                <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Invalid link</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 24 }}>This reset link is invalid or has expired.</div>
              </motion.div>
              <motion.div variants={fadeIn}>
                <button onClick={() => router.push("/forgot-password")} style={{ width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "16px", padding: "15px", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>
                  Request a new link
                </button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div variants={fadeIn}>
                <div className="display-text" style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>New password</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: 24 }}>Choose a strong password — at least 8 characters.</div>
              </motion.div>

              <form onSubmit={handleSubmit}>
                {error && (
                  <motion.div variants={fadeIn}>
                    <div style={{ background: "var(--surface-2)", border: "1px solid #ff4444", borderRadius: "10px", padding: "12px 16px", color: "#ff6666", fontSize: "13px", marginBottom: 16 }}>
                      {error}{" "}
                      {(error.includes("expired") || error.includes("used")) && (
                        <Link href="/forgot-password" style={{ color: "#ff9999", fontWeight: 700 }}>Request a new link</Link>
                      )}
                    </div>
                  </motion.div>
                )}

                <motion.div variants={fadeIn}>
                  <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 6 }}>NEW PASSWORD</div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", color: "var(--text)", fontSize: "14px", outline: "none", width: "100%", marginBottom: 16, boxSizing: "border-box" as const }} />
                </motion.div>

                <motion.div variants={fadeIn}>
                  <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: 6 }}>CONFIRM PASSWORD</div>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", color: "var(--text)", fontSize: "14px", outline: "none", width: "100%", marginBottom: 24, boxSizing: "border-box" as const }} />
                </motion.div>

                <motion.div variants={fadeIn}>
                  <button type="submit" disabled={loading || !password || !confirm}
                    style={{ width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "16px", padding: "15px", fontSize: "15px", fontWeight: 700, cursor: "pointer", opacity: loading || !password || !confirm ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {loading ? (<><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.15)", borderTopColor: "var(--bg)", animation: "spin 0.6s linear infinite", display: "inline-block" }} />Updating…</>) : "Update password"}
                  </button>
                </motion.div>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
