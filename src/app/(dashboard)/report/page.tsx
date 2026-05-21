"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, Check, MoreHorizontal, PencilLine, Ruler, Save, Scale, ShieldCheck } from "lucide-react"
import { SkeletonCard } from "@/components/Skeleton"
import FlameIcon from "@/components/FlameIcon"

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

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] as const } },
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"]

const muscleMap: Record<string, string> = {
  "Push-ups": "Chest", "Diamond Push-ups": "Chest", "Wide Push-ups": "Chest",
  "Incline Push-ups": "Chest", "Decline Push-ups": "Chest", "Bench Press": "Chest",
  "Dumbbell Fly": "Chest", "Chest Dips": "Chest",
  "Pull-ups": "Back", "Chin-ups": "Back", "Bent-over Row": "Back",
  "Dumbbell Row": "Back", "Superman Hold": "Back", "Reverse Fly": "Back",
  "Deadlift": "Back", "Lat Pulldown": "Back",
  "Pike Push-ups": "Shoulders", "Lateral Raises": "Shoulders", "Front Raises": "Shoulders",
  "Overhead Press": "Shoulders", "Arnold Press": "Shoulders", "Face Pull": "Shoulders", "Shrugs": "Shoulders",
  "Bicep Curls": "Arms", "Hammer Curls": "Arms", "Tricep Dips": "Arms",
  "Tricep Extension": "Arms", "Close-grip Push-ups": "Arms", "Preacher Curl": "Arms",
  "Concentration Curl": "Arms", "Curl to Press": "Arms",
  "Bodyweight Squats": "Legs", "Walking Lunges": "Legs", "Glute Bridges": "Legs",
  "Wall Sit": "Legs", "Calf Raises": "Legs", "Bulgarian Split Squats": "Legs",
  "Romanian Deadlift": "Legs", "Goblet Squats": "Legs", "Step-ups": "Legs",
  "Jump Squats": "Legs", "Squats": "Legs", "Lunges": "Legs",
  "Plank": "Core", "Russian Twist": "Core", "Leg Raises": "Core",
  "Bicycle Crunches": "Core", "Mountain Climbers": "Core", "Hanging Knee Raises": "Core",
  "Plank Reaches": "Core", "Dead Bug": "Core",
  "Burpees": "Full Body", "Jumping Jacks": "Full Body", "High Knees": "Full Body",
  "Squat Thrusts": "Full Body", "Bear Crawl": "Full Body", "Tuck Jumps": "Full Body",
  "Box Jumps": "Full Body",
  "Sprints": "Cardio", "Sprint": "Cardio", "Jump Rope": "Cardio", "Battle Ropes": "Cardio",
}

function toDateId(date: Date) {
  return date.toISOString().split("T")[0]
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function calculateLongestStreak(logs: WorkoutLog[]) {
  const timestamps = Array.from(
    new Set(logs.map((log) => {
      const date = new Date(log.completedAt)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    })),
  ).sort((a, b) => a - b)

  let best = 0, current = 0
  let previous: number | null = null
  const oneDay = 24 * 60 * 60 * 1000

  timestamps.forEach((ts) => {
    current = previous !== null && ts - previous === oneDay ? current + 1 : 1
    best = Math.max(best, current)
    previous = ts
  })
  return best
}

function calculateBmi(heightCm: string, weightKg: string) {
  const h = Number(heightCm), w = Number(weightKg)
  if (!h || !w) return null
  return Math.round((w / ((h / 100) ** 2)) * 10) / 10
}

function getBmiStatus(bmi: number | null) {
  if (!bmi) return { label: "Not set", color: "var(--text-muted)", position: 0 }
  if (bmi < 18.5) return { label: "Underweight", color: "#82a7ff", position: 22 }
  if (bmi < 25)   return { label: "Healthy", color: "#6bbfb8", position: 49 }
  if (bmi < 30)   return { label: "Overweight", color: "#e7c85a", position: 67 }
  return { label: "High BMI", color: "#e76f6f", position: 86 }
}

function getTopMuscles(logs: WorkoutLog[]) {
  const counts: Record<string, number> = {}
  logs.forEach((log) => {
    log.exercises.forEach((ex) => {
      const g = muscleMap[ex.name] || "Other"
      counts[g] = (counts[g] || 0) + 1
    })
  })
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([group, count]) => ({ group, pct: total ? Math.round((count / total) * 100) : 0 }))
}

