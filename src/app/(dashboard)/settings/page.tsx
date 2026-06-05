"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Activity, Building2, Dumbbell, Flame, Home, Zap } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"
import { ACCENT } from "@/lib/theme"
import { formatFT, kgToLbs, lbsToKg } from "@/lib/formatUtils"
import { PasswordGate } from "@/components/PasswordGate"

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

function Skeleton({ width, height = 14, radius = 7 }: { width: number | string; height?: number; radius?: number }) {
  return (
    <motion.div
      animate={{ opacity: [0.35, 0.65, 0.35] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      style={{ width, height, borderRadius: radius, background: "var(--border)", flexShrink: 0 }}
    />
  )
}

function Toggle({ on, onToggle, loading }: { on: boolean; onToggle: () => void; loading?: boolean }) {
  return (
    <div
      onClick={loading ? undefined : onToggle}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: on ? ACCENT : "var(--border)",
        position: "relative",
        cursor: loading ? "default" : "pointer",
        flexShrink: 0,
        transition: "background 0.2s, opacity 0.2s",
        opacity: loading ? 0.55 : 1,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, transition: "transform 0.2s",
        transform: on ? "translateX(21px)" : "translateX(3px)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t, language, cycleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const [isCalendarConnected, setIsCalendarConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [pushEnabled, setPushEnabled]   = useState(false)
  const [pushLoading, setPushLoading]   = useState(false)
  const [pushError, setPushError]       = useState<string | null>(null)
  const [pushTesting, setPushTesting]   = useState(false)
  const [pushTestMsg, setPushTestMsg]   = useState<string | null>(null)
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [workoutEnvironment, setWorkoutEnvironment] = useState<WorkoutEnvironment>("gym")
  const [savingEnvironment, setSavingEnvironment] = useState(false)
  const [savingPerWeek, setSavingPerWeek] = useState(false)
  const [fitnessGoal, setFitnessGoal] = useState("stay_active")
  const [experienceLevel, setExperienceLevel] = useState("intermediate")
  const [savingGoal, setSavingGoal] = useState(false)
  const [savingLevel, setSavingLevel] = useState(false)
  // Track which fields the user has already changed so the initial page-load
  // response can't race and overwrite them if it arrives late.
  const userModifiedRef = useRef(new Set<string>())
  const [fitTokenBalance, setFitTokenBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [weightKg, setWeightKg] = useState<number | null>(null)
  const [heightInput, setHeightInput] = useState("")
  const [weightInput, setWeightInput] = useState("")
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg")
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
          const mod = userModifiedRef.current
          if (p.workoutsPerWeek && !mod.has("workoutsPerWeek")) setWorkoutsPerWeek(p.workoutsPerWeek)
          if (p.workoutEnvironment && !mod.has("workoutEnvironment")) setWorkoutEnvironment(p.workoutEnvironment)
          if (p.fitnessGoal && !mod.has("fitnessGoal")) setFitnessGoal(p.fitnessGoal)
          if (p.experienceLevel && !mod.has("experienceLevel")) setExperienceLevel(p.experienceLevel)
          if (p.heightCm && !mod.has("heightCm")) { setHeightCm(p.heightCm); setHeightInput(String(p.heightCm)) }
          if (p.weightKg && !mod.has("weightKg")) {
            setWeightKg(p.weightKg)
            const savedUnit = localStorage.getItem("fitsched-weight-unit") === "lbs" ? "lbs" : "kg"
            setWeightUnit(savedUnit)
            setWeightInput(String(savedUnit === "lbs" ? kgToLbs(p.weightKg) : p.weightKg))
          }
        }
        if (tokensRes.ok) {
          const t = await tokensRes.json()
          setFitTokenBalance(t.balance || 0)
        }

        // Sync the toggle with the real browser permission + active subscription
        if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
          if (Notification.permission === "granted") {
            try {
              const reg = await navigator.serviceWorker.ready
              const sub = await reg.pushManager.getSubscription()
              if (sub) setPushEnabled(true)
            } catch {}
          }
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

  // ── Password gates ──────────────────────────────────────────────────────────
  // Profile edits and account deletion are sensitive — gate both behind a
  // password check. Strict mode: every save re-prompts. No session unlock.
  const [profileGateOpen, setProfileGateOpen] = useState(false)
  const pendingProfileAction = useRef<(() => void) | null>(null)

  const withProfileGate = (action: () => void) => {
    pendingProfileAction.current = action
    setProfileGateOpen(true)
  }

  const [deleteGateOpen, setDeleteGateOpen] = useState(false)

  // Success toast — flashes a brief "Profile updated" confirmation after each
  // successful profile save. Auto-dismisses after 1.8s.
  const [profileToast, setProfileToast] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showProfileSavedToast = useCallback(() => {
    setProfileToast(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setProfileToast(false), 1800)
  }, [])

  const saveWorkoutEnvironment = async (next: WorkoutEnvironment) => {
    return withProfileGate(() => doSaveWorkoutEnvironment(next))
  }
  const doSaveWorkoutEnvironment = async (next: WorkoutEnvironment) => {
    userModifiedRef.current.add("workoutEnvironment")
    const prev = workoutEnvironment
    setWorkoutEnvironment(next)
    setSavingEnvironment(true)
    try {
      const res = await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workoutEnvironment: next }) })
      if (!res.ok) { setWorkoutEnvironment(prev); userModifiedRef.current.delete("workoutEnvironment") }
      else { showProfileSavedToast() }
    } catch { setWorkoutEnvironment(prev); userModifiedRef.current.delete("workoutEnvironment") }
    setSavingEnvironment(false)
  }

  const changeWorkoutsPerWeek = async (delta: number) => {
    return withProfileGate(() => doChangeWorkoutsPerWeek(delta))
  }
  const doChangeWorkoutsPerWeek = async (delta: number) => {
    const next = Math.max(1, Math.min(6, workoutsPerWeek + delta))
    if (next === workoutsPerWeek) return
    userModifiedRef.current.add("workoutsPerWeek")
    const prev = workoutsPerWeek
    setWorkoutsPerWeek(next)
    setSavingPerWeek(true)
    try {
      const res = await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workoutsPerWeek: next }) })
      if (!res.ok) { setWorkoutsPerWeek(prev); userModifiedRef.current.delete("workoutsPerWeek") }
      else { showProfileSavedToast() }
    } catch { setWorkoutsPerWeek(prev); userModifiedRef.current.delete("workoutsPerWeek") }
    setSavingPerWeek(false)
  }

  const saveFitnessGoal = async (next: string) => {
    return withProfileGate(() => doSaveFitnessGoal(next))
  }
  const doSaveFitnessGoal = async (next: string) => {
    userModifiedRef.current.add("fitnessGoal")
    const prev = fitnessGoal
    setFitnessGoal(next)
    setSavingGoal(true)
    try {
      const res = await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fitnessGoal: next }) })
      if (!res.ok) { setFitnessGoal(prev); userModifiedRef.current.delete("fitnessGoal") }
      else { showProfileSavedToast() }
    } catch { setFitnessGoal(prev); userModifiedRef.current.delete("fitnessGoal") }
    setSavingGoal(false)
  }

  const saveExperienceLevel = async (next: string) => {
    return withProfileGate(() => doSaveExperienceLevel(next))
  }
  const doSaveExperienceLevel = async (next: string) => {
    userModifiedRef.current.add("experienceLevel")
    const prev = experienceLevel
    setExperienceLevel(next)
    setSavingLevel(true)
    try {
      const res = await fetch("/api/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ experienceLevel: next }) })
      if (!res.ok) { setExperienceLevel(prev); userModifiedRef.current.delete("experienceLevel") }
      else { showProfileSavedToast() }
    } catch { setExperienceLevel(prev); userModifiedRef.current.delete("experienceLevel") }
    setSavingLevel(false)
  }

  const saveBodyStat = async (field: "heightCm" | "weightKg", rawValue: string) => {
    return withProfileGate(() => doSaveBodyStat(field, rawValue))
  }
  const doSaveBodyStat = async (field: "heightCm" | "weightKg", rawValue: string) => {
    const num = parseFloat(rawValue.replace(",", "."))
    if (!isFinite(num) || num <= 0) return
    const dbValue = field === "weightKg" && weightUnit === "lbs" ? lbsToKg(num) : num
    userModifiedRef.current.add(field)
    const prevHeight = heightCm
    const prevWeight = weightKg
    if (field === "heightCm") setHeightCm(num)
    if (field === "weightKg") setWeightKg(dbValue)
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: dbValue }),
      })
      if (!res.ok) {
        if (field === "heightCm") setHeightCm(prevHeight)
        if (field === "weightKg") setWeightKg(prevWeight)
        userModifiedRef.current.delete(field)
      } else {
        showProfileSavedToast()
      }
    } catch {
      if (field === "heightCm") setHeightCm(prevHeight)
      if (field === "weightKg") setWeightKg(prevWeight)
      userModifiedRef.current.delete(field)
    }
  }

  const togglePush = async () => {
    if (pushLoading) return
    setPushError(null)

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushError("Push notifications aren't supported in this browser.")
      return
    }

    if (pushEnabled) {
      // Flip immediately — user sees feedback right away
      setPushEnabled(false)
      setPushLoading(true)
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          }).catch(() => {})
          await sub.unsubscribe()
        }
      } catch {}
      setPushLoading(false)
      return
    }

    // ── ENABLE ───────────────────────────────────────────────────────────────
    // Check permission BEFORE optimistic flip so the toggle doesn't flicker
    // back if the browser already has it blocked.
    const currentPerm = Notification.permission

    if (currentPerm === "denied") {
      setPushError("Notifications are blocked. Open your browser / OS settings and allow them for this site.")
      return   // ← don't flip — user needs to change settings first
    }

    // Flip now; we're confident we can at least ask for permission
    setPushEnabled(true)
    setPushLoading(true)

    try {
      let perm: NotificationPermission = currentPerm
      if (perm === "default") {
        perm = await Notification.requestPermission()
      }
      if (perm !== "granted") {
        // User dismissed the dialog
        setPushEnabled(false)
        setPushLoading(false)
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        throw new Error("VAPID key not configured")
      }

      const reg = await navigator.serviceWorker.register("/sw.js")
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      })
      // The subscription only counts if the SERVER actually stored it. Without
      // this check the toggle would show "Enabled" even when nothing was saved,
      // so no notification could ever be delivered.
      if (!res.ok) throw new Error("subscribe-failed")
    } catch (err) {
      setPushEnabled(false)
      const msg = err instanceof Error ? err.message : ""
      setPushError(
        msg === "VAPID key not configured"
          ? "Push notifications aren't set up yet."
          : msg === "subscribe-failed"
          ? "Couldn't save your subscription. Please try again."
          : "Couldn't enable notifications — try again."
      )
    }
    setPushLoading(false)
  }

  // Fires a real push to this user's stored subscriptions so the whole pipeline
  // can be verified on demand — the response tells us exactly where it breaks
  // (no subscription stored, server not configured, or delivery rejected).
  const sendTestPush = async () => {
    setPushTesting(true)
    setPushTestMsg(null)
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "FitSched test ✅",
          body: "Notifications are working on this device.",
        }),
      })
      const data = await res.json().catch(() => ({} as { sent?: number; error?: string }))
      if (res.ok && (data.sent ?? 0) > 0) {
        setPushTestMsg("Sent — check your device's notifications.")
      } else if (res.ok) {
        setPushTestMsg("No active subscription on this device. Toggle notifications off, then on again.")
      } else if (data.error === "Push not configured") {
        setPushTestMsg("The server isn't set up for push yet (missing VAPID keys).")
      } else if (res.status === 500) {
        setPushTestMsg("Delivery was rejected — your subscription may be stale. Toggle off and on again.")
      } else {
        setPushTestMsg(data.error || "Couldn't send a test notification.")
      }
    } catch {
      setPushTestMsg("Couldn't reach the server.")
    }
    setPushTesting(false)
  }

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return
    // Open the password gate before firing the destructive API call.
    // doDeleteAccount runs from the gate's onSuccess.
    setDeleteGateOpen(true)
  }
  const doDeleteAccount = async () => {
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
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={localPhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, rgba(18,101,254,0.96), rgba(40,73,70,0.92))", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800 }}>
                {initials}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            {loading
              ? <Skeleton width={130} height={16} />
              : <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{profileName}</div>}
            {loading
              ? <div style={{ marginTop: 5 }}><Skeleton width={170} height={11} /></div>
              : profileEmail.endsWith("@fitsched.guest") ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{ fontSize: 9, background: "rgba(18,101,254,0.18)", border: "1px solid rgba(18,101,254,0.3)", color: ACCENT, borderRadius: 999, padding: "2px 7px", fontWeight: 800, letterSpacing: "0.08em" }}>GUEST</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.temporaryAccount}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileEmail}</div>
                )}
          </div>
          <Chevron />
        </motion.button>
      </div>

      {/* EARNINGS */}
      <SectionLabel>{t.earnings}</SectionLabel>
      <SectionCard>
        <Row
          label="FitTokens balance"
          sublabel="Earned from workouts"
          right={
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
              {loading ? <Skeleton width={48} height={16} radius={5} /> : formatFT(fitTokenBalance)}
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

      {/* FITNESS PROFILE */}
      <SectionLabel>{t.fitnessProfile}</SectionLabel>
      <SectionCard>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t.goalLabel}</div>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {[0,1,2,3].map(i => <Skeleton key={i} width="100%" height={44} radius={12} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {([
                { id: "lose_weight",       label: "Lose Weight", Icon: Flame,    color: "#f97316" },
                { id: "build_muscle",      label: "Build Muscle", Icon: Dumbbell, color: ACCENT   },
                { id: "stay_active",       label: "Stay Active",  Icon: Activity, color: "#60a5fa" },
                { id: "improve_endurance", label: "Endurance",    Icon: Zap,      color: "#eab308" },
              ] as const).map((opt) => {
                const selected = fitnessGoal === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => saveFitnessGoal(opt.id)}
                    disabled={savingGoal}
                    style={{
                      border: `1px solid ${selected ? "rgba(18,101,254,0.72)" : "var(--border)"}`,
                      background: selected ? "rgba(18,101,254,0.12)" : "var(--surface-2)",
                      color: selected ? ACCENT : "var(--text)",
                      borderRadius: 12, padding: "10px 8px",
                      display: "flex", alignItems: "center", gap: 7,
                      cursor: savingGoal ? "default" : "pointer",
                      fontSize: 12, fontWeight: 700,
                    }}
                  >
                    <opt.Icon size={15} strokeWidth={1.9} color={selected ? ACCENT : opt.color} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t.experienceLevelLabel}</div>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
              {[0,1,2].map(i => <Skeleton key={i} width="100%" height={66} radius={12} />)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
              {([
                { id: "beginner",     label: "Beginner",     sub: "Just starting" },
                { id: "intermediate", label: "Intermediate", sub: "Some experience" },
                { id: "advanced",     label: "Advanced",     sub: "Well-trained" },
              ] as const).map((opt) => {
                const selected = experienceLevel === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => saveExperienceLevel(opt.id)}
                    disabled={savingLevel}
                    style={{
                      border: `1px solid ${selected ? "rgba(18,101,254,0.72)" : "var(--border)"}`,
                      background: selected ? "rgba(18,101,254,0.12)" : "var(--surface-2)",
                      color: selected ? ACCENT : "var(--text)",
                      borderRadius: 12, padding: "10px 6px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                      cursor: savingLevel ? "default" : "pointer",
                      minHeight: 66,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: selected ? ACCENT : "var(--text)", lineHeight: 1.1, textAlign: "center" }}>{opt.label}</span>
                    <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, textAlign: "center" }}>{opt.sub}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Body stats */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>{t.bodyStats}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {([
              { label: "Height", field: "heightCm" as const, value: heightInput, setter: setHeightInput, unit: "cm",       min: 100, max: 250,  placeholder: "175"  },
              { label: "Weight", field: "weightKg" as const, value: weightInput, setter: setWeightInput, unit: weightUnit, min: weightUnit === "lbs" ? 44 : 20, max: weightUnit === "lbs" ? 1100 : 500, placeholder: weightUnit === "lbs" ? "154" : "70" },
            ]).map(({ label, field, value, setter, unit, min, max, placeholder }) => (
              <div key={field}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginBottom: 5 }}>{label}</div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "9px 12px",
                }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={max}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => setter(e.target.value)}
                    onBlur={(e) => saveBodyStat(field, e.target.value)}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      fontSize: 15, fontWeight: 800, color: "var(--text)",
                      width: "100%", fontFamily: "inherit",
                    }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, flexShrink: 0 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* WORKOUT SETUP */}
      <SectionLabel>WORKOUT SETUP</SectionLabel>
      <SectionCard>
        <div style={{ padding: "12px 14px" }}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[0,1,2].map(i => <Skeleton key={i} width="100%" height={80} radius={14} />)}
            </div>
          ) : (
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
                      border: `1px solid ${selected ? "rgba(18,101,254,0.72)" : "var(--border)"}`,
                      background: selected ? "rgba(18,101,254,0.12)" : "var(--surface-2)",
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
          )}
        </div>
        <Row
          divider
          label="Workouts per week"
          right={loading ? <Skeleton width={90} height={22} radius={8} /> : (
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
          )}
        />
        <Row
          divider
          label="Exercise Library"
          sublabel="Browse & manage exercises"
          onClick={() => router.push("/exercises")}
          right={<Chevron />}
        />
      </SectionCard>

      {/* PREFERENCES */}
      <SectionLabel>PREFERENCES</SectionLabel>
      <SectionCard>
        <Row
          label="Notifications"
          sublabel={
            pushLoading ? "Updating…"
            : pushError  ? pushError
            : pushEnabled ? "Enabled"
            : t.workoutReminders
          }
          right={<Toggle on={pushEnabled} onToggle={togglePush} loading={pushLoading} />}
        />
        {pushEnabled && (
          <Row
            divider
            label="Test notification"
            sublabel={pushTesting ? "Sending…" : (pushTestMsg ?? "Send one to this device now")}
            right={
              <motion.button
                onClick={sendTestPush}
                disabled={pushTesting}
                whileTap={{ scale: 0.9 }}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "5px 13px", color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: pushTesting ? "default" : "pointer", opacity: pushTesting ? 0.6 : 1 }}
              >
                Send
              </motion.button>
            }
          />
        )}
        <Row
          divider
          label="Appearance"
          sublabel={theme === "dark" ? "Dark mode" : "Light mode"}
          right={<Toggle on={theme === "dark"} onToggle={toggleTheme} />}
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
          <div style={{ background: "rgba(18,101,254,0.08)", border: "1px solid rgba(18,101,254,0.25)", borderRadius: 16, padding: "16px 18px" }}>
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
          FitSched v1.0.1
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
                {t.typeDeleteToConfirm}
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

      {/* Password gate — profile field edits (strict: re-prompts every save) */}
      <PasswordGate
        open={profileGateOpen}
        actionLabel="edit your profile"
        onClose={() => { setProfileGateOpen(false); pendingProfileAction.current = null }}
        onSuccess={() => {
          setProfileGateOpen(false)
          const action = pendingProfileAction.current
          pendingProfileAction.current = null
          action?.()
        }}
      />

      {/* Profile-saved toast */}
      <AnimatePresence>
        {profileToast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{
              position: "fixed",
              bottom: "calc(96px + env(safe-area-inset-bottom))",
              left: "50%", transform: "translateX(-50%)",
              zIndex: 250,
              display: "flex", alignItems: "center", gap: 9,
              background: "rgba(10,20,18,0.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(74,222,128,0.36)",
              borderRadius: 999,
              padding: "10px 18px",
              boxShadow: "0 14px 38px rgba(0,0,0,0.4)",
              pointerEvents: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
              {t.profileUpdated}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password gate — account deletion (typed-DELETE confirmation already required) */}
      <PasswordGate
        open={deleteGateOpen}
        actionLabel="delete your account"
        onClose={() => setDeleteGateOpen(false)}
        onSuccess={() => { setDeleteGateOpen(false); doDeleteAccount() }}
      />
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
