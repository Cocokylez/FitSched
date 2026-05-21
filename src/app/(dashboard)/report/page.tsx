"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
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
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as const } },
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"]

const muscleMap: Record<string, string> = {
  "Push-ups": "Chest",
  "Diamond Push-ups": "Chest",
  "Wide Push-ups": "Chest",
  "Incline Push-ups": "Chest",
  "Decline Push-ups": "Chest",
  "Bench Press": "Chest",
  "Dumbbell Fly": "Chest",
  "Chest Dips": "Chest",
  "Pull-ups": "Back",
  "Chin-ups": "Back",
  "Bent-over Row": "Back",
  "Dumbbell Row": "Back",
  "Superman Hold": "Back",
  "Reverse Fly": "Back",
  "Deadlift": "Back",
  "Lat Pulldown": "Back",
  "Pike Push-ups": "Shoulders",
  "Lateral Raises": "Shoulders",
  "Front Raises": "Shoulders",
  "Overhead Press": "Shoulders",
  "Arnold Press": "Shoulders",
  "Face Pull": "Shoulders",
  "Shrugs": "Shoulders",
  "Bicep Curls": "Arms",
  "Hammer Curls": "Arms",
  "Tricep Dips": "Arms",
  "Tricep Extension": "Arms",
  "Close-grip Push-ups": "Arms",
  "Preacher Curl": "Arms",
  "Concentration Curl": "Arms",
  "Bodyweight Squats": "Legs",
  "Walking Lunges": "Legs",
  "Glute Bridges": "Legs",
  "Wall Sit": "Legs",
  "Calf Raises": "Legs",
  "Bulgarian Split Squats": "Legs",
  "Romanian Deadlift": "Legs",
  "Goblet Squats": "Legs",
  "Step-ups": "Legs",
  "Jump Squats": "Legs",
  "Squats": "Legs",
  "Lunges": "Legs",
  "Plank": "Core",
  "Russian Twist": "Core",
  "Leg Raises": "Core",
  "Bicycle Crunches": "Core",
  "Mountain Climbers": "Core",
  "Hanging Knee Raises": "Core",
  "Plank Reaches": "Core",
  "Dead Bug": "Core",
  "Burpees": "Full Body",
  "Jumping Jacks": "Full Body",
  "High Knees": "Full Body",
  "Squat Thrusts": "Full Body",
  "Bear Crawl": "Full Body",
  "Tuck Jumps": "Full Body",
  "Box Jumps": "Full Body",
  "Curl to Press": "Arms",
  "Sprints": "Cardio",
  "Sprint": "Cardio",
  "Jump Rope": "Cardio",
  "Battle Ropes": "Cardio",
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

  let best = 0
  let current = 0
  let previous: number | null = null
  const oneDay = 24 * 60 * 60 * 1000

  timestamps.forEach((timestamp) => {
    current = previous !== null && timestamp - previous === oneDay ? current + 1 : 1
    best = Math.max(best, current)
    previous = timestamp
  })

  return best
}

function calculateBmi(heightCm: string, weightKg: string) {
  const height = Number(heightCm)
  const weight = Number(weightKg)
  if (!height || !weight) return null
  return Math.round((weight / ((height / 100) ** 2)) * 10) / 10
}

function getBmiStatus(bmi: number | null) {
  if (!bmi) return { label: "Not set", color: "var(--text-muted)", position: 0 }
  if (bmi < 18.5) return { label: "Underweight", color: "#82a7ff", position: 22 }
  if (bmi < 25) return { label: "Healthy range", color: "#6bbfb8", position: 49 }
  if (bmi < 30) return { label: "Overweight", color: "#e7c85a", position: 67 }
  return { label: "High BMI", color: "#e76f6f", position: 86 }
}

