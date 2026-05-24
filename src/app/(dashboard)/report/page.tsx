"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from "recharts"
import {
  BarChart2, Check, ChevronDown, ChevronRight, Dumbbell,
  Footprints, History, PencilLine, Ruler, Save, Scale,
  ShieldCheck, TrendingUp, Wallet,
} from "lucide-react"
import { SkeletonCard } from "@/components/Skeleton"
import FlameIcon from "@/components/FlameIcon"
import { stagger, fadeUp } from "@/lib/animations"
import { getMuscleGroup } from "@/lib/exerciseData"
import { toDateId, addDays, getWeekId, calculateLongestStreak } from "@/lib/dateUtils"
import { ACCENT } from "@/lib/theme"

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutLog = {
  id: string
  date: string
  workoutName: string
  completedAt: string
  exercises: Array<{ name: string; sets: number; reps: number }>
}

type ProfileData = {
  heightCm: number | null
  weightKg: number | null
  bmi: number | null
  hasInjury: boolean
  injuryNotes: string | null
  workoutsPerWeek?: number | null
}

type StreakData = {
  streak: number
  previousStreak: number
  streakBroken: boolean
  lastCompletedDate: string | null
}

type FitTokenData = {
  balance: number
  transactions: Array<{
    id: string
    amount: number
    reason: string
    createdAt: string
    workoutName: string
  }>
}

type HikeLog = {
  id: string
  name: string
  distanceKm: number
  durationMin: number
  elevationM: number | null
  locationName: string | null
  loggedAt: string
}

// ─── Animation variants ───────────────────────────────────────────────────────


const dayStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const dayCellVariant = {
  hidden: { opacity: 0, scale: 0.7, y: 8 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 22 },
  },
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"]

const cardStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 20,
  padding: "17px 20px",
  marginBottom: 10,
  boxShadow: "var(--shadow)",
  width: "100%",
  boxSizing: "border-box",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 15,
  fontWeight: 700,
  outline: "none",
  fontFamily: "inherit",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateBmi(h: string, w: string) {
  const height = Number(h), weight = Number(w)
  if (!height || !weight) return null
  return Math.round((weight / ((height / 100) ** 2)) * 10) / 10
}

function getBmiStatus(bmi: number | null) {
  if (!bmi) return { label: "Not set", color: "var(--text-muted)", position: 0 }
  if (bmi < 18.5) return { label: "Underweight", color: "#82a7ff", position: 22 }
  if (bmi < 25)   return { label: "Healthy", color: ACCENT, position: 49 }
  if (bmi < 30)   return { label: "Overweight", color: "#e7c85a", position: 67 }
  return { label: "High BMI", color: "#e76f6f", position: 86 }
}

function getTopMuscles(logs: WorkoutLog[]) {
  const counts: Record<string, number> = {}
  logs.forEach((log) => log.exercises.forEach((ex) => {
    const g = getMuscleGroup(ex.name)
    counts[g] = (counts[g] || 0) + 1
  }))
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([group, count]) => ({ group, pct: total ? Math.round((count / total) * 100) : 0 }))
}

function buildWeeklyData(logs: WorkoutLog[], workoutsPerWeek: number) {
  const now = new Date()
  const logsByWeek: Record<string, number> = {}
  logs.forEach((log) => {
    const weekId = getWeekId(new Date(log.completedAt))
    logsByWeek[weekId] = (logsByWeek[weekId] || 0) + 1
  })
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() - (7 - index) * 7)
    const id = getWeekId(date)
    return { week: id.slice(5), actual: logsByWeek[id] || 0, planned: workoutsPerWeek }
  })
}

function fmtHikeDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatFitTokenAmount(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTokenReason(reason: string, workoutName: string) {
  if (reason === "streak_bonus") return "Streak bonus"
  if (reason === "workout_complete") return `${workoutName} workout`
  return reason.replace(/_/g, " ")
}

// ─── Section header with icon ─────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, label, right,
}: {
  icon: React.ElementType
  label: string
  right?: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon size={13} strokeWidth={2} style={{ color: ACCENT }} />
        <span className="label-text" style={{ fontSize: 10, color: ACCENT, letterSpacing: "0.12em" }}>{label}</span>
      </div>
      {right && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{right}</span>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { status } = useSession()
  const router = useRouter()

  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [hikeLogs, setHikeLogs] = useState<HikeLog[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [fitTokens, setFitTokens] = useState<FitTokenData>({ balance: 0, transactions: [] })
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [hasInjury, setHasInjury] = useState(false)
  const [injuryNotes, setInjuryNotes] = useState("")
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    const load = async () => {
      setLoading(true)
      try {
        const [profileRes, logRes, streakRes, tokenRes, hikeRes] = await Promise.all([
          fetch("/api/onboarding"),
          fetch("/api/workout-log"),
          fetch("/api/streak"),
          fetch("/api/tokens"),
          fetch("/api/hike"),
        ])
        if (profileRes.ok) {
          const p = (await profileRes.json()) as ProfileData
          setProfile(p)
          setHeightCm(p.heightCm ? String(p.heightCm) : "")
          setWeightKg(p.weightKg ? String(p.weightKg) : "")
          setHasInjury(Boolean(p.hasInjury))
          setInjuryNotes(p.injuryNotes || "")
          if (p.workoutsPerWeek) setWorkoutsPerWeek(p.workoutsPerWeek)
        }
        if (logRes.ok) setLogs(await logRes.json())
        if (streakRes.ok) setStreak(await streakRes.json())
        if (tokenRes.ok) setFitTokens(await tokenRes.json())
        if (hikeRes.ok) setHikeLogs(await hikeRes.json())
      } catch {
        setMessage("Could not load report data.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [status])

  const bmi = calculateBmi(heightCm, weightKg) ?? profile?.bmi ?? null
  const bmiStatus = getBmiStatus(bmi)
  const longestStreak = useMemo(() => calculateLongestStreak(logs), [logs])
  const topMuscles = useMemo(() => getTopMuscles(logs), [logs])
  const weeklyData = useMemo(() => buildWeeklyData(logs, workoutsPerWeek), [logs, workoutsPerWeek])
  const recentLogs = logs.slice(0, 10)

  const hikeStats = useMemo(() => {
    const totalKm    = hikeLogs.reduce((s, h) => s + h.distanceKm, 0)
    const totalElev  = hikeLogs.reduce((s, h) => s + (h.elevationM ?? 0), 0)
    const longestKm  = hikeLogs.reduce((best, h) => h.distanceKm > best ? h.distanceKm : best, 0)
    const totalMin   = hikeLogs.reduce((s, h) => s + h.durationMin, 0)
    return { count: hikeLogs.length, totalKm, totalElev, longestKm, totalMin }
  }, [hikeLogs])

  /* Count-up for streak number */
  const [displayStreak, setDisplayStreak] = useState(0)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const target = streak?.streak ?? 0
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (target === 0) { setDisplayStreak(0); return }
    const startTime = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / 820, 1)
      setDisplayStreak(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [streak?.streak])

  /* Ember particles */
  const embers = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i, x: (i * 10) - 20, targetY: -(36 + i * 12),
      size: 2.2 + (i % 3) * 0.8, delay: i * 0.26,
      duration: 1.35 + (i % 3) * 0.3,
      color: ["#fff4b0", "#e8842a", "#ffffff", "#ffb64d", "#c9a84c"][i],
    })), []
  )

  const [today, setToday] = useState<Date | null>(null)
  const [weekNumber, setWeekNumber] = useState<number | null>(null)
  useEffect(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0)
    setToday(d)
    const start = new Date(d.getFullYear(), 0, 1)
    setWeekNumber(Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7))
  }, [])
  const weekDays = useMemo(() => {
    if (!today) return []
    const dow = today.getDay()
    const monday = addDays(today, -((dow + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  }, [today])
  const completedDates = new Set(logs.map((log) => log.date))

  const saveMetrics = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true); setMessage("")
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: heightCm ? Number(heightCm) : null,
          weightKg: weightKg ? Number(weightKg) : null,
          hasInjury, injuryNotes,
        }),
      })
      if (!res.ok) throw new Error()
      const next = (await res.json()) as ProfileData
      setProfile((cur) => ({ ...(cur || next), ...next }))
      setMessage("Body report updated.")
    } catch { setMessage("Could not save changes.") }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding: "22px 16px 140px", minHeight: "100vh", background: "transparent" }}>
      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Header ──────────────────────────────────────────────── */}
        <motion.header
          variants={fadeUp}
          style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}
        >
          <div>
            <p className="label-text" style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6 }}>
              {weekNumber ? `WEEK ${weekNumber} · ` : ""}THIS WEEK
            </p>
            <h1 className="display-text" style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Report
            </h1>
          </div>
        </motion.header>

        {/* ── Skeletons ────────────────────────────────────────────── */}
        {loading ? (
          <motion.div variants={fadeUp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SkeletonCard height="196px" />
            <SkeletonCard height="280px" />
            <SkeletonCard height="140px" />
            <SkeletonCard height="100px" />
            <SkeletonCard height="140px" />
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── 1. Streak hero ──────────────────────────────────── */}
            <motion.section
              variants={fadeUp}
              style={{
                position: "relative", overflow: "hidden", borderRadius: 26,
                background: "linear-gradient(148deg, #193d35 0%, #0c1e1b 100%)",
                border: "1px solid rgba(107,191,184,0.24)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(107,191,184,0.2), 0 24px 56px rgba(0,0,0,0.48)",
              }}
            >
              <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg, transparent, rgba(107,191,184,0.52), transparent)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 12% -10%, rgba(107,191,184,0.22), transparent 52%)", pointerEvents: "none" }} />

              {/* Shimmer sweep */}
              <motion.div
                style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(108deg, transparent 25%, rgba(107,191,184,0.07) 50%, transparent 75%)" }}
                animate={{ x: ["-110%", "210%"] }}
                transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 5.5, ease: "easeInOut" }}
              />

              {/* Floating flame + embers */}
              <div style={{ position: "absolute", right: 14, top: 12, pointerEvents: "none" }}>
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} style={{ opacity: 0.78, filter: "saturate(1.15) brightness(1.1)", transformOrigin: "50% 80%" }}>
                  <FlameIcon size={60} streak={streak?.streak ?? 0} />
                </motion.div>
                <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)" }}>
                  {embers.map((ember) => (
                    <motion.div
                      key={ember.id}
                      style={{ position: "absolute", width: ember.size, height: ember.size, borderRadius: "50%", background: ember.color, boxShadow: `0 0 5px ${ember.color}` }}
                      animate={{ x: [0, ember.x], y: [0, ember.targetY], opacity: [0, 0.85, 0], scale: [0.4, 1, 0.3] }}
                      transition={{ duration: ember.duration, delay: ember.delay, repeat: Infinity, repeatDelay: 0.3, ease: "easeOut" }}
                    />
                  ))}
                </div>
              </div>

              {/* Numbers */}
              <div style={{ position: "relative", padding: "22px 22px 16px" }}>
                <motion.div className="label-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.28 }} style={{ fontSize: 10, color: ACCENT, marginBottom: 8 }}>
                  Current Streak
                </motion.div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <motion.span className="number-text" initial={{ opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.16, type: "spring", stiffness: 200, damping: 18 }} style={{ fontSize: "clamp(48px, 13vw, 62px)", fontWeight: 900, lineHeight: 1, color: "#fff" }}>
                    {displayStreak}
                  </motion.span>
                  <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.36, duration: 0.24 }} style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.42)" }}>
                    {(streak?.streak ?? 0) === 1 ? "day" : "days"}
                  </motion.span>
                </div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.52, duration: 0.3 }} style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.38)" }}>
                  Personal best · <span style={{ color: ACCENT, fontWeight: 900 }}>{longestStreak} {longestStreak === 1 ? "day" : "days"}</span>
                </motion.div>
              </div>

              {/* Week strip */}
              <div style={{ borderTop: "1px solid rgba(107,191,184,0.16)", padding: "14px 22px 20px" }}>
                <motion.div variants={dayStagger} initial="hidden" animate="visible" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 7 }}>
                  {weekDays.map((day, i) => {
                    const dateId = toDateId(day)
                    const isToday = today ? dateId === toDateId(today) : false
                    const completed = completedDates.has(dateId)
                    return (
                      <motion.div key={dateId} variants={dayCellVariant} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: isToday ? ACCENT : "rgba(255,255,255,0.28)" }}>{DAY_LETTERS[i]}</span>
                        <motion.div
                          animate={isToday ? { boxShadow: ["0 0 8px rgba(107,191,184,0.28)", "0 0 20px rgba(107,191,184,0.54)", "0 0 8px rgba(107,191,184,0.28)"] } : {}}
                          transition={isToday ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : {}}
                          style={{ width: "100%", height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: isToday ? ACCENT : completed ? "rgba(107,191,184,0.16)" : "rgba(255,255,255,0.05)", border: isToday ? "none" : completed ? "1px solid rgba(107,191,184,0.32)" : "1px solid rgba(255,255,255,0.07)" }}
                        >
                          {isToday || completed ? (
                            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 350, damping: 18 }}>
                              <Check size={12} strokeWidth={3} style={{ color: isToday ? "#0a1a18" : ACCENT, display: "block" }} />
                            </motion.div>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.24)" }}>{day.getDate()}</span>
                          )}
                        </motion.div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </div>
            </motion.section>

            {/* ── 2. BMI + form ───────────────────────────────────── */}
            <motion.section variants={fadeUp}>
              <SectionHeader icon={Scale} label="BMI" right={
                <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="number-text" style={{ fontSize: 18, fontWeight: 900, color: "var(--text)" }}>{bmi ? bmi.toFixed(1) : "--"}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: bmiStatus.color }}>{bmiStatus.label}</span>
                </span>
              } />
              <div className="ios-inset-grouped" style={{ overflow: "hidden" }}>
                <div style={{ padding: "18px 20px 0" }}>
                  <div style={{ position: "relative", height: 13, borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1.35fr 1fr 1fr" }}>
                      <div style={{ background: "#5266dd" }} /><div style={{ background: "#6bc7c0" }} />
                      <div style={{ background: "#e7c85a" }} /><div style={{ background: "#e76f6f" }} />
                    </div>
                    {bmi && <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${bmiStatus.position}% - 1.5px)`, width: 3, borderRadius: 999, background: "rgba(255,255,255,0.94)", boxShadow: "0 0 6px rgba(255,255,255,0.6)", transition: "left 0.35s cubic-bezier(0.16,1,0.3,1)" }} />}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    {["15", "18.5", "25", "30", "40"].map((l) => <span key={l} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{l}</span>)}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 18 }}>Used as context only, not a judgment.</p>
                </div>
                <form onSubmit={saveMetrics} style={{ borderTop: "1px solid var(--border)", padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                        <Ruler size={12} strokeWidth={2} /> Height
                      </span>
                      <input type="number" min="50" max="260" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="cm" style={inputStyle} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                        <Scale size={12} strokeWidth={2} /> Weight
                      </span>
                      <input type="number" min="20" max="400" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="kg" style={inputStyle} />
                    </label>
                  </div>
                  <button type="button" onClick={() => setHasInjury((v) => !v)} className="motion-lift" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", borderRadius: 18, border: hasInjury ? "1px solid rgba(231,111,111,0.34)" : "1px solid var(--border)", background: hasInjury ? "rgba(231,111,111,0.08)" : "var(--surface-2)", cursor: "pointer", textAlign: "left" as const }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 11, background: "var(--panel)", color: "var(--accent-strong)" }}><ShieldCheck size={16} strokeWidth={1.8} /></span>
                      <span>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 900, color: "var(--text)" }}>Injury note</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{hasInjury ? "FitSched will stay cautious." : "No active injury marked."}</span>
                      </span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", flexShrink: 0 }}>{hasInjury ? "On" : "Off"}</span>
                  </button>
                  <AnimatePresence>
                    {hasInjury && (
                      <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                          <PencilLine size={12} strokeWidth={2} /> Notes
                        </span>
                        <textarea value={injuryNotes} onChange={(e) => setInjuryNotes(e.target.value)} placeholder="Example: avoid heavy knee impact this week." style={{ ...inputStyle, minHeight: 88, resize: "vertical", lineHeight: 1.5, fontWeight: 600 }} />
                      </motion.label>
                    )}
                  </AnimatePresence>
                  <button type="submit" disabled={saving} className="motion-lift" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 18, border: "1px solid var(--border-strong)", background: "var(--accent)", color: "#0a1a18", fontSize: 14, fontWeight: 900, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
                    <Save size={15} strokeWidth={2.2} />
                    {saving ? "Saving…" : "Update report"}
                  </button>
                  {message && <p style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{message}</p>}
                </form>
              </div>
            </motion.section>

            {/* ── 3. FitToken Earnings ─────────────────────────────── */}
            <motion.section variants={fadeUp}>
              <SectionHeader icon={Wallet} label="FitToken Earnings" right={
                <span className="number-text" style={{ fontSize: 13, fontWeight: 900, color: ACCENT }}>
                  {formatFitTokenAmount(fitTokens.balance)} FT
                </span>
              } />
              <div className="ios-inset-grouped" style={{ padding: "4px 0" }}>
                {fitTokens.transactions.length > 0 ? (
                  fitTokens.transactions.slice(0, 8).map((tx, i) => (
                    <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 20px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {formatTokenReason(tx.reason, tx.workoutName)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="number-text" style={{ color: ACCENT, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
                        +{formatFitTokenAmount(tx.amount)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "20px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Complete a workout to earn your first FitToken.
                  </div>
                )}
              </div>
            </motion.section>

            {/* ── 4. Last 8 Weeks ──────────────────────────────────── */}
            <motion.section variants={fadeUp}>
              <SectionHeader icon={BarChart2} label="Last 8 Weeks" />
              <div className="ios-inset-grouped" style={{ padding: "14px 12px 8px" }}>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={weeklyData} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      formatter={(value) => [`${value} workouts`, "Completed"]}
                      labelFormatter={() => "Weekly activity"}
                      contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: 12 }}
                    />
                    <Bar dataKey="actual" radius={[6, 6, 0, 0]} maxBarSize={22}>
                      {weeklyData.map((entry) => (
                        <Cell key={entry.week} fill={entry.actual >= entry.planned ? ACCENT : "rgba(255,255,255,0.1)"} opacity={entry.actual > 0 ? 1 : 0.5} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.section>

            {/* ── 5. Most Trained ──────────────────────────────────── */}
            <motion.section variants={fadeUp}>
              <SectionHeader icon={Dumbbell} label="Most Trained" right="last 30 days" />
              {topMuscles.length > 0 ? (
                <div className="ios-inset-grouped" style={{ padding: "4px 0" }}>
                  {topMuscles.map((muscle, index) => (
                    <div key={muscle.group} style={{ padding: "14px 20px", borderTop: index > 0 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{muscle.group}</span>
                        <span className="number-text" style={{ fontSize: 13, fontWeight: 900, color: ACCENT }}>{muscle.pct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, overflow: "hidden", background: "var(--surface-2)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${muscle.pct}%` }}
                          transition={{ duration: 0.75, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                          style={{ height: "100%", borderRadius: 999, background: `linear-gradient(90deg, #3d9a93, ${ACCENT})` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ios-inset-grouped" style={{ textAlign: "center", padding: "28px 20px" }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Complete a workout to see your muscle patterns.</p>
                </div>
              )}
            </motion.section>

            {/* ── 6. Hike Activity ─────────────────────────────────── */}
            <motion.section variants={fadeUp}>
              <SectionHeader icon={Footprints} label="Hike Activity" right={hikeStats.count > 0 ? `${hikeStats.count} hike${hikeStats.count !== 1 ? "s" : ""}` : undefined} />
              {hikeStats.count === 0 ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "28px 20px", marginBottom: 0 }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No hikes logged yet. Use the Hike tab to track your first adventure.</p>
                </div>
              ) : (
                <>
                  {/* Stat grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    {([
                      { label: "Total Distance", value: `${hikeStats.totalKm.toFixed(1)} km`, Icon: Ruler },
                      { label: "Total Time",     value: fmtHikeDuration(hikeStats.totalMin), Icon: History },
                      { label: "Elevation",      value: hikeStats.totalElev > 0 ? `↑${hikeStats.totalElev.toLocaleString()} m` : "—", Icon: TrendingUp },
                      { label: "Longest Hike",   value: `${hikeStats.longestKm.toFixed(1)} km`, Icon: Footprints },
                    ] as const).map(({ label, value, Icon }) => (
                      <div key={label} style={{ ...cardStyle, marginBottom: 0, padding: "15px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                          <Icon size={12} strokeWidth={2} style={{ color: ACCENT }} />
                          <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text-muted)" }}>{label}</span>
                        </div>
                        <div className="number-text" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent hike cards */}
                  {hikeLogs.slice(0, 5).map(log => (
                    <div key={log.id} style={{ ...cardStyle, padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.name}
                          </div>
                          {log.locationName && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {log.locationName}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>
                          {new Date(log.loggedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px 12px", marginTop: 9 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{log.distanceKm} km</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtHikeDuration(log.durationMin)}</span>
                        {log.elevationM ? <span style={{ fontSize: 12, color: "var(--text-muted)" }}>↑{log.elevationM} m</span> : null}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </motion.section>

            {/* ── 7. Workout History ───────────────────────────────── */}
            <motion.section variants={fadeUp}>
              <SectionHeader icon={History} label="Workout History" />
              {recentLogs.length === 0 ? (
                <div className="ios-inset-grouped" style={{ textAlign: "center", padding: "28px 20px" }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No workouts logged yet.</p>
                </div>
              ) : (
                <div className="ios-inset-grouped" style={{ padding: "4px 0" }}>
                  {recentLogs.map((log, idx) => {
                    const isExpanded = expandedLog === log.id
                    return (
                      <div key={log.id} onClick={() => setExpandedLog(isExpanded ? null : log.id)} style={{ padding: "14px 20px", borderTop: idx > 0 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {log.workoutName}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                              {new Date(log.completedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <span style={{ background: "var(--surface-2)", borderRadius: 999, padding: "4px 10px", fontSize: 11, color: "var(--text-muted)" }}>
                              {log.exercises.length} ex
                            </span>
                            {isExpanded
                              ? <ChevronDown size={15} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
                              : <ChevronRight size={15} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
                            }
                          </div>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                                {log.exercises.map((ex, i) => (
                                  <div key={`${ex.name}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", gap: 14, fontSize: 13 }}>
                                    <span style={{ color: "var(--text)" }}>{ex.name}</span>
                                    <span className="number-text" style={{ color: "var(--text-muted)", flexShrink: 0 }}>{ex.sets} × {ex.reps}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.section>

          </div>
        )}
      </motion.div>
    </div>
  )
}
