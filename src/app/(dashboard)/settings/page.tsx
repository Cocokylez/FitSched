"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { SkeletonCard } from "@/components/Skeleton"

const ACCENT = "#6bbfb8"

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
  fontSize: "10px",
  fontWeight: "600",
  letterSpacing: "0.12em",
  color: "var(--text-muted)",
  marginBottom: "8px",
  marginTop: "22px",
  textTransform: "uppercase" as const,
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
}

const EXERCISE_MUSCLE: Record<string, string> = {
  "Push-ups": "Chest", "Diamond Push-ups": "Chest", "Wide Push-ups": "Chest",
  "Incline Push-ups": "Chest", "Decline Push-ups": "Chest", "Bench Press": "Chest",
  "Dumbbell Fly": "Chest", "Chest Dips": "Chest",
  "Pull-ups": "Back", "Chin-ups": "Back", "Bent-over Row": "Back",
  "Dumbbell Row": "Back", "Superman Hold": "Back", "Reverse Fly": "Back",
  "Deadlift": "Back", "Lat Pulldown": "Back",
  "Pike Push-ups": "Shoulders", "Lateral Raises": "Shoulders", "Front Raises": "Shoulders",
  "Overhead Press": "Shoulders", "Arnold Press": "Shoulders", "Face Pull": "Shoulders",
  "Shrugs": "Shoulders",
  "Bicep Curls": "Arms", "Hammer Curls": "Arms", "Tricep Dips": "Arms",
  "Tricep Extension": "Arms", "Close-grip Push-ups": "Arms", "Preacher Curl": "Arms",
  "Concentration Curl": "Arms",
  "Bodyweight Squats": "Legs", "Walking Lunges": "Legs", "Glute Bridges": "Legs",
  "Wall Sit": "Legs", "Calf Raises": "Legs", "Bulgarian Split Squats": "Legs",
  "Romanian Deadlift": "Legs", "Goblet Squats": "Legs", "Step-ups": "Legs",
  "Jump Squats": "Legs", "Squats": "Legs", "Lunges": "Legs",
  "Plank": "Core", "Russian Twist": "Core", "Leg Raises": "Core",
  "Bicycle Crunches": "Core", "Mountain Climbers": "Core", "Hanging Knee Raises": "Core",
  "Plank Reaches": "Core", "Dead Bug": "Core",
  "Burpees": "Full Body", "Jumping Jacks": "Full Body", "High Knees": "Full Body",
  "Squat Thrusts": "Full Body", "Bear Crawl": "Full Body", "Tuck Jumps": "Full Body",
  "Box Jumps": "Full Body", "Curl to Press": "Arms",
  "Sprints": "Cardio", "Sprint": "Cardio", "Jump Rope": "Cardio", "Battle Ropes": "Cardio",
}

interface WorkoutLog {
  id: string
  date: string
  workoutName: string
  completedAt: string
  exercises: Array<{ name: string; sets: number; reps: number }>
}

interface ProfileData {
  workoutsPerWeek?: number | null
}

interface FitTokenData {
  balance: number
  transactions: Array<{
    id: string
    amount: number
    reason: string
    createdAt: string
    workoutName: string
  }>
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "User"
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function getMuscleGroup(name: string) {
  return EXERCISE_MUSCLE[name] || "Other"
}

function toDateId(date: Date) {
  return date.toISOString().split("T")[0]
}

function getWeekId(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return toDateId(monday)
}

function calculateCurrentStreak(logs: WorkoutLog[]) {
  const uniqueDates = new Set(logs.map((log) => toDateId(new Date(log.completedAt))))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  for (let i = 0; i < 365; i++) {
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    if (!uniqueDates.has(toDateId(expected))) break
    streak++
  }

  return streak
}

function calculateLongestStreak(logs: WorkoutLog[]) {
  const timestamps = Array.from(
    new Set(logs.map((log) => {
      const date = new Date(log.completedAt)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    }))
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

function getCurrentWeekCount(logs: WorkoutLog[]) {
  const thisWeek = getWeekId(new Date())
  return logs.filter((log) => getWeekId(new Date(log.completedAt)) === thisWeek).length
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

    return {
      week: id,
      actual: logsByWeek[id] || 0,
      planned: workoutsPerWeek,
    }
  })
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame = 0
    const totalFrames = 34
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / 850, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      frame++

      if (progress < 1 && frame < totalFrames * 2) requestAnimationFrame(tick)
    }

