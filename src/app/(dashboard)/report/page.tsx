"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, YAxis } from "recharts"
import { useLanguage } from "@/context/LanguageContext"
import { SkeletonCard } from "@/components/Skeleton"
import { ChevronDown, ChevronRight, RotateCcw, Check, Wallet } from "lucide-react"
import { stagger, fadeUp } from "@/lib/animations"
import { getMuscleGroup } from "@/lib/exerciseData"
import { getWeekId, formatLocalDate, toDateId, addDays, calculateLongestStreak } from "@/lib/dateUtils"
import { ActivityHeatmap } from "@/components/ActivityHeatmap"
import { MuscleRecovery } from "@/components/MuscleRecovery"
import { MuscleHeatmap } from "@/components/MuscleHeatmap"
import { updateWidget } from "@/lib/widgetBridge"
import { estimateCalories } from "@/lib/calorieEstimate"
import FlameIcon from "@/components/FlameIcon"
import { ACCENT } from "@/lib/theme"
import { useTheme } from "@/context/ThemeContext"
import { formatFT } from "@/lib/formatUtils"

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle = {
  background: "var(--surface)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "16px 20px",
  marginBottom: "10px",
  width: "100%",
  boxSizing: "border-box" as const,
}

const sectionLabelStyle = {
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.01em",
  color: "var(--text-muted)",
  marginBottom: "8px",
  marginTop: "24px",
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"]

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest:      "#e85555",
  Back:       "#a064ff",
  Legs:       "#5b8fff",
  Shoulders:  "#1265fe",
  Arms:       "#e08010",
  Core:       "#1265fe",
  "Full Body":"#8d9996",
  Cardio:     "#e08010",
}

