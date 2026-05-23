"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Building2, Dumbbell, Home } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

const ACCENT = "#6bbfb8"

type WorkoutEnvironment = "home_bodyweight" | "home_dumbbells" | "gym"

const ENV_OPTIONS: Array<{ id: WorkoutEnvironment; Icon: typeof Home; label: string; sub: string }> = [
  { id: "home_bodyweight", Icon: Home, label: "Home", sub: "Bodyweight" },
  { id: "home_dumbbells", Icon: Dumbbell, label: "+ DBs", sub: "Dumbbells" },
  { id: "gym", Icon: Building2, label: "Gym", sub: "Full kit" },
]

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "U"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function formatFT(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Small reusable pieces ─────────────────────────────────────

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="label-text" style={{ fontSize: 10, color: "var(--text-muted)", padding: "0 20px", marginTop: 26, marginBottom: 8 }}>
      {children}
    </div>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="ios-inset-grouped" style={{ margin: "0 16px", overflow: "hidden" }}>
      {children}
    </div>
  )
}

function Row({
  label, sublabel, right, onClick, divider = false,
}: {
  label: React.ReactNode
  sublabel?: string
  right?: React.ReactNode
  onClick?: () => void
  divider?: boolean
}) {
  const inner = (
    <div style={{
      padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 12,
      borderTop: divider ? "1px solid var(--border)" : "none",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{sublabel}</div>}
      </div>
      {right}
    </div>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={{ width: "100%", border: "none", background: "transparent", textAlign: "left", padding: 0, cursor: "pointer", display: "block" }}>
        {inner}
      </button>
    )
  }
  return inner
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 26, borderRadius: 13, background: on ? ACCENT : "var(--border)", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, transition: "transform 0.2s", transform: on ? "translateX(21px)" : "translateX(3px)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t, language, cycleLanguage } = useLanguage()

  const [isCalendarConnected, setIsCalendarConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [workoutEnvironment, setWorkoutEnvironment] = useState<WorkoutEnvironment>("gym")
  const [savingEnvironment, setSavingEnvironment] = useState(false)
  const [savingPerWeek, setSavingPerWeek] = useState(false)
  const [fitTokenBalance, setFitTokenBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Profile display — read from localStorage (set via /profile page)
  const [localName, setLocalName] = useState("")
  const [localPhoto, setLocalPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    setLocalName(localStorage.getItem("fitsched-display-name") || "")
    setLocalPhoto(localStorage.getItem("fitsched-profile-photo"))

    const handleProfileUpdate = () => {
      setLocalName(localStorage.getItem("fitsched-display-name") || "")
      setLocalPhoto(localStorage.getItem("fitsched-profile-photo"))
    }
    window.addEventListener("fitsched:profile-updated", handleProfileUpdate)
    return () => window.removeEventListener("fitsched:profile-updated", handleProfileUpdate)
  }, [])

  const checkCalendar = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/sync")
      if (res.ok) {
        const d = await res.json()
        setIsCalendarConnected(d.connected)
        if (d.lastSyncedAt) setLastSynced(d.lastSyncedAt)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    const load = async () => {
      setLoading(true)
      try {
        const [calRes, profileRes, tokensRes] = await Promise.all([
          fetch("/api/calendar/sync"),
          fetch("/api/onboarding"),
          fetch("/api/tokens"),
        ])
        if (calRes.ok) {
          const d = await calRes.json()
          setIsCalendarConnected(d.connected)
          if (d.lastSyncedAt) setLastSynced(d.lastSyncedAt)
        }
        if (profileRes.ok) {
          const p = await profileRes.json()
          if (p.workoutsPerWeek) setWorkoutsPerWeek(p.workoutsPerWeek)
          if (p.workoutEnvironment) setWorkoutEnvironment(p.workoutEnvironment)
        }
        if (tokensRes.ok) {
          const t = await tokensRes.json()
          setFitTokenBalance(t.balance || 0)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [status])

  const connectCalendar = async () => {
    setConnecting(true)
    try {
      const res = await fetch("/api/calendar/connect")
      if (res.ok) { const d = await res.json(); window.location.href = d.url }
    } catch {}
    setConnecting(false)
  }

  const syncCalendar = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" })
      if (res.ok) checkCalendar()
    } catch {}
    setSyncing(false)
  }

  const disconnectCalendar = async () => {
    try {
      const res = await fetch("/api/calendar/sync", { method: "DELETE" })
      if (res.ok) { setIsCalendarConnected(false); setLastSynced(null) }
    } catch {}
  }

  const saveWorkoutEnvironment = async (next: WorkoutEnvironment) => {
    const prev = workoutEnvironment
    setWorkoutEnvironment(next)
    setSavingEnvironment(true)
    try {
      const res = await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workoutEnvironment: next }) })
      if (!res.ok) setWorkoutEnvironment(prev)
    } catch { setWorkoutEnvironment(prev) }
    setSavingEnvironment(false)
  }

  const changeWorkoutsPerWeek = async (delta: number) => {
    const next = Math.max(1, Math.min(6, workoutsPerWeek + delta))
    if (next === workoutsPerWeek) return
    setWorkoutsPerWeek(next)
    setSavingPerWeek(true)
    try {
      await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workoutsPerWeek: next }) })
    } catch {}
    setSavingPerWeek(false)
  }

  const togglePush = async () => {
    if (!("Notification" in window)) return
    if (pushEnabled) { setPushEnabled(false); return }
    const perm = await Notification.requestPermission()
    if (perm === "granted") {
      setPushEnabled(true)
      try {
        const reg = await navigator.serviceWorker.register("/sw.js")
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "") })
        await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) })
      } catch {}
    }
  }

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return
    setDeleting(true)
    try {
      const res = await fetch("/api/account", { method: "DELETE" })
      if (res.ok) await signOut({ callbackUrl: "/register", redirect: true })
    } catch {}
    setDeleting(false)
  }

  const formatLastSync = (iso: string | null) => {
    if (!iso) return null
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins} min ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  const profileName = localName || session?.user?.name || t.user
  const profileEmail = session?.user?.email || ""
  const initials = getInitials(profileName, profileEmail)

  return (
    <div style={{ minHeight: "100vh", background: "transparent", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "18px 20px 6px" }}>
        <div className="brand-wordmark" style={{ fontSize: "22px", fontWeight: 950, color: "var(--text)", letterSpacing: "-0.3px" }}>
          <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {t.settings}
          </motion.span>
        </div>
      </div>

      {/* Profile card → /profile */}
      <div style={{ padding: "10px 16px 0" }}>
        <motion.button
          type="button"
          onClick={() => router.push("/profile")}
          whileTap={{ scale: 0.985 }}
          className="ios-inset-grouped"
          style={{ width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
        >
          {/* Avatar */}
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
            {localPhoto ? (
              <img src={localPhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, rgba(107,191,184,0.96), rgba(40,73,70,0.92))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800 }}>
                {initials}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{profileName}</div>
            {profileEmail.endsWith("@fitsched.guest") ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: 9, background: "rgba(107,191,184,0.18)", border: "1px solid rgba(107,191,184,0.3)", color: ACCENT, borderRadius: 999, padding: "2px 7px", fontWeight: 800, letterSpacing: "0.08em" }}>GUEST</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Temporary account</span>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileEmail}</div>
            )}
          </div>
          <Chevron />
        </motion.button>
      </div>

      {/* EARNINGS */}
      <SectionLabel>EARNINGS</SectionLabel>
      <SectionCard>
        <Row
          label="FitTokens balance"
          sublabel="Earned from workouts"
          right={
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? "—" : formatFT(fitTokenBalance)}
            </span>
          }
        />
        <Row
          divider
          label="Withdraw"
          onClick={() => router.push("/withdrawal")}
          right={<Chevron />}
        />
      </SectionCard>

      {/* CALENDAR */}
      <SectionLabel>CALENDAR</SectionLabel>
      <SectionCard>
        <Row
          label="Google Calendar"
          sublabel="Read-only · sync nightly"
          onClick={isCalendarConnected ? undefined : connectCalendar}
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: isCalendarConnected ? ACCENT : "var(--text-muted)", fontWeight: 700 }}>
                {connecting ? "Connecting…" : isCalendarConnected ? "On" : "Off"}
              </span>
              <Chevron />
            </div>
          }
        />
        {isCalendarConnected && (
          <Row
            divider
            label="Sync now"
            onClick={syncing ? undefined : syncCalendar}
            right={
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                {syncing ? "Syncing…" : lastSynced ? `Last ${formatLastSync(lastSynced)}` : "Tap to sync"}
              </span>
            }
          />
        )}
        {isCalendarConnected && (
          <Row
            divider
            label={<span style={{ color: "#d96060" }}>Disconnect</span>}
            onClick={disconnectCalendar}
          />
        )}
      </SectionCard>

      {/* WORKOUT SETUP */}
      <SectionLabel>WORKOUT SETUP</SectionLabel>
      <SectionCard>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {ENV_OPTIONS.map((opt) => {
              const selected = workoutEnvironment === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => saveWorkoutEnvironment(opt.id)}
                  disabled={savingEnvironment}
                  style={{
                    border: `1px solid ${selected ? "rgba(107,191,184,0.72)" : "var(--border)"}`,
                    background: selected ? "rgba(107,191,184,0.12)" : "var(--surface-2)",
                    color: selected ? ACCENT : "var(--text)",
                    borderRadius: 14, padding: "11px 8px",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 6, cursor: savingEnvironment ? "default" : "pointer",
                    minHeight: 80,
                  }}
                >
                  <opt.Icon size={18} strokeWidth={1.8} />
                  <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>{opt.label}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{opt.sub}</span>
                </button>
              )
            })}
          </div>
        </div>
        <Row
          divider
          label="Workouts per week"
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => changeWorkoutsPerWeek(-1)}
                disabled={workoutsPerWeek <= 1 || savingPerWeek}
                style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: workoutsPerWeek <= 1 ? 0.35 : 1 }}
              >
                −
              </button>
              <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", minWidth: 52, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                {workoutsPerWeek}× / wk
              </span>
              <button
                type="button"
                onClick={() => changeWorkoutsPerWeek(1)}
                disabled={workoutsPerWeek >= 6 || savingPerWeek}
                style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: workoutsPerWeek >= 6 ? 0.35 : 1 }}
              >
                +
              </button>
            </div>
          }
        />
      </SectionCard>

      {/* PREFERENCES */}
      <SectionLabel>PREFERENCES</SectionLabel>
      <SectionCard>
        <Row
          label="Notifications"
          sublabel={pushEnabled ? "Enabled" : t.workoutReminders}
          right={<Toggle on={pushEnabled} onToggle={togglePush} />}
        />
        <Row
          divider
          label="Language"
          right={
            <motion.button
              onClick={cycleLanguage}
              whileTap={{ scale: 0.9 }}
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "5px 13px", color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 44, textAlign: "center" }}
            >
              <motion.span key={language} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                {language}
              </motion.span>
            </motion.button>
          }
        />
        <Row
          divider
          label="Version"
          right={<span style={{ fontSize: 13, color: "var(--text-muted)" }}>1.0.0</span>}
        />
      </SectionCard>

      {/* Guest sign-up prompt */}
      {profileEmail.endsWith("@fitsched.guest") && (
        <div style={{ padding: "20px 16px 0" }}>
          <div style={{ background: "rgba(107,191,184,0.08)", border: "1px solid rgba(107,191,184,0.25)", borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>Your progress is temporary</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 12 }}>
              Guest accounts are not saved. Create a free account to keep your streak, workouts, and FitTokens.
            </div>
            <button
              onClick={async () => { await signOut({ redirect: false }); router.push("/register") }}
              style={{ width: "100%", background: ACCENT, border: "none", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 800, color: "#0d1f1e", cursor: "pointer" }}
            >
              Create a free account
            </button>
          </div>
        </div>
      )}

      {/* Sign out + delete */}
      <div style={{ padding: "20px 16px 0" }}>
        <button
          onClick={async () => signOut({ callbackUrl: "/register", redirect: true })}
          style={{ width: "100%", background: "rgba(255,50,50,0.09)", border: "1px solid rgba(255,50,50,0.22)", borderRadius: 14, padding: 13, color: "#d96060", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {t.signOut}
        </button>
        <button
          onClick={() => { setShowDeleteModal(true); setDeleteConfirm("") }}
          style={{ width: "100%", marginTop: 10, background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", padding: "10px", textDecoration: "underline", textDecorationColor: "var(--border)" }}
        >
          Delete account
        </button>
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          FitSched v1.0.0
        </div>
      </div>

      {/* Delete account modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 32px" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              style={{ width: "100%", maxWidth: 480, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 24, padding: "28px 24px 32px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}
            >
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(220,50,50,0.12)", border: "1px solid rgba(220,50,50,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d96060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </div>
              <div className="display-text" style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Delete your account?</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 20 }}>
                This permanently deletes your profile, workout history, streak, and FitTokens. There is no undo.
              </p>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Type <span style={{ color: "#d96060", fontFamily: "monospace" }}>DELETE</span> to confirm
              </div>
              <input
                autoFocus value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE"
                style={{ width: "100%", boxSizing: "border-box", background: "var(--surface-2)", border: `1px solid ${deleteConfirm === "DELETE" ? "rgba(220,50,50,0.6)" : "var(--border)"}`, borderRadius: 12, padding: "13px 14px", color: "var(--text)", fontSize: 14, outline: "none", marginBottom: 20, fontFamily: "monospace", transition: "border-color 0.2s" }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: 13, borderRadius: 14, fontSize: 14, fontWeight: 600, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }}>Cancel</button>
                <button
                  onClick={deleteAccount} disabled={deleteConfirm !== "DELETE" || deleting}
                  style={{ flex: 1, padding: 13, borderRadius: 14, fontSize: 14, fontWeight: 700, background: deleteConfirm === "DELETE" ? "rgba(220,50,50,0.88)" : "rgba(220,50,50,0.25)", border: "none", color: "#fff", cursor: deleteConfirm === "DELETE" ? "pointer" : "default", transition: "background 0.2s", opacity: deleting ? 0.6 : 1 }}
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
