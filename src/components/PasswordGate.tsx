"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, X, Eye, EyeOff } from "lucide-react"

type Mode = "loading" | "verify" | "set"

interface Props {
  /** Whether the gate is currently shown. */
  open: boolean
  /** Called when the user dismisses without unlocking. */
  onClose: () => void
  /**
   * Called once the user successfully verifies or sets a password. The plaintext
   * password is passed through so the caller can forward it to a server action
   * that re-verifies it (e.g. changing the payout wallet). Callers that don't
   * need it can ignore the argument.
   */
  onSuccess: (password?: string) => void
  /** Short label shown in the modal header, e.g. "withdraw FIT" or "edit profile". */
  actionLabel: string
}

// Modal that gates a sensitive action behind a password check. Fetches
// /api/auth/password-status to decide whether the user needs to verify an
// existing password or set their first one (Google-only signups).
export function PasswordGate({ open, onClose, onSuccess, actionLabel }: Props) {
  const [mode, setMode]               = useState<Mode>("loading")
  const [password, setPassword]       = useState("")
  const [confirmPwd, setConfirmPwd]   = useState("")
  const [showPwd, setShowPwd]         = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Whenever the gate is opened, fetch fresh status + reset local state.
  useEffect(() => {
    if (!open) return
    setPassword("")
    setConfirmPwd("")
    setShowPwd(false)
    setError(null)
    setSubmitting(false)
    setMode("loading")

    let cancelled = false
    fetch("/api/auth/password-status")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => {
        if (cancelled) return
        setMode(d.hasPassword ? "verify" : "set")
      })
      .catch(() => {
        if (cancelled) return
        setError("Couldn't load password status. Try again.")
        setMode("verify")
      })

    return () => { cancelled = true }
  }, [open])

  const handleSubmit = async () => {
    if (submitting) return
    setError(null)

    if (mode === "verify") {
      if (!password) { setError("Enter your password"); return }
      setSubmitting(true)
      try {
        const res = await fetch("/api/auth/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        })
        if (res.ok) { onSuccess(password); return }
        if (res.status === 409) {
          // user lost password between status check and submit — switch flows
          setMode("set")
          setPassword("")
          setError("Set an initial password to continue.")
          return
        }
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Incorrect password")
      } catch {
        setError("Network error. Try again.")
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (mode === "set") {
      if (password.length < 8) { setError("Password must be at least 8 characters"); return }
      if (password !== confirmPwd) { setError("Passwords don't match"); return }
      setSubmitting(true)
      try {
        const res = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        })
        if (res.ok) { onSuccess(password); return }
        const data = await res.json().catch(() => ({}))
        if (data?.code === "PASSWORD_EXISTS") {
          setMode("verify")
          setPassword("")
          setError("You already have a password. Enter it to continue.")
          return
        }
        setError(data?.error || "Couldn't save password")
      } catch {
        setError("Network error. Try again.")
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.62)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{
              width: "100%", maxWidth: 360,
              background: "var(--panel)", border: "1px solid var(--border)",
              borderRadius: 22, padding: "22px 22px 18px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              display: "flex", flexDirection: "column", gap: 14,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Lock size={15} strokeWidth={2} color="var(--text)" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>
                    {mode === "set" ? "Create password" : "Confirm password"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Required to {actionLabel}
                  </div>
                </div>
              </div>
              <button onClick={onClose} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", padding: 4, display: "flex",
              }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            {mode === "loading" ? (
              <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: "2px solid var(--border)", borderTopColor: "var(--text)",
                  animation: "spin 0.8s linear infinite",
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <>
                {mode === "set" && (
                  <div style={{
                    fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5,
                    padding: "10px 12px", background: "var(--surface-2)",
                    border: "1px solid var(--border)", borderRadius: 10,
                  }}>
                    You signed in with Google — set a password to protect sensitive actions like withdrawals and profile changes.
                  </div>
                )}

                <PasswordField
                  value={password}
                  onChange={setPassword}
                  show={showPwd}
                  toggleShow={() => setShowPwd((s) => !s)}
                  placeholder={mode === "set" ? "New password (8+ characters)" : "Your password"}
                  autoFocus
                  onSubmit={handleSubmit}
                />

                {mode === "set" && (
                  <PasswordField
                    value={confirmPwd}
                    onChange={setConfirmPwd}
                    show={showPwd}
                    toggleShow={() => setShowPwd((s) => !s)}
                    placeholder="Confirm password"
                    onSubmit={handleSubmit}
                  />
                )}

                {error && (
                  <div style={{
                    fontSize: 12, color: "#f87171", fontWeight: 600,
                    padding: "8px 12px", background: "rgba(239,68,68,0.10)",
                    border: "1px solid rgba(239,68,68,0.22)", borderRadius: 10,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    border: "none", borderRadius: 12, padding: "12px",
                    background: "var(--text)", color: "var(--bg)",
                    fontSize: 14, fontWeight: 800, cursor: submitting ? "default" : "pointer",
                    opacity: submitting ? 0.6 : 1, fontFamily: "inherit",
                  }}
                >
                  {submitting
                    ? (mode === "set" ? "Saving…" : "Verifying…")
                    : (mode === "set" ? "Save password" : "Unlock")}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PasswordField({
  value, onChange, show, toggleShow, placeholder, autoFocus, onSubmit,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  toggleShow: () => void
  placeholder: string
  autoFocus?: boolean
  onSubmit: () => void
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSubmit() }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="current-password"
        style={{
          width: "100%", boxSizing: "border-box",
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "11px 40px 11px 13px",
          fontSize: 14, color: "var(--text)", fontFamily: "inherit",
          outline: "none",
        }}
      />
      <button
        type="button"
        onClick={toggleShow}
        style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: 6, display: "flex",
        }}
      >
        {show ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
      </button>
    </div>
  )
}