const dayCellVariant = {
  hidden: { opacity: 0, scale: 0.7, y: 8 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 22 },
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortWeek(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatTokenReason(reason: string, workoutName: string, t: { rStreakBonus: string; rWorkout: string; rBoostSuffix: string }) {
  if (reason === "streak_bonus") return t.rStreakBonus
  if (reason === "workout_complete") return workoutName ? `${workoutName}` : t.rWorkout
  if (reason === "workout_complete_boosted") return workoutName ? `${workoutName} ${t.rBoostSuffix}` : `${t.rWorkout} ${t.rBoostSuffix}`
  return reason.replace(/_/g, " ")
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkoutLog {
  id: string
  date?: string
  workoutName: string
  completedAt: string
  exercises: Array<{ name: string; sets: number; reps: number }>
  notes?: string | null
}

interface FitTokenTx {
  id: string
  amount: number
  reason: string
  createdAt: string
  workoutName: string
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { status } = useSession()
  const router = useRouter()
  const { t, language } = useLanguage()
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const MUSCLE_LABEL: Record<string, string> = { Chest: t.muChest, Back: t.muBack, Legs: t.muLegs, Shoulders: t.muShoulders, Arms: t.muArms, Core: t.muCore, "Full Body": t.muFullBody, Cardio: t.muCardio }

  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [streak, setStreak] = useState(0)
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [repeatingId, setRepeatingId] = useState<string | null>(null)
  const [repeatedId, setRepeatedId] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState("")
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [historyMuscleFilter, setHistoryMuscleFilter] = useState<string | null>(null)
  const [ftBalance, setFtBalance] = useState(0)
  const [ftTxs, setFtTxs] = useState<FitTokenTx[]>([])
  const [hikeTotals, setHikeTotals] = useState<{ count: number; km: number; durationMin: number } | null>(null)

  // Streak count-up animation
  const [displayStreak, setDisplayStreak] = useState(0)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streak === 0) { setDisplayStreak(0); return }
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / 820, 1)
      setDisplayStreak(Math.round(streak * (1 - Math.pow(1 - p, 3))))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [streak])

  // Today + week days for streak strip
  const [today, setToday] = useState<Date | null>(null)
  useEffect(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); setToday(d)
  }, [])
  const weekDays = useMemo(() => {
    if (!today) return []
    const dow = today.getDay()
    const monday = addDays(today, -((dow + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  }, [today])
  const completedDates = useMemo(() => new Set(logs.map(l => l.date || toDateId(new Date(l.completedAt)))), [logs])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    const load = async () => {
      try {
        const [logRes, streakRes, profileRes, tokenRes, hikeRes] = await Promise.all([
          fetch("/api/workout-log"),
          fetch("/api/streak"),
          fetch("/api/onboarding"),
          fetch("/api/tokens"),
          fetch("/api/hike"),
        ])
        if (logRes.ok) setLogs(await logRes.json())
        let latestStreak = 0
        let latestTokens = 0
        if (streakRes.ok) { const d = await streakRes.json(); latestStreak = d.streak ?? 0; setStreak(latestStreak) }
        if (profileRes.ok) { const d = await profileRes.json(); if (d.workoutsPerWeek) setWorkoutsPerWeek(d.workoutsPerWeek) }
        if (tokenRes.ok) {
          const d = await tokenRes.json()
          latestTokens = d.balance ?? 0
          setFtBalance(latestTokens)
          setFtTxs(d.transactions ?? [])
        }
        // Push fresh data to Android home-screen widget (no-op on web / iOS)
        updateWidget(latestStreak, latestTokens)
        if (hikeRes.ok) {
          const hikes: Array<{ distanceKm: number; durationMin: number }> = await hikeRes.json()
          if (hikes.length > 0) {
            setHikeTotals({
              count: hikes.length,
              km: Math.round(hikes.reduce((s, h) => s + h.distanceKm, 0) * 10) / 10,
              durationMin: Math.round(hikes.reduce((s, h) => s + h.durationMin, 0)),
            })
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [status])

  const handleRepeat = async (log: WorkoutLog) => {
    if (repeatingId) return
    setRepeatingId(log.id)
    try {
      const today = formatLocalDate(new Date())
      const res = await fetch("/api/workout-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, workoutName: log.workoutName, exercises: log.exercises, source: "workout" }),
      })
      if (res.ok) {
        setRepeatedId(log.id)
        setTimeout(() => router.push("/schedule"), 900)
      }
    } catch {}
    setRepeatingId(null)
  }

  // Derived data
  const totalWorkouts = logs.length
  const totalExercisesDone = logs.reduce((s, l) => s + l.exercises.length, 0)
  const longestStreak = useMemo(() => calculateLongestStreak(logs), [logs])

  const now = new Date()
  const weekIds: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i * 7); weekIds.push(getWeekId(d))
  }
  const logsByWeek: Record<string, number> = {}
  const caloriesByWeek: Record<string, number> = {}
  logs.forEach(log => {
    const id = getWeekId(new Date(log.completedAt))
    logsByWeek[id] = (logsByWeek[id] || 0) + 1
    caloriesByWeek[id] = (caloriesByWeek[id] || 0) + estimateCalories(log.exercises)
  })
  const weeklyData = weekIds.map(id => ({ week: formatShortWeek(id), actual: logsByWeek[id] || 0, planned: workoutsPerWeek, kcal: caloriesByWeek[id] || 0 }))

  const muscleCounts: Record<string, number> = {}
  logs.forEach(log => (log.exercises || []).forEach(ex => {
    const g = getMuscleGroup(ex.name); muscleCounts[g] = (muscleCounts[g] || 0) + 1
  }))
  const totalMuscleExercises = Object.values(muscleCounts).reduce((a, b) => a + b, 0)
  const topMuscles = Object.entries(muscleCounts).sort(([, a], [, b]) => b - a).slice(0, 3)

  const filteredLogs = logs.filter(l => {
    if (historySearch.trim() && !l.workoutName.toLowerCase().includes(historySearch.toLowerCase())) return false
    if (historyMuscleFilter) {
      const groups = (l.exercises || []).map(ex => getMuscleGroup(ex.name))
      if (!groups.includes(historyMuscleFilter)) return false
    }
    return true
  })
  const recentLogs = showAllHistory || historySearch.trim() || historyMuscleFilter ? filteredLogs : filteredLogs.slice(0, 10)

  return (
    <div style={{ padding: "20px 16px 100px", minHeight: "100vh", background: "var(--bg)" }}>
      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={fadeUp}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "26px", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text)", marginBottom: "20px" }}>
            <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {t.progress}
            </motion.span>
          </div>
        </motion.div>

        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SkeletonCard height="80px" />
            <SkeletonCard height="180px" />
            <SkeletonCard height="200px" />
            <SkeletonCard height="120px" />
            <SkeletonCard height="60px" />
          </motion.div>
        ) : logs.length === 0 ? (
          <motion.div variants={fadeUp} style={{ textAlign: "center", padding: "60px 16px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <ChevronRight size={28} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{t.noWorkouts}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, maxWidth: 260, margin: "0 auto 28px" }}>{t.completeFirstWorkout}</div>
            <button onClick={() => router.push("/schedule")} style={{ background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: 999, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {t.goToSchedule}
            </button>
          </motion.div>
        ) : (
          <>
            {/* Stats row */}
            <motion.div variants={fadeUp}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
                {[
                  { value: totalWorkouts, label: t.totalWorkouts },
                  { value: `${streak}`, label: t.currentStreak },
                  { value: totalExercisesDone, label: t.totalExercises },
                ].map((stat, i) => (
                  <div key={i} style={{ ...cardStyle, textAlign: "center", marginBottom: 0, padding: "14px 12px" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text)" }}>{stat.value}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── Streak Hero ───────────────────────────────────────── */}
            <motion.div variants={fadeUp} style={{ marginBottom: 10 }}>
              <div style={{
                position: "relative", overflow: "hidden", borderRadius: 20,
                background: isDark
                  ? "linear-gradient(148deg, #193d35 0%, #0c1e1b 100%)"
                  : "linear-gradient(148deg, #d4f0ed 0%, #eaf8f7 100%)",
                border: `1px solid ${isDark ? "rgba(18,101,254,0.24)" : "rgba(18,101,254,0.35)"}`,
                boxShadow: isDark
                  ? "inset 0 0 0 1px rgba(255,255,255,0.05), 0 20px 48px rgba(0,0,0,0.4)"
                  : "0 8px 32px rgba(18,101,254,0.18)",
              }}>
                {/* top shimmer line */}
                <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg, transparent, rgba(18,101,254,0.52), transparent)", pointerEvents: "none" }} />
                {/* radial glow */}
                <div style={{ position: "absolute", inset: 0, background: isDark ? "radial-gradient(ellipse at 12% -10%, rgba(18,101,254,0.2), transparent 52%)" : "radial-gradient(ellipse at 12% -10%, rgba(18,101,254,0.25), transparent 52%)", pointerEvents: "none" }} />
                {/* shimmer sweep */}
                <motion.div
                  style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(108deg, transparent 25%, rgba(18,101,254,0.07) 50%, transparent 75%)" }}
                  animate={{ x: ["-110%", "210%"] }}
                  transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 5.5, ease: "easeInOut" }}
                />

                {/* Floating flame. FlameIcon carries its own glow + embers now, so
                    the page no longer stacks a second particle system on top of it —
                    the old one animated opacity, which framer-motion's MotionConfig
                    does not suppress, so it kept flickering under reduced motion. */}
                <div style={{ position: "absolute", right: 14, top: 12, pointerEvents: "none" }}>
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} style={{ opacity: 0.9, transformOrigin: "50% 80%", position: "relative" }}>
                    <FlameIcon size={56} streak={streak} />
                  </motion.div>
                </div>

                {/* Numbers */}
                <div style={{ position: "relative", padding: "20px 22px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.01em", color: ACCENT, marginBottom: 6 }}>{t.currentStreak}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: "clamp(44px,12vw,58px)", fontWeight: 900, lineHeight: 1, color: isDark ? "#fff" : "#0d2926", fontVariantNumeric: "tabular-nums" }}>
                      {displayStreak}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(13,41,38,0.45)" }}>
                      {streak === 1 ? t.rDay : t.rDays}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.36)" : "rgba(13,41,38,0.48)" }}>
                    {t.rPersonalBest} · <span style={{ color: ACCENT, fontWeight: 900 }}>{longestStreak} {longestStreak === 1 ? t.rDay : t.rDays}</span>
                  </div>
                </div>

                {/* Week strip */}
                <div style={{ borderTop: `1px solid ${isDark ? "rgba(18,101,254,0.15)" : "rgba(18,101,254,0.25)"}`, padding: "12px 22px 18px" }}>
                  <motion.div
                    initial="hidden" animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
                    style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}
                  >
                    {weekDays.map((day, i) => {
                      const dateId = toDateId(day)
                      const isToday = today ? dateId === toDateId(today) : false
                      const done = completedDates.has(dateId)
                      return (
                        <motion.div key={dateId} variants={dayCellVariant} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.06em", color: isToday ? ACCENT : isDark ? "rgba(255,255,255,0.26)" : "rgba(13,41,38,0.35)" }}>{DAY_LETTERS[i]}</span>
                          <motion.div
                            animate={isToday ? { boxShadow: ["0 0 8px rgba(18,101,254,0.28)", "0 0 18px rgba(18,101,254,0.52)", "0 0 8px rgba(18,101,254,0.28)"] } : {}}
                            transition={isToday ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : {}}
                            style={{ width: "100%", height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 9, background: isToday ? ACCENT : done ? "rgba(18,101,254,0.22)" : isDark ? "rgba(255,255,255,0.05)" : "rgba(13,41,38,0.06)", border: isToday ? "none" : done ? "1px solid rgba(18,101,254,0.4)" : `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(13,41,38,0.1)"}` }}
                          >
                            {/* No check glyph — the cell fill and text weight carry the
                                done state, and keeping the date visible on every cell
                                means the strip still reads as a week at a glance. */}
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: (isToday || done) ? 900 : 700,
                                color: isToday
                                  ? "#fff"
                                  : done
                                    ? ACCENT
                                    : isDark ? "rgba(255,255,255,0.22)" : "rgba(13,41,38,0.35)",
                              }}
                            >
                              {day.getDate()}
                            </span>
                          </motion.div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Muscle heatmap */}
            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.rMusclesHit}</div>
              <div style={cardStyle}><MuscleHeatmap logs={logs} /></div>
            </motion.div>

            {/* Recovery */}
            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.rRecovery}</div>
              <div style={cardStyle}><MuscleRecovery logs={logs} /></div>
            </motion.div>

            {/* Activity heatmap */}
            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.rActivity}</div>
              <div style={cardStyle}><ActivityHeatmap logs={logs} weeks={16} /></div>
            </motion.div>

            {/* ── FitToken Earnings ─────────────────────────────────── */}
            <motion.div variants={fadeUp}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...sectionLabelStyle }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Wallet size={11} strokeWidth={2} style={{ color: ACCENT }} />
                  {t.rFtEarnings}
                </span>
                <span style={{ fontSize: 12, fontWeight: 900, color: ACCENT, letterSpacing: 0 }}>{formatFT(ftBalance)} FT</span>
              </div>
              <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                {ftTxs.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                    {t.rFtEmpty}
                  </div>
                ) : ftTxs.slice(0, 8).map((tx, i) => (
                  <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 18px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatTokenReason(tx.reason, tx.workoutName, t)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ color: ACCENT, fontSize: 13, fontWeight: 900, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                      +{formatFT(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Last 8 weeks chart */}
            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.last8Weeks}</div>
              <div style={cardStyle}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData} margin={{ top: 8, right: 4, bottom: 4, left: -16 }}>
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "var(--text)" }} />
                    <Bar dataKey="actual" radius={[4, 4, 0, 0]} maxBarSize={24}>
                      {weeklyData.map((entry, index) => (
                        <Cell key={index} fill={entry.actual >= entry.planned ? "var(--text)" : "var(--border)"} opacity={entry.actual >= entry.planned ? 1 : 0.5} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Calorie burn trend */}
            {weeklyData.some(w => w.kcal > 0) && (
              <motion.div variants={fadeUp}>
                <div style={sectionLabelStyle}>{t.rCaloriesBurned}</div>
                <div style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>
                      ~{weeklyData.reduce((s, w) => s + w.kcal, 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>{t.rKcalTotal}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="kcalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.38} />
                          <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={["auto", "auto"]} />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                      <Tooltip
                        contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "var(--text)" }}
                        formatter={(v: number) => [`~${v} kcal`, t.rCalories]}
                      />
                      <Area type="monotone" dataKey="kcal" stroke={ACCENT} strokeWidth={2} fill="url(#kcalGrad)" dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Hike stats */}
            {hikeTotals && (
              <motion.div variants={fadeUp}>
                <div style={sectionLabelStyle}>{t.rHikeStats}</div>
                <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, padding: 0, overflow: "hidden" }}>
                  {[
                    { label: t.rHikes, value: hikeTotals.count, suffix: "" },
                    { label: t.rDistance, value: hikeTotals.km, suffix: " km" },
                    { label: t.rTime, value: Math.round(hikeTotals.durationMin / 60 * 10) / 10, suffix: " h" },
                  ].map((stat, i) => (
                    <div key={i} style={{ padding: "16px 14px", textAlign: "center", borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>{stat.value}</span>
                        {stat.suffix && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{stat.suffix}</span>}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.06em" }}>{stat.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <div
                  onClick={() => router.push("/hike")}
                  style={{ marginTop: 6, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span>{t.rViewAllHikes}</span>
                  <ChevronRight size={14} />
                </div>
              </motion.div>
            )}

            {/* Most trained */}
            {topMuscles.length > 0 && (
              <motion.div variants={fadeUp}>
                <div style={sectionLabelStyle}>{t.mostTrained}</div>
                {topMuscles.map(([group, count]) => {
                  const pct = totalMuscleExercises > 0 ? Math.round((count / totalMuscleExercises) * 100) : 0
                  return (
                    <div key={group} style={{ ...cardStyle, marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{MUSCLE_LABEL[group] ?? group}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{pct}%</div>
                      </div>
                      <div style={{ width: "100%", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }} style={{ height: "100%", background: MUSCLE_GROUP_COLORS[group] ?? ACCENT, borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}

            {/* Workout History */}
            <motion.div variants={fadeUp}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...sectionLabelStyle }}>
                <span>{t.workoutHistory}</span>
                <span style={{ fontWeight: 600, letterSpacing: 0 }}>{filteredLogs.length} {t.rTotal}</span>
              </div>
              {/* Muscle group filter chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {[null, "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body"].map(group => (
                  <button
                    key={group ?? "all"}
                    onClick={() => { setHistoryMuscleFilter(group); setShowAllHistory(false) }}
                    style={{
                      border: historyMuscleFilter === group ? "1px solid rgba(18,101,254,0.6)" : "1px solid var(--border)",
                      background: historyMuscleFilter === group ? "rgba(18,101,254,0.12)" : "var(--surface)",
                      color: historyMuscleFilter === group ? ACCENT : "var(--text-muted)",
                      borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {group ? (MUSCLE_LABEL[group] ?? group) : t.muAll}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder={t.rSearchWorkouts}
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "9px 12px 9px 30px", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }}
                />
                {historySearch && (
                  <button onClick={() => setHistorySearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                )}
              </div>
            </motion.div>

            {recentLogs.length === 0 ? (
              <motion.div variants={fadeUp}>
                <div style={{ ...cardStyle, textAlign: "center", padding: "24px" }}>
                  <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                    {historySearch ? `${t.rNoMatching} "${historySearch}"` : historyMuscleFilter ? t.hNoFilteredWorkouts : t.noWorkouts}
                  </div>
                </div>
              </motion.div>
            ) : (
              recentLogs.map((log) => {
                const isExpanded = expandedLog === log.id
                return (
                  <motion.div key={log.id} variants={fadeUp}>
                    <div onClick={() => setExpandedLog(isExpanded ? null : log.id)} style={{ ...cardStyle, cursor: "pointer", marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{log.workoutName}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{new Date(log.completedAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ background: "var(--surface-2)", borderRadius: "20px", padding: "4px 10px", fontSize: "11px", color: "var(--text-muted)" }}>
                            {log.exercises.length} {t.exercises}
                          </span>
                          <span style={{ background: "rgba(18,101,254,0.10)", border: "1px solid rgba(18,101,254,0.28)", borderRadius: "20px", padding: "4px 9px", fontSize: "11px", fontWeight: 700, color: "var(--accent, #1265fe)" }}>
                            ~{estimateCalories(log.exercises)} kcal
                          </span>
                          {isExpanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                              {log.notes && (
                                <div style={{ marginBottom: 10, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, fontStyle: "italic" }}>
                                  &ldquo;{log.notes}&rdquo;
                                </div>
                              )}
                              {(log.exercises || []).map((ex, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: "13px" }}>
                                  <span style={{ color: "var(--text)" }}>{ex.name}</span>
                                  <span style={{ color: "var(--text-muted)" }}>{ex.sets}×{ex.reps}</span>
                                </div>
                              ))}
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); handleRepeat(log) }}
                                disabled={!!repeatingId || repeatedId === log.id}
                                style={{ marginTop: 10, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, border: `1px solid ${repeatedId === log.id ? "var(--accent)" : "var(--border)"}`, background: repeatedId === log.id ? "var(--accent-soft)" : "var(--surface-2)", color: repeatedId === log.id ? "var(--accent)" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: repeatingId === log.id ? "wait" : repeatedId === log.id ? "default" : "pointer" }}
                              >
                                {repeatedId === log.id ? <><Check size={13} strokeWidth={2.5} /> {t.rLoadedToday}</>
                                  : repeatingId === log.id ? <>{t.rLoading}</>
                                  : <><RotateCcw size={13} strokeWidth={2.5} /> {t.rRepeatToday}</>}
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })
            )}

            {!historySearch.trim() && filteredLogs.length > 10 && (
              <motion.div variants={fadeUp}>
                <button onClick={() => setShowAllHistory(v => !v)} style={{ width: "100%", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", cursor: "pointer", marginTop: 2 }}>
                  {showAllHistory ? t.showLess : t.showAll.replace("{n}", String(filteredLogs.length))}
                </button>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
