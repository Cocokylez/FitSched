"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { AuthTopControls } from "@/components/AuthTopControls"
import Link from "next/link"

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

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
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const d = await res.json().catch(() => ({}))
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ minHeight: "36vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}
      >
        <div className="brand-wordmark" style={{ fontSize: "34px", fontWeight: 900, color: "var(--text)" }}>FitSched</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>Password recovery</div>
      </motion.div>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "28px", padding: "32px 24px 40px", position: "relative", zIndex: 2, margin: "-28px auto 0", width: "100%", maxWidth: "480px", boxShadow: "var(--shadow-lg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
      >
        <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}>

          {sent ? (
            <>
              <motion.div variants={fadeIn}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#6bbfb8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Check your email</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 28 }}>
                  If <strong style={{ color: "var(--text)" }}>{email}</strong> has a FitSched account, you'll receive a reset link shortly. The link expires in 1 hour.
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: 20 }}>
                  Didn't get it? Check your spam folder or{" "}
                  <span style={{ color: "var(--text)", fontWeight: 600, cursor: "pointer" }} onClick={() => setSent(false)}>try again</span>.
                </div>
              </motion.div>
              <motion.div variants={fadeIn}>
                <button
                  onClick={() => router.push("/login")}
                  style={{ width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "16px", padding: "15px", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}
                >
                  Back to sign in
                </button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div variants={fadeIn}>
                <div className="display-text" style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>Forgot password?</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: 24 }}>Enter your email and we'll send you a reset link.</div>
              </motion.div>

              <form onSubmit={handleSubmit}>
                {error && (
                  <motion.div variants={fadeIn}>
                    <div style={{ background: "var(--surface-2)", border: "1px solid #ff4444", borderRadius: "10px", padding: "12px 16px", color: "#ff6666", fontSize: "13px", marginBottom: "16px" }}>
                      {error}
                    </div>
                  </motion.div>
                )}

                <motion.div variants={fadeIn}>
                  <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "6px" }}>EMAIL</div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 16px", color: "var(--text)", fontSize: "14px", outline: "none", width: "100%", marginBottom: "24px", boxSizing: "border-box" as const }}
                  />
                </motion.div>

                <motion.div variants={fadeIn}>
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    style={{ width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "16px", padding: "15px", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "20px", opacity: loading || !email.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  >
                    {loading ? (
                      <><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.15)", borderTopColor: "var(--bg)", animation: "spin 0.6s linear infinite", display: "inline-block" }} />Sending…</>
                    ) : "Send reset link"}
                  </button>
                </motion.div>
              </form>

              <motion.div variants={fadeIn}>
                <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                  Remember it?{" "}
                  <Link href="/login" style={{ color: "var(--text)", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
                </p>
              </motion.div>
            </>
          )}
        </motion.div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
