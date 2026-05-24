"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Settings } from "lucide-react"
import { toDateId, getWeekId, calculateLongestStreak } from "@/lib/dateUtils"
import { useLanguage } from "@/context/LanguageContext"
import { ACHIEVEMENT_DEFS, TIER_COLORS } from "@/lib/achievements"
import { ACCENT } from "@/lib/theme"

type Achievement = {
  type: string
  name: string
  description: string
  emoji: string
  tier: "bronze" | "silver" | "gold" | "platinum"
  unlockedAt: string
}
const RING_RADIUS = 46
const RING_CIRC = 2 * Math.PI * RING_RADIUS

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "U"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 320
        let { width, height } = img
        if (width > height) {
          if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
        } else {
          if (height > MAX) { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.75))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatFT(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calculateCurrentStreak(logs: any[]) {
  const uniqueDates = new Set(logs.map((l) => toDateId(new Date(l.completedAt))))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (!uniqueDates.has(toDateId(d))) break
    streak++
  }
  return streak
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / 900, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      frame++
      if (p < 1 && frame < 80) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])
  return <>{display}{suffix}</>
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()

  const [displayName, setDisplayName] = useState("")
  const [nameValue, setNameValue] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [joinDate, setJoinDate] = useState("")
  const [email, setEmail] = useState("")

  const [logs, setLogs] = useState<any[]>([])
  const [fitTokenBalance, setFitTokenBalance] = useState(0)
  const [streak, setStreak] = useState(0)
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [loading, setLoading] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>([])

  const photoInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    const savedPhoto = localStorage.getItem("fitsched-profile-photo")
    const savedName = localStorage.getItem("fitsched-display-name")
    if (savedPhoto) setPhoto(savedPhoto)

    const load = async () => {
      setLoading(true)
      try {
        const [profileRes, logsRes, tokensRes, streakRes, onboardRes, achRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/workout-log"),
          fetch("/api/tokens"),
          fetch("/api/streak"),
          fetch("/api/onboarding"),
          fetch("/api/achievements"),
        ])

        if (profileRes.ok) {
          const p = await profileRes.json()
          const name = savedName || p.name || session?.user?.name || "User"
          setDisplayName(name)
          setNameValue(name)
          setEmail(p.email || session?.user?.email || "")
          if (!savedPhoto && p.image) setPhoto(p.image)
          if (p.createdAt) {
            const d = new Date(p.createdAt)
            setJoinDate(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase())
          }
        } else {
          const name = savedName || session?.user?.name || "User"
          setDisplayName(name)
          setNameValue(name)
          setEmail(session?.user?.email || "")
        }

        if (logsRes.ok) setLogs(await logsRes.json())
        if (tokensRes.ok) { const t = await tokensRes.json(); setFitTokenBalance(t.balance || 0) }
        if (streakRes.ok) { const s = await streakRes.json(); setStreak(Number(s.streak) || 0) }
        if (onboardRes.ok) { const o = await onboardRes.json(); setWorkoutsPerWeek(o.workoutsPerWeek || 3) }
        if (achRes.ok) { setAchievements(await achRes.json()) }
      } catch {}
      setLoading(false)
    }

    load()
  }, [status, session])

  const stats = useMemo(() => {
    const totalWorkouts = logs.length
    const totalExercises = logs.reduce((s, l) => s + (l.exercises?.length || 0), 0)
    const thisWeek = logs.filter((l) => getWeekId(new Date(l.completedAt)) === getWeekId(new Date())).length
    const thisWeekPct = workoutsPerWeek > 0 ? Math.min(100, Math.round(thisWeek / workoutsPerWeek * 100)) : 0
    const bestStreak = calculateLongestStreak(logs)
    return { totalWorkouts, totalExercises, thisWeek, thisWeekPct, bestStreak }
  }, [logs, workoutsPerWeek])

  const ringOffset = streak > 0 ? RING_CIRC - Math.min(streak / 30, 1) * RING_CIRC : RING_CIRC

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setPhoto(compressed)
      localStorage.setItem("fitsched-profile-photo", compressed)
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed }),
      }).catch(() => {})
    } catch {}
    e.target.value = ""
  }, [])

  const saveName = useCallback(async () => {
    setEditingName(false)
    const trimmed = nameValue.trim()
    if (!trimmed) { setNameValue(displayName); return }
    if (trimmed === displayName) return
    setSavingName(true)
    setDisplayName(trimmed)
    localStorage.setItem("fitsched-display-name", trimmed)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
    } catch {}
    setSavingName(false)
  }, [nameValue, displayName])

  const initials = getInitials(displayName, email)

  return (
    <div style={{ minHeight: "100vh", background: "transparent", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0" }}>
        <div className="brand-wordmark" style={{ fontSize: "22px", fontWeight: 950, color: "var(--text)", letterSpacing: "-0.3px" }}>
          Profile
        </div>
        <button
          type="button"
          onClick={() => router.push("/settings")}
          style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Settings size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* Avatar + streak ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 28, paddingBottom: 20 }}>
        <div style={{ position: "relative", width: 104, height: 104, marginBottom: 14 }}>
          {/* Streak ring */}
          <svg width="104" height="104" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} aria-hidden>
            <circle cx="52" cy="52" r={RING_RADIUS} fill="none" stroke="rgba(107,191,184,0.14)" strokeWidth="3.5" />
            {streak > 0 && (
              <motion.circle
                cx="52" cy="52" r={RING_RADIUS}
                fill="none" stroke={ACCENT} strokeWidth="3.5"
                strokeLinecap="round"
                initial={{ strokeDashoffset: RING_CIRC }}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                style={{ strokeDasharray: RING_CIRC }}
              />
            )}
          </svg>

          {/* Avatar */}
          <div
            onClick={() => photoInputRef.current?.click()}
            style={{ position: "absolute", inset: 7, borderRadius: "50%", overflow: "hidden", cursor: "pointer" }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Profile photo" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                background: "linear-gradient(135deg, rgba(107,191,184,0.96), rgba(40,73,70,0.92))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "24px", fontWeight: 800,
              }}>
                {initials}
              </div>
            )}
            {/* Camera overlay on hover */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(0,0,0,0.32)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0, transition: "opacity 0.15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0" }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>

          {/* Streak badge */}
          {streak > 0 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 280, damping: 20 }}
              style={{
                position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                background: "var(--panel)", border: "1px solid var(--border)",
                borderRadius: 999, padding: "3px 9px",
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 900, color: "var(--text)",
                whiteSpace: "nowrap", boxShadow: "var(--shadow)",
              }}
            >
              <span style={{ fontSize: 10 }}>🔥</span>
              <span>{streak}d</span>
            </motion.div>
          )}
        </div>

        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />

        {/* Name — tap to edit */}
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === "Enter") saveName() }}
            autoFocus
            style={{
              fontSize: "22px", fontWeight: 950, letterSpacing: "-0.3px",
              color: "var(--text)", background: "transparent",
              border: "none", borderBottom: `2px solid ${ACCENT}`,
              outline: "none", textAlign: "center",
              padding: "2px 8px", marginBottom: 4, minWidth: 120,
            }}
          />
        ) : (
          <motion.div
            onClick={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.select(), 50) }}
            whileTap={{ scale: 0.97 }}
            style={{ fontSize: "22px", fontWeight: 950, letterSpacing: "-0.3px", color: "var(--text)", cursor: "text", marginBottom: 4, textAlign: "center" }}
          >
            {displayName || "Tap to set name"}
            {savingName && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6, fontWeight: 600 }}>saving…</span>}
          </motion.div>
        )}

        {email && !email.endsWith("@fitsched.guest") && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{email}</div>
        )}
        {email.endsWith("@fitsched.guest") && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9, background: "rgba(107,191,184,0.18)", border: "1px solid rgba(107,191,184,0.3)", color: ACCENT, borderRadius: 999, padding: "2px 8px", fontWeight: 800, letterSpacing: "0.08em" }}>GUEST</span>
            Progress is temporary
          </div>
        )}
        {joinDate && !email.endsWith("@fitsched.guest") && (
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.13em", color: "var(--text-muted)" }}>
            JOINED {joinDate}
          </div>
        )}

        {/* Guest sign-up prompt */}
        {email.endsWith("@fitsched.guest") && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={async () => { await import("next-auth/react").then(m => m.signOut({ redirect: false })); router.push("/register") }}
            style={{ marginTop: 14, border: "1px solid rgba(107,191,184,0.4)", background: "rgba(107,191,184,0.08)", borderRadius: 14, padding: "10px 20px", color: ACCENT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Create a free account to save your progress →
          </motion.button>
        )}

        {/* FitTokens + Withdraw */}
        {!email.endsWith("@fitsched.guest") && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.32)",
            borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 800, color: ACCENT,
          }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid rgba(107,191,184,0.4)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900 }}>FT</span>
            FitTokens · {formatFT(fitTokenBalance)}
          </div>
          <button
            type="button"
            onClick={() => router.push("/withdrawal")}
            style={{
              border: "1px solid var(--border)", background: "var(--surface-2)",
              borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 800,
              color: "var(--text)", cursor: "pointer",
            }}
          >
            Withdraw
          </button>
        </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.13em", color: "var(--text-muted)", marginBottom: 10 }}>
          {t.byTheNumbers}
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow)" }}>
          {loading ? (
            [1,2,3,4].map((i) => (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i < 4 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between" }}>
                <div style={{ width: 80, height: 13, background: "var(--surface-2)", borderRadius: 6 }} />
                <div style={{ width: 36, height: 13, background: "var(--surface-2)", borderRadius: 6 }} />
              </div>
            ))
          ) : (
            [
              { label: t.workoutsDone, sub: t.lifetimeLabel, value: stats.totalWorkouts, suffix: "" },
              { label: t.exercisesDoneLabel, sub: t.lifetimeLabel, value: stats.totalExercises, suffix: "" },
              { label: t.thisWeek, sub: `${stats.thisWeek} of ${workoutsPerWeek} sessions`, value: stats.thisWeekPct, suffix: "%" },
              { label: t.bestStreakLabel, sub: t.daysLabel, value: stats.bestStreak, suffix: "" },
            ].map((row, i, arr) => (
              <div key={i} style={{ padding: "15px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{row.sub}</div>
                </div>
                <div className="number-text" style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px" }}>
                  <AnimatedNumber value={row.value} suffix={row.suffix} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ padding: "20px 16px 0" }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/weight")}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16,
            padding: "14px 18px", cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(107,191,184,0.1)", border: "1px solid rgba(107,191,184,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>
              ⚖️
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Weight Log</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Track your body weight over time</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.button>
      </div>

      {/* Achievements */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.13em", color: "var(--text-muted)", marginBottom: 10 }}>
          ACHIEVEMENTS · {achievements.length} / {ACHIEVEMENT_DEFS.length}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {ACHIEVEMENT_DEFS.map((def) => {
            const unlocked = achievements.find((a) => a.type === def.type)
            const colors = TIER_COLORS[def.tier]
            return (
              <motion.div
                key={def.type}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: unlocked ? colors.bg : "var(--surface-2)",
                  border: `1px solid ${unlocked ? colors.border : "var(--border)"}`,
                  borderRadius: 16, padding: "14px 10px",
                  textAlign: "center", opacity: unlocked ? 1 : 0.42,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 6 }}>{def.emoji}</div>
                <div style={{
                  fontSize: 10, fontWeight: 800, color: unlocked ? colors.color : "var(--text-muted)",
                  lineHeight: 1.3, letterSpacing: "0.02em",
                }}>
                  {def.name}
                </div>
                {unlocked && (
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
                    {new Date(unlocked.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
