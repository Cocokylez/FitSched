"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { AuthTopControls } from "@/components/AuthTopControls"
import Link from "next/link"

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""

  const [status, setStatus] = useState<"loading" | "success" | "expired" | "invalid" | "error">("loading")
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!token) { setStatus("invalid"); return }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async res => {
        if (res.ok) { setStatus("success"); return }
        const d = await res.json().catch(() => ({}))
        if (res.status === 410) {
          setStatus(d.error?.includes("expired") ? "expired" : "invalid")
        } else {
          setStatus("error")
        }
      })
      .catch(() => setStatus("error"))
  }, [token])

  const handleResend = async () => {
    setResending(true)
    try {
      await fetch("/api/auth/send-verification", { method: "POST" })
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: ["linear-gradient(180deg, rgba(18,101,254,0.12) 0%, transparent 38vh)", "radial-gradient(circle at 18% -8rem, rgba(18,101,254,0.18), transparent 28rem)", "radial-gradient(circle at 88% 65%, rgba(18,101,254,0.07), transparent 22rem)", "var(--bg)"].join(", "), display: "flex", flexDirection: "column", position: "relative", padding: "0 16px 24px" }}>
      <AuthTopControls />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        style={{ minHeight: "36vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div className="brand-wordmark" style={{ fontSize: "34px", fontWeight: 900, color: "var(--text)" }}>FitSched</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>Email verification</div>
      </motion.div>

      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "28px", padding: "32px 24px 40px", position: "relative", zIndex: 2, margin: "-28px auto 0", width: "100%", maxWidth: "480px", boxShadow: "var(--shadow-lg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
        <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}>

          {status === "loading" && (
            <motion.div variants={fadeIn} style={{ textAlign: "center", padding: "24px 0" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
              <div style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: 16 }}>Verifying your email…</div>
            </motion.div>
          )}

          {status === "success" && (
            <>
              <motion.div variants={fadeIn}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(18,101,254,0.12)", border: "1px solid rgba(18,101,254,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1265fe" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Email verified!</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 28 }}>Your email address has been confirmed. You&apos;re all set.</div>
              </motion.div>
              <motion.div variants={fadeIn}>
                <Link href="/schedule" style={{ display: "block", width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "16px", padding: "15px", fontSize: "15px", fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
                  Go to dashboard
                </Link>
              </motion.div>
            </>
          )}

          {status === "expired" && (
            <>
              <motion.div variants={fadeIn}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ff6666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Link expired</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 28 }}>This verification link has expired. Links are valid for 24 hours — request a new one below.</div>
              </motion.div>
              <motion.div variants={fadeIn}>
                {resent ? (
                  <div style={{ background: "rgba(18,101,254,0.08)", border: "1px solid rgba(18,101,254,0.25)", borderRadius: 12, padding: "14px 16px", color: "#1265fe", fontSize: "13px", textAlign: "center" }}>
                    New verification email sent. Check your inbox.
                  </div>
                ) : (
                  <button onClick={handleResend} disabled={resending}
                    style={{ width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "16px", padding: "15px", fontSize: "15px", fontWeight: 700, cursor: resending ? "default" : "pointer", opacity: resending ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {resending ? (<><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.15)", borderTopColor: "var(--bg)", animation: "spin 0.6s linear infinite", display: "inline-block" }} />Sending…</>) : "Resend verification email"}
                  </button>
                )}
              </motion.div>
            </>
          )}

          {(status === "invalid" || status === "error") && (
            <>
              <motion.div variants={fadeIn}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ff6666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                </div>
                <div className="display-text" style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Invalid link</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 28 }}>This verification link is invalid or has already been used.</div>
              </motion.div>
              <motion.div variants={fadeIn}>
                <Link href="/schedule" style={{ display: "block", width: "100%", background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "16px", padding: "15px", fontSize: "15px", fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
                  Go to dashboard
                </Link>
              </motion.div>
            </>
          )}

        </motion.div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