/* ─── Input style shared ─────────────────────────────────────── */
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

export default function ReportPage() {
  const { status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [hasInjury, setHasInjury] = useState(false)
  const [injuryNotes, setInjuryNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    const load = async () => {
      setLoading(true)
      try {
        const [profileRes, logRes, streakRes] = await Promise.all([
          fetch("/api/onboarding"),
          fetch("/api/workout-log"),
          fetch("/api/streak"),
        ])
        if (profileRes.ok) {
          const p = (await profileRes.json()) as ProfileData
          setProfile(p)
          setHeightCm(p.heightCm ? String(p.heightCm) : "")
          setWeightKg(p.weightKg ? String(p.weightKg) : "")
          setHasInjury(Boolean(p.hasInjury))
          setInjuryNotes(p.injuryNotes || "")
        }
        if (logRes.ok) setLogs(await logRes.json())
        if (streakRes.ok) setStreak(await streakRes.json())
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
  const totalExercises = logs.reduce((sum, log) => sum + log.exercises.length, 0)

  const [today, setToday] = useState<Date | null>(null)
  const [weekNumber, setWeekNumber] = useState<number | null>(null)
  useEffect(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
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
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: heightCm ? Number(heightCm) : null,
          weightKg: weightKg ? Number(weightKg) : null,
          hasInjury,
          injuryNotes,
        }),
      })
      if (!res.ok) throw new Error()
      const next = (await res.json()) as ProfileData
      setProfile((cur) => ({ ...(cur || next), ...next }))
      setMessage("Body report updated.")
    } catch {
      setMessage("Could not save changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: "22px 16px 140px", minHeight: "100vh", background: "transparent" }}>
      <motion.div variants={stagger} initial="hidden" animate="visible">

        {/* ── Header ───────────────────────────────────────────── */}
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
          <button
            type="button"
            style={{
              width: 36, height: 36, flexShrink: 0,
              display: "grid", placeItems: "center",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        </motion.header>

        {/* ── Skeletons ─────────────────────────────────────────── */}
        {loading ? (
          <motion.div variants={fadeUp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SkeletonCard height="196px" />
            <SkeletonCard height="72px" />
            <SkeletonCard height="280px" />
            <SkeletonCard height="120px" />
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── 1. Streak hero card ───────────────────────────── */}
            <motion.section
              variants={fadeUp}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 26,
                background: "linear-gradient(148deg, #193d35 0%, #0c1e1b 100%)",
                border: "1px solid rgba(107,191,184,0.24)",
                boxShadow: [
                  "inset 0 0 0 1px rgba(255,255,255,0.05)",
                  "inset 0 1px 0 rgba(107,191,184,0.18)",
                  "0 22px 52px rgba(0,0,0,0.44)",
                ].join(", "),
              }}
            >
              {/* Top refraction */}
              <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg, transparent, rgba(107,191,184,0.48), transparent)", pointerEvents: "none" }} />
              {/* Ambient glow */}
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 14% -14%, rgba(107,191,184,0.2), transparent 54%)", pointerEvents: "none" }} />
              {/* Flame */}
              <div style={{ position: "absolute", right: 16, top: 16, opacity: 0.7, filter: "saturate(1.1) brightness(1.05)", pointerEvents: "none" }}>
                <FlameIcon size={54} />
              </div>

              {/* Numbers */}
              <div style={{ position: "relative", padding: "22px 22px 16px" }}>
                <div className="label-text" style={{ fontSize: 10, color: "#6bbfb8", marginBottom: 8 }}>
                  Current Streak
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="number-text" style={{ fontSize: "clamp(46px, 13vw, 58px)", fontWeight: 900, lineHeight: 1, color: "#fff" }}>
                    {streak?.streak ?? 0}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.42)" }}>
                    {(streak?.streak ?? 0) === 1 ? "day" : "days"}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                  Personal best ·{" "}
                  <span style={{ color: "#6bbfb8", fontWeight: 900 }}>
                    {longestStreak} {longestStreak === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>

              {/* Week strip */}
              <div style={{ borderTop: "1px solid rgba(107,191,184,0.16)", padding: "14px 22px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 7 }}>
                  {weekDays.map((day, i) => {
                    const dateId = toDateId(day)
                    const isToday = today ? dateId === toDateId(today) : false
                    const completed = completedDates.has(dateId)
                    return (
                      <div key={dateId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: isToday ? "#6bbfb8" : "rgba(255,255,255,0.28)" }}>
                          {DAY_LETTERS[i]}
                        </span>
                        <div style={{
                          width: "100%", height: 34,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: 9,
                          background: isToday ? "#6bbfb8" : completed ? "rgba(107,191,184,0.16)" : "rgba(255,255,255,0.05)",
                          border: isToday ? "none" : completed ? "1px solid rgba(107,191,184,0.32)" : "1px solid rgba(255,255,255,0.07)",
                          boxShadow: isToday ? "0 0 12px rgba(107,191,184,0.36)" : "none",
                        }}>
                          {isToday || completed ? (
                            <Check size={12} strokeWidth={3} style={{ color: isToday ? "#0a1a18" : "#6bbfb8" }} />
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.24)" }}>
                              {day.getDate()}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.section>

            {/* ── 2. Stats triptych — one unified panel, no separate cards ── */}
            <motion.section variants={fadeUp}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "var(--panel)",
                overflow: "hidden",
                boxShadow: "var(--shadow)",
              }}>
                {[
                  {
                    label: "Weight",
                    value: weightKg || "--",
                    unit: weightKg ? "kg" : "",
                  },
                  {
                    label: "Sessions",
                    value: String(logs.length),
                    unit: profile?.workoutsPerWeek ? `/ ${profile.workoutsPerWeek}` : "",
                  },
                  {
                    label: "Exercises",
                    value: String(totalExercises),
                    unit: "",
                  },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{
                      padding: "16px 14px",
                      borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div className="label-text" style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 7 }}>
                      {stat.label}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexWrap: "wrap" }}>
                      <span className="number-text" style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>
                        {stat.value}
                      </span>
                      {stat.unit && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                          {stat.unit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── 3. BMI + form ─────────────────────────────────── */}
            <motion.section
              variants={fadeUp}
              className="ios-inset-grouped"
              style={{ overflow: "hidden" }}
            >
              {/* BMI display */}
              <div style={{ padding: "20px 20px 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <span className="label-text" style={{ fontSize: 10, color: "#6bbfb8" }}>BMI</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="number-text" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: "var(--text)" }}>
                      {bmi ? bmi.toFixed(1) : "--"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: bmiStatus.color }}>
                      {bmiStatus.label}
                    </span>
                  </div>
                </div>

                {/* Colour bar */}
                <div style={{ position: "relative", height: 13, borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1.35fr 1fr 1fr" }}>
                    <div style={{ background: "#5266dd" }} />
                    <div style={{ background: "#6bc7c0" }} />
                    <div style={{ background: "#e7c85a" }} />
                    <div style={{ background: "#e76f6f" }} />
                  </div>
                  {bmi && (
                    <div
                      style={{
                        position: "absolute", top: 0, bottom: 0,
                        left: `calc(${bmiStatus.position}% - 1.5px)`,
                        width: 3, borderRadius: 999,
                        background: "rgba(255,255,255,0.94)",
                        boxShadow: "0 0 6px rgba(255,255,255,0.6)",
                        transition: "left 0.35s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    />
                  )}
                </div>

                {/* Scale labels */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  {["15", "18.5", "25", "30", "40"].map((l) => (
                    <span key={l} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{l}</span>
                  ))}
                </div>

                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 20 }}>
                  Used as context only, not a judgment.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={saveMetrics}
                style={{
                  borderTop: "1px solid var(--border)",
                  padding: "18px 20px 20px",
                  display: "flex", flexDirection: "column", gap: 12,
                }}
              >
                {/* Height + Weight inputs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                      <Ruler size={12} strokeWidth={2} /> Height
                    </span>
                    <input
                      type="number" min="50" max="260"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="cm"
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                      <Scale size={12} strokeWidth={2} /> Weight
                    </span>
                    <input
                      type="number" min="20" max="400" step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="kg"
                      style={inputStyle}
                    />
                  </label>
                </div>

                {/* Injury toggle */}
                <button
                  type="button"
                  onClick={() => setHasInjury((v) => !v)}
                  className="motion-lift"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "13px 15px",
                    borderRadius: 18,
                    border: hasInjury ? "1px solid rgba(231,111,111,0.34)" : "1px solid var(--border)",
                    background: hasInjury ? "rgba(231,111,111,0.08)" : "var(--surface-2)",
                    cursor: "pointer", textAlign: "left" as const,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      width: 34, height: 34, flexShrink: 0,
                      display: "grid", placeItems: "center",
                      borderRadius: 11,
                      background: "var(--panel)",
                      color: "var(--accent-strong)",
                    }}>
                      <ShieldCheck size={16} strokeWidth={1.8} />
                    </span>
                    <span>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 900, color: "var(--text)" }}>
                        Injury note
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                        {hasInjury ? "FitSched will stay cautious." : "No active injury marked."}
                      </span>
                    </span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", flexShrink: 0 }}>
                    {hasInjury ? "On" : "Off"}
                  </span>
                </button>

                {/* Injury notes */}
                <AnimatePresence>
                  {hasInjury && (
                    <motion.label
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                        <PencilLine size={12} strokeWidth={2} /> Notes
                      </span>
                      <textarea
                        value={injuryNotes}
                        onChange={(e) => setInjuryNotes(e.target.value)}
                        placeholder="Example: avoid heavy knee impact this week."
                        style={{ ...inputStyle, minHeight: 88, resize: "vertical", lineHeight: 1.5, fontWeight: 600 }}
                      />
                    </motion.label>
                  )}
                </AnimatePresence>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="motion-lift"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "14px",
                    borderRadius: 18,
                    border: "1px solid var(--border-strong)",
                    background: "var(--accent)",
                    color: "#0a1a18",
                    fontSize: 14, fontWeight: 900,
                    cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  <Save size={15} strokeWidth={2.2} />
                  {saving ? "Saving…" : "Update report"}
                </button>

                {message && (
                  <p style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                    {message}
                  </p>
                )}
              </form>
            </motion.section>

            {/* ── 4. Most Trained — no card, just raw section ───── */}
            <motion.section variants={fadeUp}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span className="label-text" style={{ fontSize: 10, color: "#6bbfb8" }}>Most Trained</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>last 30 days</span>
              </div>

              {topMuscles.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {topMuscles.map((muscle, index) => (
                    <div key={muscle.group}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>
                          {muscle.group}
                        </span>
                        <span className="number-text" style={{ fontSize: 14, fontWeight: 900, color: "var(--accent-strong)" }}>
                          {muscle.pct}%
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.07)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${muscle.pct}%` }}
                          transition={{ duration: 0.75, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                          style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #3d9a93, #6bbfb8)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                  padding: "36px 20px",
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  textAlign: "center",
                }}>
                  <div style={{
                    width: 50, height: 50,
                    display: "grid", placeItems: "center",
                    borderRadius: 15,
                    border: "1px solid var(--border)",
                    background: "var(--panel)",
                    color: "var(--text-muted)",
                  }}>
                    <Activity size={22} strokeWidth={1.6} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.5, maxWidth: 220 }}>
                    Complete a workout to see your muscle patterns here.
                  </p>
                </div>
              )}
            </motion.section>

          </div>
        )}
      </motion.div>
    </div>
  )
}