    const animation = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animation)
  }, [value])

  return <>{display}{suffix}</>
}

function formatFitTokenAmount(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatTokenReason(reason: string, workoutName: string) {
  if (reason === "streak_bonus") return "Streak bonus"
  if (reason === "workout_complete") return `${workoutName} workout`
  return reason.replace(/_/g, " ")
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t, language, cycleLanguage } = useLanguage()
  const [isCalendarConnected, setIsCalendarConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [fitTokens, setFitTokens] = useState<FitTokenData>({
    balance: 0,
    transactions: [],
  })

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  const checkCalendar = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/sync")
      if (res.ok) {
        const data = await res.json()
        setIsCalendarConnected(data.connected)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return

    const load = async () => {
      setLoading(true)
      try {
        const [calendarRes, logRes, profileRes, tokenRes] = await Promise.all([
          fetch("/api/calendar/sync"),
          fetch("/api/workout-log"),
          fetch("/api/onboarding"),
          fetch("/api/tokens"),
        ])

        if (calendarRes.ok) {
          const data = await calendarRes.json()
          setIsCalendarConnected(data.connected)
        }

        if (logRes.ok) {
          setLogs(await logRes.json())
        }

        if (profileRes.ok) {
          const profile = (await profileRes.json()) as ProfileData
          if (profile.workoutsPerWeek) setWorkoutsPerWeek(profile.workoutsPerWeek)
        }

        if (tokenRes.ok) {
          setFitTokens((await tokenRes.json()) as FitTokenData)
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
      if (res.ok) {
        const data = await res.json()
        window.location.href = data.url
      }
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
      if (res.ok) setIsCalendarConnected(false)
    } catch {}
  }

  const togglePush = async () => {
    if (!("Notification" in window)) return
    if (pushEnabled) { setPushEnabled(false); return }
    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      setPushEnabled(true)
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""),
        })
        await fetch("/api/push/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        })
      } catch {}
    }
  }

  const profileName = session?.user?.name || t.user
  const profileEmail = session?.user?.email || ""
  const initials = getInitials(profileName, profileEmail)

  const stats = useMemo(() => {
    const totalWorkouts = logs.length
    const totalExercisesDone = logs.reduce((sum, log) => sum + (log.exercises?.length || 0), 0)
    const currentWeek = getCurrentWeekCount(logs)
    const currentStreak = calculateCurrentStreak(logs)
    const longestStreak = calculateLongestStreak(logs)

    return { totalWorkouts, totalExercisesDone, currentWeek, currentStreak, longestStreak }
  }, [logs])

  const weeklyData = useMemo(
    () => buildWeeklyData(logs, workoutsPerWeek),
    [logs, workoutsPerWeek]
  )

  const topMuscles = useMemo(() => {
    const counts: Record<string, number> = {}

    logs.forEach((log) => {
      const groups = new Set((log.exercises || []).map((exercise) => getMuscleGroup(exercise.name)))
      groups.forEach((group) => {
        counts[group] = (counts[group] || 0) + 1
      })
    })

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([group, count]) => ({
        group,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
  }, [logs])

  const recentLogs = logs.slice(0, 10)
  const currentWeekPct = workoutsPerWeek > 0
    ? Math.min(100, Math.round((stats.currentWeek / workoutsPerWeek) * 100))
    : 0

  return (
    <div style={{ padding: "20px 16px 24px", minHeight: "100vh", background: "var(--bg)" }}>
      <motion.div variants={stagger} initial="hidden" animate="visible">
        <motion.div variants={fadeUp}>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "var(--text)", marginBottom: "18px" }}>
            <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {t.settings}
            </motion.span>
          </div>
        </motion.div>

        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SkeletonCard height="88px" />
            <SkeletonCard height="70px" />
            <SkeletonCard height="160px" />
            <SkeletonCard height="160px" />
          </motion.div>
        ) : (
          <>
            <motion.div variants={fadeUp}>
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(107,191,184,0.9))",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  flexShrink: 0,
                  boxShadow: "0 8px 24px rgba(99,102,241,0.25)",
                }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{profileName}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profileEmail}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              {stats.currentStreak > 0 ? (
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(107, 191, 184, 0.12)",
                  border: "1px solid rgba(107, 191, 184, 0.32)",
                  color: ACCENT,
                  borderRadius: "999px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  marginBottom: "14px",
                }}>
                  <span>🔥</span>
                  <span><AnimatedNumber value={stats.currentStreak} /> day streak</span>
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", margin: "2px 0 16px" }}>
                  Start your streak today
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(107, 191, 184, 0.12)",
                  border: "1px solid rgba(107, 191, 184, 0.32)",
                  color: ACCENT,
                  borderRadius: "999px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                }}>
                  <span style={{
                    width: 20,
                    height: 20,
                    borderRadius: "999px",
                    border: "1px solid rgba(107, 191, 184, 0.38)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "9px",
                    fontWeight: 900,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}>
                    FT
                  </span>
                  <span>FitTokens</span>
                  <span>{formatFitTokenAmount(fitTokens.balance)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/withdrawal")}
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    borderRadius: "999px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Withdrawal
                </button>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { value: stats.totalWorkouts, suffix: "", label: "Workouts completed" },
                  { value: stats.totalExercisesDone, suffix: "", label: "Exercises done" },
                  { value: currentWeekPct, suffix: "%", label: "This week" },
                  { value: stats.longestStreak, suffix: "", label: "Longest streak" },
                ].map((stat, i) => (
                  <div key={i} style={{ ...cardStyle, textAlign: "left", marginBottom: 0, padding: "15px 14px" }}>
                    <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
                      <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.25 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>FitToken Earnings</div>
              <div style={{ ...cardStyle, padding: "6px 0", overflow: "hidden" }}>
                {fitTokens.transactions.length > 0 ? (
                  fitTokens.transactions.map((transaction, index) => (
                    <div
                      key={transaction.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "14px",
                        padding: "12px 16px",
                        borderBottom: index < fitTokens.transactions.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 650, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {formatTokenReason(transaction.reason, transaction.workoutName)}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ color: ACCENT, fontSize: "13px", fontWeight: 800, flexShrink: 0 }}>
                        +{formatFitTokenAmount(transaction.amount)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "18px 16px", color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>
                    Complete a workout to earn your first FitToken.
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>Last 8 Weeks</div>
              <div style={{ ...cardStyle, padding: "14px 12px 8px" }}>
                <ResponsiveContainer width="100%" height={126}>
                  <BarChart data={weeklyData} margin={{ top: 8, right: 6, bottom: 0, left: 6 }}>
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      formatter={(value) => [`${value} workouts`, "Completed"]}
                      labelFormatter={() => "Weekly activity"}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        color: "var(--text)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="actual" radius={[6, 6, 0, 0]} maxBarSize={24}>
                      {weeklyData.map((entry) => (
                        <Cell
                          key={entry.week}
                          fill={entry.actual >= entry.planned ? ACCENT : "var(--border)"}
                          opacity={entry.actual > 0 || entry.actual >= entry.planned ? 1 : 0.55}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>Most Trained</div>
              {topMuscles.length > 0 ? (
                topMuscles.map((muscle, index) => (
                  <div key={muscle.group} style={{ ...cardStyle, padding: "14px 16px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "9px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 650, color: "var(--text)" }}>{muscle.group}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{muscle.pct}%</div>
                    </div>
                    <div style={{ width: "100%", height: 7, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${muscle.pct}%` }}
                        transition={{ duration: 0.75, delay: index * 0.08, ease: "easeOut" }}
                        style={{ height: "100%", background: ACCENT, borderRadius: 999 }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ ...cardStyle, textAlign: "center", padding: "22px" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t.noData}</div>
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.workoutHistory}</div>
            </motion.div>

            {recentLogs.length === 0 ? (
              <motion.div variants={fadeUp}>
                <div style={{ ...cardStyle, textAlign: "center", padding: "24px" }}>
                  <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>{t.noWorkouts}</div>
                </div>
              </motion.div>
            ) : (
              recentLogs.map((log) => {
                const isExpanded = expandedLog === log.id
                return (
                  <motion.div key={log.id} variants={fadeUp}>
                    <div
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      style={{ ...cardStyle, cursor: "pointer", marginBottom: "8px", padding: "14px 16px" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: 650, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {log.workoutName}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
                            {new Date(log.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span style={{ background: "var(--surface-2)", borderRadius: "999px", padding: "4px 10px", fontSize: "11px", color: "var(--text-muted)" }}>
                            {log.exercises.length} {t.exercises}
                          </span>
                          {isExpanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                              {(log.exercises || []).map((exercise, i) => (
                                <div key={`${exercise.name}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", gap: "14px", fontSize: "13px" }}>
                                  <span style={{ color: "var(--text)" }}>{exercise.name}</span>
                                  <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{exercise.sets} x {exercise.reps}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })
            )}

            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.calendar}</div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={cardStyle}>
                {isCalendarConnected ? (
                  <>
                    <div style={{ fontSize: "14px", color: "var(--text)" }}>{t.googleConnected}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{t.readOnly}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button onClick={syncCalendar} disabled={syncing} style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        padding: "8px 16px",
                        color: "var(--text)",
                        fontSize: "13px",
                        cursor: "pointer",
                        opacity: syncing ? 0.5 : 1,
                      }}>
                        {syncing ? t.syncing : t.syncNow}
                      </button>
                      <button onClick={disconnectCalendar} style={{
                        background: "rgba(255,50,50,0.15)",
                        border: "1px solid rgba(255,50,50,0.3)",
                        borderRadius: "10px",
                        padding: "8px 16px",
                        color: "#d96060",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}>
                        {t.disconnect}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "8px 0" }}>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{t.connectCalendar}</div>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.4 }}>
                      {t.syncDescription}
                    </p>
                    <button onClick={connectCalendar} disabled={connecting} style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "10px 20px",
                      color: "var(--text)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      opacity: connecting ? 0.5 : 1,
                    }}>
                      {connecting ? t.connecting : t.signInWithGoogle}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.preferences}</div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", color: "var(--text)" }}>{t.pushNotifications}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{pushEnabled ? t.enabled : t.workoutReminders}</div>
                </div>
                <div onClick={togglePush} style={{ width: 48, height: 28, borderRadius: 14, position: "relative", background: pushEnabled ? ACCENT : "var(--border)", transition: "background 0.2s", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#e8e8e8", position: "absolute", top: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.3)", transition: "transform 0.2s", transform: pushEnabled ? "translateX(24px)" : "translateX(3px)" }} />
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "14px", color: "var(--text)" }}>{t.language}</div>
                <motion.button
                  onClick={cycleLanguage}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "6px 14px",
                    color: "var(--text)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    minWidth: "48px",
                    textAlign: "center",
                  }}
                >
                  <motion.span
                    key={language}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {language}
                  </motion.span>
                </motion.button>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "14px", color: "var(--text)" }}>{t.version}</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>1.0.0</div>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>

      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" as const, delay: 0.25 }}
        >
          <button onClick={async () => { await signOut({ callbackUrl: "/login", redirect: true }) }} style={{
            width: "100%",
            marginTop: "20px",
            background: "rgba(255,50,50,0.1)",
            border: "1px solid rgba(255,50,50,0.25)",
            borderRadius: "14px",
            padding: "13px",
            color: "#d96060",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {t.signOut}
            </motion.span>
          </button>
          <div style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "16px" }}>
            {t.fitSched} v1.0.0
          </div>
        </motion.div>
      )}
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