function getTopMuscles(logs: WorkoutLog[]) {
  const counts: Record<string, number> = {}

  logs.forEach((log) => {
    log.exercises.forEach((exercise) => {
      const group = muscleMap[exercise.name] || "Other"
      counts[group] = (counts[group] || 0) + 1
    })
  })

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([group, count]) => ({ group, pct: total ? Math.round((count / total) * 100) : 0 }))
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
          const nextProfile = (await profileRes.json()) as ProfileData
          setProfile(nextProfile)
          setHeightCm(nextProfile.heightCm ? String(nextProfile.heightCm) : "")
          setWeightKg(nextProfile.weightKg ? String(nextProfile.weightKg) : "")
          setHasInjury(Boolean(nextProfile.hasInjury))
          setInjuryNotes(nextProfile.injuryNotes || "")
        }

        if (logRes.ok) setLogs(await logRes.json())
        if (streakRes.ok) setStreak(await streakRes.json())
      } catch {
        setMessage("Report data could not load. Try again in a moment.")
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

      if (!res.ok) throw new Error("Unable to save report")

      const nextProfile = (await res.json()) as ProfileData
      setProfile((current) => ({ ...(current || nextProfile), ...nextProfile }))
      setMessage("Body report updated.")
    } catch {
      setMessage("Could not save changes.")
    } finally {
      setSaving(false)
    }
  }

  /*
   * Layout notes:
   * - No min-h-dvh: the scroll container (main.dashboard-main) already owns
   *   the viewport height. Adding min-h-dvh here interferes with padding math.
   * - pt-14 (56px): gives clear breathing room below any status bar on mobile.
   * - pb-[180px]: 94px nav clearance + 86px extra. Unambiguous on all devices.
   * - gap-8 (32px): enough visual separation between every section.
   * - All cards use p-6 (24px) consistently — no text touches an edge.
   */
  return (
    <div className="w-full px-5 pt-14 pb-[180px] sm:px-6">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-[540px]"
      >

        {/* ── Page header ──────────────────────────────────── */}
        <motion.header
          variants={fadeUp}
          className="mb-12 flex items-center justify-between"
        >
          <div>
            <p className="label-text mb-2 text-[11px] text-[var(--text-muted)]">
              {weekNumber ? `WEEK ${weekNumber} · ` : ""}THIS WEEK
            </p>
            <h1 className="display-text text-[36px] font-black leading-none tracking-tight text-[var(--text)]">
              Report
            </h1>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
          >
            <MoreHorizontal size={18} strokeWidth={2} />
          </button>
        </motion.header>

        {/* ── Loading skeletons ─────────────────────────────── */}
        {loading ? (
          <motion.div variants={fadeUp} className="flex flex-col gap-8">
            <SkeletonCard height="200px" />
            <SkeletonCard height="120px" />
            <SkeletonCard height="220px" />
          </motion.div>
        ) : (

          /* ── Content grid ──────────────────────────────── */
          <div className="flex flex-col gap-8">

            {/* ── 1. Current Streak hero card ──────────────── */}
            <motion.section
              variants={fadeUp}
              className="relative overflow-hidden rounded-[28px]"
              style={{
                background: "linear-gradient(145deg, #1e4a42 0%, #0f2420 100%)",
                border: "1px solid rgba(107,191,184,0.3)",
                boxShadow: [
                  "0 0 0 1px rgba(255,255,255,0.06) inset",
                  "0 1px 0 rgba(107,191,184,0.22) inset",
                  "0 24px 56px rgba(0,0,0,0.45)",
                ].join(", "),
              }}
            >
              {/* Top refraction line */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(107,191,184,0.55), transparent)" }}
              />
              {/* Ambient glow blob */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(ellipse at 18% -18%, rgba(107,191,184,0.24), transparent 58%)" }}
              />

              {/* Streak number area — 24px padding all sides */}
              <div className="relative px-6 pt-6 pb-5">
                {/* Flame — sized so it doesn't crowd the text on small screens */}
                <div
                  className="absolute right-4 top-4 opacity-75"
                  style={{ filter: "saturate(1.1) brightness(1.06)" }}
                >
                  <FlameIcon size={56} />
                </div>

                <div
                  className="mb-1.5 text-[11px] font-black uppercase tracking-[0.22em]"
                  style={{ color: "#6bbfb8" }}
                >
                  Current Streak
                </div>

                <div className="flex items-baseline gap-2">
                  <span
                    className="number-text font-black leading-none"
                    style={{ fontSize: "clamp(44px, 12vw, 58px)", color: "#ffffff" }}
                  >
                    {streak?.streak ?? 0}
                  </span>
                  <span
                    className="text-[18px] font-bold"
                    style={{ color: "rgba(255,255,255,0.48)" }}
                  >
                    {(streak?.streak ?? 0) === 1 ? "day" : "days"}
                  </span>
                </div>

                <div
                  className="mt-2.5 text-[13px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.46)" }}
                >
                  Personal best ·{" "}
                  <span className="font-black" style={{ color: "#6bbfb8" }}>
                    {longestStreak} {longestStreak === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>

              {/* Week day strip — clear separator, generous vertical rhythm */}
              <div
                className="px-6 pt-5 pb-6"
                style={{ borderTop: "1px solid rgba(107,191,184,0.18)" }}
              >
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, i) => {
                    const dateId = toDateId(day)
                    const isToday = today ? dateId === toDateId(today) : false
                    const completed = completedDates.has(dateId)
                    return (
                      <div key={dateId} className="flex flex-col items-center gap-2">
                        <span
                          className="text-[9px] font-black uppercase tracking-wider"
                          style={{ color: isToday ? "#6bbfb8" : "rgba(255,255,255,0.32)" }}
                        >
                          {DAY_LETTERS[i]}
                        </span>
                        <div
                          className="flex w-full items-center justify-center rounded-[10px]"
                          style={{
                            height: "38px",
                            background: isToday
                              ? "#6bbfb8"
                              : completed
                                ? "rgba(107,191,184,0.2)"
                                : "rgba(255,255,255,0.05)",
                            border: isToday
                              ? "none"
                              : completed
                                ? "1px solid rgba(107,191,184,0.38)"
                                : "1px solid rgba(255,255,255,0.08)",
                            boxShadow: isToday ? "0 0 16px rgba(107,191,184,0.42)" : "none",
                          }}
                        >
                          {isToday || completed ? (
                            <Check
                              size={13}
                              strokeWidth={3}
                              style={{ color: isToday ? "#0b1715" : "#6bbfb8" }}
                            />
                          ) : (
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: "rgba(255,255,255,0.28)" }}
                            >
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

            {/* ── 2. Weight / Sessions row ──────────────────── */}
            <motion.section variants={fadeUp} className="grid grid-cols-2 gap-4">
              {/* Weight */}
              <div
                className="ios-inset-grouped p-6"
                style={{
                  boxShadow: "var(--shadow-md)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <div
                  className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]"
                  style={{ color: "#6bbfb8" }}
                >
                  Weight
                </div>
                <div className="number-text flex items-baseline gap-1.5 leading-none">
                  <span className="text-[34px] font-black text-[var(--text)]">
                    {weightKg || <span style={{ color: "var(--text-muted)" }}>--</span>}
                  </span>
                  <span className="text-[14px] font-bold text-[var(--text-muted)]">kg</span>
                </div>
              </div>

              {/* Sessions */}
              <div
                className="ios-inset-grouped p-6"
                style={{
                  boxShadow: "var(--shadow-md)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <div
                  className="mb-3 text-[11px] font-black uppercase tracking-[0.18em]"
                  style={{ color: "#6bbfb8" }}
                >
                  Sessions
                </div>
                <div className="number-text flex items-baseline gap-1.5 leading-none">
                  <span className="text-[34px] font-black text-[var(--text)]">
                    {logs.length}
                  </span>
                  {profile?.workoutsPerWeek ? (
                    <span className="text-[15px] font-semibold text-[var(--text-muted)]">
                      / {profile.workoutsPerWeek}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-[12px] text-[var(--text-muted)]">
                  {totalExercises} exercises
                </div>
              </div>
            </motion.section>

            {/* ── 3. BMI card ───────────────────────────────── */}
            <motion.section
              variants={fadeUp}
              className="ios-inset-grouped overflow-hidden p-6"
              style={{
                boxShadow: "var(--shadow-md)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              {/* BMI header row */}
              <div className="mb-6 flex items-center justify-between gap-3">
                <span
                  className="text-[11px] font-black uppercase tracking-[0.18em]"
                  style={{ color: "#6bbfb8" }}
                >
                  BMI
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="number-text text-[30px] font-black leading-none text-[var(--text)]">
                    {bmi ? bmi.toFixed(1) : "--"}
                  </span>
                  <span className="text-[13px] font-bold" style={{ color: bmiStatus.color }}>
                    {bmiStatus.label}
                  </span>
                </div>
              </div>

              {/* BMI colour bar */}
              <div className="relative mb-2 h-[14px] overflow-hidden rounded-full">
                <div className="absolute inset-0 grid grid-cols-[1fr_1.35fr_1fr_1fr]">
                  <div className="bg-[#5266dd]" />
                  <div className="bg-[#6bc7c0]" />
                  <div className="bg-[#e7c85a]" />
                  <div className="bg-[#e76f6f]" />
                </div>
                {/* Marker — sits on top of the bar */}
                {bmi && (
                  <div
                    className="absolute top-0 h-full w-[3px] rounded-full bg-white transition-[left] duration-300"
                    style={{
                      left: `calc(${bmiStatus.position}% - 1.5px)`,
                      boxShadow: "0 0 6px rgba(255,255,255,0.8)",
                    }}
                  />
                )}
              </div>

              {/* Scale labels */}
              <div className="mb-6 flex justify-between text-[11px] font-bold text-[var(--text-muted)]">
                <span>15</span>
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>40</span>
              </div>

              <div className="mb-6 text-[12px] leading-relaxed text-[var(--text-muted)]">
                Used as context only, not a judgment.
              </div>

              {/* Input form */}
              <form
                onSubmit={saveMetrics}
                className="flex flex-col gap-4 border-t border-[var(--border)] pt-6"
              >
                {/* Height + Weight inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-[var(--text-muted)]">
                      <Ruler size={13} strokeWidth={2} />
                      Height
                    </span>
                    <input
                      type="number"
                      min="50"
                      max="260"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="cm"
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3.5 text-[15px] font-bold text-[var(--text)] outline-none focus:border-[var(--border-strong)]"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-[var(--text-muted)]">
                      <Scale size={13} strokeWidth={2} />
                      Weight
                    </span>
                    <input
                      type="number"
                      min="20"
                      max="400"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="kg"
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3.5 text-[15px] font-bold text-[var(--text)] outline-none focus:border-[var(--border-strong)]"
                    />
                  </label>
                </div>

                {/* Injury toggle */}
                <button
                  type="button"
                  onClick={() => setHasInjury((v) => !v)}
                  className={`motion-lift flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors ${
                    hasInjury
                      ? "border-[rgba(231,111,111,0.36)] bg-[rgba(231,111,111,0.09)]"
                      : "border-[var(--border)] bg-[var(--surface-2)]"
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--panel)] text-[var(--accent-strong)]">
                      <ShieldCheck size={18} strokeWidth={1.8} />
                    </span>
                    <span>
                      <span className="block text-[14px] font-black text-[var(--text)]">
                        Injury note
                      </span>
                      <span className="mt-0.5 block text-[12px] text-[var(--text-muted)]">
                        {hasInjury
                          ? "FitSched will stay cautious."
                          : "No active injury marked."}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-black text-[var(--text-muted)]">
                    {hasInjury ? "On" : "Off"}
                  </span>
                </button>

                {/* Injury notes textarea */}
                {hasInjury && (
                  <label className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 text-[12px] font-extrabold text-[var(--text-muted)]">
                      <PencilLine size={13} strokeWidth={2} />
                      Notes
                    </span>
                    <textarea
                      value={injuryNotes}
                      onChange={(e) => setInjuryNotes(e.target.value)}
                      placeholder="Example: avoid heavy knee impact this week."
                      className="min-h-[96px] resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3.5 text-[14px] font-semibold leading-relaxed text-[var(--text)] outline-none focus:border-[var(--border-strong)]"
                    />
                  </label>
                )}

                {/* Save button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="motion-lift flex items-center justify-center gap-2.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--accent)] px-4 py-4 text-[15px] font-black text-[#0b1715] disabled:opacity-60"
                >
                  <Save size={16} strokeWidth={2.2} />
                  {saving ? "Saving…" : "Update report"}
                </button>

                {message && (
                  <p className="text-center text-[13px] font-bold text-[var(--text-muted)]">
                    {message}
                  </p>
                )}
              </form>
            </motion.section>

            {/* ── 4. Most Trained ───────────────────────────── */}
            <motion.section
              variants={fadeUp}
              className="ios-inset-grouped p-6"
              style={{
                boxShadow: "var(--shadow-md)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <div className="mb-6 flex items-center justify-between">
                <span
                  className="text-[11px] font-black uppercase tracking-[0.18em]"
                  style={{ color: "#6bbfb8" }}
                >
                  Most Trained
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">last 30 days</span>
              </div>

              {topMuscles.length > 0 ? (
                <div className="flex flex-col gap-5">
                  {topMuscles.map((muscle, index) => (
                    <div key={muscle.group}>
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-[14px] font-extrabold text-[var(--text)]">
                          {muscle.group}
                        </span>
                        <span
                          className="number-text text-[14px] font-black"
                          style={{ color: "var(--accent-strong)" }}
                        >
                          {muscle.pct}%
                        </span>
                      </div>
                      <div
                        className="h-[8px] overflow-hidden rounded-full"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${muscle.pct}%` }}
                          transition={{
                            duration: 0.72,
                            delay: index * 0.1,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg, #4a9e98, #6bbfb8)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-6 py-10 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-[16px] border border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)]">
                    <Activity size={24} strokeWidth={1.6} />
                  </div>
                  <p className="text-[14px] font-semibold leading-relaxed text-[var(--text-muted)]">
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
