"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"
import { SkeletonExerciseRow } from "@/components/Skeleton"
import { getSmartExercisePlan, parseSetsReps, toWorkoutExercises, EXERCISE_LIBRARY, getAllowedExerciseAccess, getExerciseAccess } from "@/lib/workoutRecommendations"
import type { ExerciseDef, WorkoutEnvironment, ExerciseAccess } from "@/lib/workoutRecommendations"
import { getFeedbackAdjustedExperienceLevel } from "@/lib/workoutFeedback"
import { MUSCLE_GROUPS, getMuscleGroup } from "@/lib/exerciseData"
import { formatLocalDate } from "@/lib/dateUtils"
import { ACCENT, ACCENT_DIM, ACCENT_BD } from "@/lib/theme"
import { getCategory, CATEGORY_COLORS } from "@/lib/exerciseUtils"
import { WorkoutTemplatesModal } from "@/components/WorkoutTemplatesModal"
import { ExerciseDemoVisual } from "@/components/ExerciseDemoPanel"
import { useWorkoutVerification } from "@/lib/workoutVerification"

const DEFAULT_EXERCISES: Record<number, Array<[string, string]>> = {
  0: [],
  1: [["Push-ups","3×15"],["Diamond Push-ups","3×10"],["Tricep Dips","3×12"],["Chest Fly","3×12"],["Close-grip Push-ups","3×10"]],
  2: [["Pull-ups","3×10"],["Bicep Curls","3×12"],["Hammer Curls","3×10"],["Superman Hold","3×30s"],["Reverse Fly","3×12"]],
  3: [["Squats","4×15"],["Lunges","3×12 each"],["Glute Bridges","3×15"],["Wall Sit","3×45s"],["Calf Raises","3×20"]],
  4: [["Pike Push-ups","3×12"],["Lateral Raises","3×15"],["Plank","3×45s"],["Russian Twist","3×20"],["Mountain Climbers","3×30s"]],
  5: [["Burpees","4×10"],["Jump Squats","4×15"],["High Knees","4×30s"],["Box Jumps","3×12"],["Sprint","4×20s"]],
  6: [["Curl to Press","3×12"],["Tricep Extension","3×12"],["Plank Reaches","3×10 each"],["Leg Raises","3×15"],["Bicycle Crunches","3×20"]],
}

function getStoredTargetMuscles(): string[] {
  try {
    const raw = localStorage.getItem("fitsched-onboarding-preferences")
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.targetMuscles) ? parsed.targetMuscles : []
  } catch {
    return []
  }
}

function getMuscleGroupsForDay(day: number, workoutsPerWeek: number): { groups: string[]; isRestDay: boolean } {
  if (day === 0) return { groups: [], isRestDay: true }
  const workoutDayOrder = [1, 2, 3, 4, 5, 6]
  const workoutDayIndex = workoutDayOrder.indexOf(day)
  if (workoutDayIndex === -1 || workoutDayIndex >= workoutsPerWeek) return { groups: [], isRestDay: true }
  if (workoutsPerWeek === 3) {
    const splits = [["CHEST", "SHOULDERS", "ARMS"], ["BACK", "ARMS"], ["LEGS", "CORE"]]
    return { groups: splits[workoutDayIndex], isRestDay: false }
  }
  if (workoutsPerWeek === 4) {
    const splits = [["CHEST", "BACK"], ["LEGS", "CORE"], ["SHOULDERS", "ARMS"], ["BACK", "ARMS"]]
    return { groups: splits[workoutDayIndex] ?? [], isRestDay: false }
  }
  if (workoutsPerWeek === 5) {
    const splits = [["CHEST", "SHOULDERS"], ["BACK", "ARMS"], ["LEGS", "CORE"], ["CHEST", "ARMS"], ["FULL_BODY"]]
    return { groups: splits[workoutDayIndex] ?? [], isRestDay: false }
  }
  if (workoutsPerWeek === 6) {
    const splits = [["CHEST"], ["BACK"], ["SHOULDERS"], ["ARMS"], ["LEGS", "CORE"], ["FULL_BODY"]]
    return { groups: splits[workoutDayIndex] ?? [], isRestDay: false }
  }
  // 7+: same as 6-day split with fallback
  const splits = [["CHEST"], ["BACK"], ["SHOULDERS"], ["ARMS"], ["LEGS", "CORE"], ["FULL_BODY"]]
  return { groups: splits[workoutDayIndex] ?? [], isRestDay: false }
}

function getExerciseDesc(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("incline push")) return "Beginner-friendly push-up using an elevated surface."
  if (n.includes("push-up") || n.includes("pushup")) return "A bodypress that trains chest, triceps, shoulders, and core."
  if (n.includes("shoulder tap")) return "A push-up followed by alternating shoulder taps."
  if (n.includes("diamond")) return "Close-grip push-up targeting triceps and inner chest."
  if (n.includes("tricep dip")) return "Dip movement for tricep isolation and shoulder stability."
  if (n.includes("pull-up") || n.includes("pullup")) return "Vertical pull targeting lats, biceps, and upper back."
  if (n.includes("bicep curl") || n.includes("curl")) return "Isolation movement for bicep peak and arm strength."
  if (n.includes("squat")) return "Compound lower-body movement for quads, glutes, and hips."
  if (n.includes("lunge")) return "Unilateral leg exercise for balance and quad development."
  if (n.includes("plank")) return "Isometric core hold building total trunk stability."
  if (n.includes("burpee")) return "Full-body explosive movement combining squat, push-up, and jump."
  if (n.includes("lateral raise")) return "Isolation movement for medial deltoid width."
  if (n.includes("russian twist")) return "Rotational core movement targeting obliques."
  if (n.includes("mountain climb")) return "Dynamic core exercise with cardio benefit."
  return "Compound movement for strength and endurance."
}


export default function WorkoutPage() {
  const { status } = useSession()
  const router = useRouter()
  const { selectedDay, setSelectedDay } = useStore()
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [todayIdx, setTodayIdx] = useState(-1)
  const todayDay = todayIdx
  const [savedWorkout, setSavedWorkout] = useState<any>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completedDateIds, setCompletedDateIds] = useState<Set<string>>(new Set())
  const { t, language } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [smartExercises, setSmartExercises] = useState<Array<[string, string]> | null>(null)
  const [computing, setComputing] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateExercises, setTemplateExercises] = useState<Array<[string, string]> | null>(null)
  const [muscleReadiness, setMuscleReadiness] = useState<Array<{ group: string; status: "fresh" | "recovering" | "sore" | "untrained" }> | null>(null)
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  // Exercise walkthrough flow
  const [exMode, setExMode] = useState<"idle" | "verify" | "countdown" | "active" | "done">("idle")
  const [exIdx, setExIdx] = useState(0)
  const [cdCount, setCdCount] = useState(3)
  const [completing, setCompleting] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [verifySettled, setVerifySettled] = useState(false)
  const [verifyRequesting, setVerifyRequesting] = useState(false)
  const sessionStartRef = useRef<number>(0)
  const sessionTokenRef = useRef<string | null>(null)
  const { state: verifyState, start: startVerify, getResult, stop: stopVerify } = useWorkoutVerification()
  const dayNames = [t.days.sun, t.days.mon, t.days.tue, t.days.wed, t.days.thu, t.days.fri, t.days.sat]
  const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay())
    start.setHours(0, 0, 0, 0)
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
    setWeekDates(dates)
    setTodayIdx(today.getDay())
  }, [])

  useEffect(() => {
    if (status !== "authenticated") return
    setLoading(true)
    const selectedDate = weekDates[selectedDay]
    if (!selectedDate) return
    const dateStr = formatLocalDate(selectedDate)
    fetch(`/api/workout-schedule?date=${dateStr}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (data.length > 0) setSavedWorkout(data[0])
        else setSavedWorkout(null)
        setLoading(false)
      })
      .catch(() => { setSavedWorkout(null); setLoading(false) })
  }, [status, selectedDay, weekDates])

  useEffect(() => {
    setCompleted(false)
  }, [selectedDay])

  useEffect(() => {
    if (status !== "authenticated") return

    let active = true
    const loadCompletedDates = async () => {
      try {
        const response = await fetch("/api/workout-log")
        if (!response.ok) return
        const logs = await response.json()
        if (!active) return
        setCompletedDateIds(new Set(
          logs.map((log: any) => log.date || formatLocalDate(new Date(log.completedAt)))
        ))
      } catch {}
    }

    loadCompletedDates()
    window.addEventListener("focus", loadCompletedDates)
    window.addEventListener("fitsched:workout-completed", loadCompletedDates)

    return () => {
      active = false
      window.removeEventListener("focus", loadCompletedDates)
      window.removeEventListener("fitsched:workout-completed", loadCompletedDates)
    }
  }, [status])

  useEffect(() => {
    if (status !== "authenticated") return
    if (selectedDay === 0) { setSmartExercises([]); setComputing(false); return }

    setComputing(true)

    const compute = async () => {
      try {
        const profileRes = await fetch("/api/onboarding")
        const profile = profileRes.ok ? await profileRes.json() : {}
        const fitnessGoal = profile.fitnessGoal || "stay_active"
        const experienceLevel = getFeedbackAdjustedExperienceLevel(profile.experienceLevel || "intermediate")
        const profileWorkoutsPerWeek = profile.workoutsPerWeek || 3
        setWorkoutsPerWeek(profileWorkoutsPerWeek)
        const workoutsPerWeek = profileWorkoutsPerWeek
        const workoutEnvironment = (profile.workoutEnvironment || "gym") as WorkoutEnvironment
        const hasInjury = Boolean(profile.hasInjury)
        const allowedAccess = getAllowedExerciseAccess(workoutEnvironment)

        const groupResult = getMuscleGroupsForDay(selectedDay, workoutsPerWeek)
        const allowedGroups = [...groupResult.groups]
        const targetMuscles = getStoredTargetMuscles()
        const targetForToday = targetMuscles.length > 0
          ? targetMuscles[(selectedDay - 1 + targetMuscles.length) % targetMuscles.length]
          : null

        if ((fitnessGoal === "lose_weight" || fitnessGoal === "improve_endurance") && !allowedGroups.includes("FULL_BODY") && !allowedGroups.includes("CARDIO")) {
          allowedGroups.push("FULL_BODY")
        }

        const DIFFICULTY_MAP: Record<string, string[]> = {
          beginner: ["BEGINNER"],
          intermediate: ["BEGINNER", "INTERMEDIATE"],
          advanced: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
        }
        const allowedDifficulties = hasInjury
          ? ["BEGINNER"]
          : DIFFICULTY_MAP[experienceLevel] || ["BEGINNER", "INTERMEDIATE"]

        let filtered = EXERCISE_LIBRARY.filter((ex) =>
          allowedGroups.includes(ex.muscleGroup) &&
          allowedDifficulties.includes(ex.difficulty) &&
          allowedAccess.includes(getExerciseAccess(ex.name)) &&
          (fitnessGoal === "stay_active" || ex.goalTypes.includes(fitnessGoal))
        )

        if (filtered.length < 3) {
          filtered = EXERCISE_LIBRARY.filter((ex) =>
            allowedGroups.includes(ex.muscleGroup) &&
            allowedDifficulties.includes(ex.difficulty) &&
            allowedAccess.includes(getExerciseAccess(ex.name))
          )
        }

        if (filtered.length < 3) {
          filtered = EXERCISE_LIBRARY.filter((ex) =>
            allowedGroups.includes(ex.muscleGroup) &&
            allowedAccess.includes(getExerciseAccess(ex.name))
          )
        }

        if (filtered.length < 3) {
          filtered = EXERCISE_LIBRARY.filter((ex) =>
            allowedDifficulties.includes(ex.difficulty) &&
            allowedAccess.includes(getExerciseAccess(ex.name))
          )
        }

        if (filtered.length === 0) {
          filtered = EXERCISE_LIBRARY.filter((ex) => allowedAccess.includes(getExerciseAccess(ex.name)))
        }

        if (hasInjury) {
          const cautionExercises = new Set(["Burpees", "Jump Squats", "Tuck Jumps", "Box Jumps", "Sprints", "Battle Ropes"])
          filtered = filtered.filter((ex) => !cautionExercises.has(ex.name))
          if (filtered.length === 0) {
            filtered = EXERCISE_LIBRARY.filter((ex) =>
              ex.difficulty === "BEGINNER" &&
              allowedAccess.includes(getExerciseAccess(ex.name))
            )
          }
        }

        let recentNames: string[] = []
        try {
          const logRes = await fetch("/api/workout-log")
          if (logRes.ok) {
            const logs = await logRes.json()
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            recentNames = logs
              .filter((l: any) => new Date(l.completedAt || l.createdAt) > oneWeekAgo)
              .flatMap((l: any) => l.exercises?.map((e: any) => e.name) || [])

            // Muscle readiness
            const TRACKED = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as const
            const FULL_BODY_SPILL = ["Chest", "Back", "Legs", "Core"]
            const lastTrained: Record<string, Date> = {}
            const nowTime = new Date()
            for (const log of logs) {
              for (const ex of (log.exercises || [])) {
                const rawGroup = getMuscleGroup(ex.name)
                const affected = rawGroup === "Full Body" ? FULL_BODY_SPILL : [rawGroup]
                for (const g of affected) {
                  if (!TRACKED.includes(g as any)) continue
                  const d = new Date(log.completedAt)
                  if (!lastTrained[g] || d > lastTrained[g]) lastTrained[g] = d
                }
              }
            }
            setMuscleReadiness(TRACKED.map(group => {
              const last = lastTrained[group]
              if (!last) return { group, status: "untrained" as const }
              const days = (nowTime.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
              if (days < 1.5) return { group, status: "sore" as const }
              if (days < 3.5) return { group, status: "recovering" as const }
              return { group, status: "fresh" as const }
            }))
          }
        } catch {}

        const available = recentNames.length > 0
          ? filtered.filter((ex) => !recentNames.includes(ex.name))
          : filtered

        const pool = available.length >= 3 ? available : filtered

        const now = new Date()
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const weekNum = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000))

        const shuffled = [...pool].sort((a, b) => {
          if (targetForToday && allowedGroups.includes(targetForToday)) {
            const aTarget = a.muscleGroup === targetForToday ? 0 : 1
            const bTarget = b.muscleGroup === targetForToday ? 0 : 1
            if (aTarget !== bTarget) return aTarget - bTarget
          }

          const hashA = (a.name.charCodeAt(0) + weekNum * 7) % 1000
          const hashB = (b.name.charCodeAt(0) + weekNum * 7) % 1000
          return hashA - hashB
        })

        const selected = shuffled.slice(0, 5)

        const SETS_REPS_MAP: Record<string, string> = {
          beginner: "3×10",
          intermediate: "3×12",
          advanced: "4×12",
        }
        const ENDURANCE_REPS_MAP: Record<string, string> = {
          beginner: "3×15",
          intermediate: "4×15",
          advanced: "4×20",
        }

        const repsMap = fitnessGoal === "improve_endurance" ? ENDURANCE_REPS_MAP : SETS_REPS_MAP
        const setsReps = repsMap[experienceLevel] || "3×12"

        setSmartExercises(getSmartExercisePlan({
          selectedDay,
          fitnessGoal,
          experienceLevel,
          workoutEnvironment,
          hasInjury,
          targetMuscles,
          recentNames,
        }))
      } catch {
        setSmartExercises(null)
      }
      setComputing(false)
    }

    compute()
  }, [status, selectedDay])

  // 3-2-1 countdown effect — re-runs whenever we enter countdown or advance to next exercise
  useEffect(() => {
    if (exMode !== "countdown") return
    setCdCount(3)
    let n = 3
    const timerId = setInterval(() => {
      n--
      if (n <= 0) {
        clearInterval(timerId)
        setExMode("active")
      } else {
        setCdCount(n)
      }
    }, 1000)
    return () => clearInterval(timerId)
  }, [exMode, exIdx])

  const selectedDate = weekDates[selectedDay]
  const selectedDateId = selectedDate ? formatLocalDate(selectedDate) : ""
  const todayDateId = formatLocalDate(new Date())
  const selectedDayBlocked = Boolean(selectedDateId && selectedDateId !== todayDateId)
  const workoutLocked = Boolean(selectedDateId && completedDateIds.has(selectedDateId)) || completed
  const workoutBlocked = selectedDayBlocked || workoutLocked

  // Weekly progress
  const weeklyDone = weekDates.filter(d => completedDateIds.has(formatLocalDate(d))).length
  const weeklyGoalMet = weeklyDone >= workoutsPerWeek

  if (selectedDay === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
          <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">{theme === "dark" ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg>
          </button>
        </div>
        <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", padding: "0 16px", paddingBottom: 100 }}>
          <div style={{ display: "flex", gap: 6, padding: "12px 0 20px" }}>
            {weekDates.map((date, i) => {
              const isActive = i === selectedDay
              const isToday  = i === todayDay
              const dateId   = formatLocalDate(date)
              const isDone   = completedDateIds.has(dateId)
              return (
                <motion.button key={i} onClick={() => setSelectedDay(i)} whileTap={{ scale: 0.92 }} style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: 0, position: "relative" }}>
                  {isActive && (
                    <motion.span
                      layoutId="workout-week-pill"
                      style={{ position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none", background: "linear-gradient(180deg, rgba(18,101,254,0.22) 0%, rgba(18,101,254,0.08) 100%)", border: "1px solid rgba(18,101,254,0.32)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 18px rgba(18,101,254,0.18)" }}
                      transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.78 }}
                    />
                  )}
                  <div style={{ width: "100%", borderRadius: 12, padding: "7px 2px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative", zIndex: 1, boxSizing: "border-box", border: isToday && !isActive ? `1.5px solid ${ACCENT}` : "1.5px solid transparent", background: !isActive && !isToday ? "var(--surface-2, rgba(255,255,255,0.06))" : "transparent" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: isActive ? ACCENT : isToday ? ACCENT : "var(--text-muted)", transition: "color 0.22s" }}>{DAY_ABBR[i]}</div>
                    <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: isActive ? "var(--text)" : isToday ? ACCENT : "var(--text)", transition: "color 0.22s" }}>{date.getDate()}</div>
                    <div style={{ minHeight: 4, marginTop: 1 }}>
                      {isDone && <div style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT }} />}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
          <div className="ios-inset-grouped" style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(18,101,254,0.1)", border: "1px solid rgba(18,101,254,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1265fe" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{t.restDay}</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>{t.restBody}</p>
          </div>
        </div>
      </div>
    )
  }

  const muscle = MUSCLE_GROUPS[selectedDay]
  const todayExercises = templateExercises ?? smartExercises ?? getSmartExercisePlan({ selectedDay })

  const currentExercises = toWorkoutExercises(todayExercises)

  // ── Exercise flow handlers ──────────────────────────────────────────────────
  function startExFlow() {
    if (!todayExercises.length) return
    setExIdx(0)
    setVerifySettled(false)
    setSaveError(false)
    sessionTokenRef.current = null
    setExMode("verify")
  }

  async function fetchAndStoreSessionToken() {
    try {
      const dateStr = formatLocalDate(new Date())
      const res = await fetch("/api/workout-session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      })
      if (res.ok) {
        const data = await res.json()
        sessionTokenRef.current = data.sessionToken ?? null
      }
    } catch {
      // Best-effort — server will apply 0.5 default if absent
    }
  }

  function beginSession() {
    sessionStartRef.current = Date.now()
    setExMode("countdown")
  }

  async function handleStartVerified() {
    setVerifyRequesting(true)
    // Fetch session token and start motion verification in parallel.
    await Promise.all([
      startVerify(),
      fetchAndStoreSessionToken().then(() => sessionTokenRef.current),
    ])
    setVerifyRequesting(false)
    setVerifySettled(true)
    beginSession()
  }

  async function handleSkipVerify() {
    setVerifySettled(true)
    // Fetch the server-signed token even when skipping verification; the HMAC elapsed-time
    // check on the server is independent of client-side verification.
    fetchAndStoreSessionToken()
    beginSession()
  }

  function advanceEx() {
    if (exIdx + 1 < todayExercises.length) {
      setExIdx(i => i + 1)
      setExMode("countdown")
    } else {
      setExMode("done")
    }
  }

  async function finishWorkout() {
    setCompleting(true)
    setSaveError(false)
    const elapsedSec = Math.floor((Date.now() - sessionStartRef.current) / 1000)
    const verifyResult = getResult(elapsedSec)
    stopVerify()
    // Always log against today — the walkthrough can only be started today,
    // and the server validates against UTC±38h. Using weekDates[selectedDay]
    // would fail silently if the user had a different day selected in the strip.
    const dateStr = formatLocalDate(new Date())
    const exs = todayExercises.map(([name, reps]) => ({ name, ...parseSetsReps(reps) }))
    try {
      const res = await fetch("/api/workout-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr, workoutName: muscle, exercises: exs,
          verificationScore: verifyResult.score,
          verificationMultiplier: verifyResult.multiplier,
          verificationMethod: verifyResult.method,
          sessionToken: sessionTokenRef.current ?? undefined,
        }),
      })
      if (res.ok) {
        window.dispatchEvent(new Event("fitsched:tokens-updated"))
        window.dispatchEvent(new Event("fitsched:workout-completed"))
        setCompletedDateIds(prev => new Set([...prev, dateStr]))
        setCompleting(false)
        setExMode("idle")
        setCompleted(true)
        return
      }
      // Non-2xx — surface to user so they can retry
      setSaveError(true)
    } catch {
      setSaveError(true)
    }
    setCompleting(false)
    // Keep exMode as "done" so the user sees the retry banner
  }

  const modalStyle = {
    background: theme === 'dark'
      ? 'rgba(28, 28, 28, 0.75)'
      : 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: theme === 'dark'
      ? '1px solid rgba(255,255,255,0.08)'
      : '1px solid rgba(0,0,0,0.08)',
    borderRadius: '24px 24px 0 0',
    padding: '24px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column" }}>
      {/* W1 Header */}
      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </div>
        <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">{theme === "dark" ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg>
        </button>
      </div>

      <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", padding: "0 16px", paddingBottom: 140 }}>
        {/* Day selector — sliding glass bubble */}
        <div style={{ display: "flex", gap: 6, padding: "12px 0 20px" }}>
          {weekDates.map((date, i) => {
            const isActive = i === selectedDay
            const isToday  = i === todayDay
            const dateId   = formatLocalDate(date)
            const isDone   = completedDateIds.has(dateId)
            return (
              <motion.button key={i} onClick={() => setSelectedDay(i)} whileTap={{ scale: 0.92 }} style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: 0, position: "relative" }}>
                {isActive && (
                  <motion.span
                    layoutId="workout-week-pill"
                    style={{ position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none", background: "linear-gradient(180deg, rgba(18,101,254,0.22) 0%, rgba(18,101,254,0.08) 100%)", border: "1px solid rgba(18,101,254,0.32)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 18px rgba(18,101,254,0.18)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.78 }}
                  />
                )}
                <div style={{ width: "100%", borderRadius: 12, padding: "7px 2px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative", zIndex: 1, boxSizing: "border-box", border: isToday && !isActive ? `1.5px solid ${ACCENT}` : "1.5px solid transparent", background: !isActive && !isToday ? "var(--surface-2, rgba(255,255,255,0.06))" : "transparent" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: isActive ? ACCENT : isToday ? ACCENT : "var(--text-muted)", transition: "color 0.22s" }}>{DAY_ABBR[i]}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: isActive ? "var(--text)" : isToday ? ACCENT : "var(--text)", transition: "color 0.22s" }}>{date.getDate()}</div>
                  <div style={{ minHeight: 4, marginTop: 1 }}>
                    {isDone && <div style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT }} />}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Weekly goal progress */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 14 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Weekly goal</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: weeklyGoalMet ? ACCENT : "var(--text-muted)", fontVariantNumeric: "tabular-nums", display: "flex", alignItems: "center", gap: 4 }}>
              {weeklyDone} / {workoutsPerWeek}
              {weeklyGoalMet && (
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </span>
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (weeklyDone / workoutsPerWeek) * 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
              style={{ height: "100%", borderRadius: 999, background: weeklyGoalMet ? `linear-gradient(90deg, ${ACCENT}, #8ee3dc)` : ACCENT }}
            />
          </div>
        </motion.div>

        {/* W1 Title block */}
        <div style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="display-text" style={{ fontSize: 32, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 4 }}>{muscle}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {computing ? "Computing…" : `${todayExercises.length} exercises · ${Math.round(todayExercises.length * 4)} min · medium`}
            </div>
          </div>
          <button
            onClick={() => setShowTemplates(true)}
            style={{
              flexShrink: 0, marginTop: 6,
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "7px 12px",
              fontSize: 12, fontWeight: 700, color: "var(--text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            Templates
          </button>
        </div>

        {/* Muscle readiness strip — today only */}
        {selectedDay === todayIdx && muscleReadiness && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {muscleReadiness.map(({ group, status }) => {
              const color = status === "sore" ? "#ef4444"
                : status === "recovering" ? "#f59e0b"
                : status === "fresh" ? "#10b981"
                : "var(--text-muted)"
              const bg = status === "sore" ? "rgba(239,68,68,0.1)"
                : status === "recovering" ? "rgba(245,158,11,0.1)"
                : status === "fresh" ? "rgba(16,185,129,0.1)"
                : "var(--surface-2)"
              return (
                <div key={group} style={{ display: "flex", alignItems: "center", gap: 4, background: bg, border: `1px solid ${color}33`, borderRadius: 20, padding: "4px 9px", fontSize: 10, fontWeight: 800, color }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  {group}
                </div>
              )
            })}
          </motion.div>
        )}

        {/* Contextual tip — shown when relevant */}
        {selectedDay === todayIdx && !computing && muscleReadiness && (() => {
          const soreMuscles = muscleReadiness.filter(m => m.status === "sore").map(m => m.group)
          const recovering = muscleReadiness.filter(m => m.status === "recovering").length
          const fresh = muscleReadiness.filter(m => m.status === "fresh" || m.status === "untrained").length
          let tip: string | null = null
          if (weeklyDone === workoutsPerWeek) {
            tip = "Weekly goal reached — any extra sets are a bonus."
          } else if (weeklyDone === workoutsPerWeek - 1) {
            tip = "One more workout to hit your goal."
          } else if (soreMuscles.length >= 3) {
            tip = "Most muscles still sore — keep intensity moderate today."
          } else if (fresh >= 4) {
            tip = "Muscles are fresh across the board — a good day to push."
          } else if (recovering > 0 && soreMuscles.length === 0) {
            tip = "Recovering well — a steady session is the right call today."
          }
          if (!tip) return null
          return (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: 12,
                borderRadius: "0 10px 10px 0",
                padding: "9px 13px",
                background: "var(--surface-2)",
                borderTop: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                borderLeft: "2px solid var(--border-strong)",
                fontSize: 12, fontWeight: 600,
                color: "var(--text-muted)", lineHeight: 1.5,
              }}
            >
              {tip}
            </motion.div>
          )
        })()}

        {/* FT motivation strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, padding: "0 2px" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, flexShrink: 0, opacity: 0.7 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.01em" }}>
            Complete this session to earn <span style={{ color: ACCENT }}>FitTokens</span>
          </span>
        </div>

        {/* Blocked banner */}
        {workoutBlocked && (
          <div style={{ background: "rgba(18,101,254,0.1)", border: "1px solid rgba(18,101,254,0.28)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text)", marginBottom: 3 }}>{selectedDayBlocked ? t.todayWorkoutOnlyTitle : t.workoutLockedTitle}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{selectedDayBlocked ? t.todayWorkoutOnlyBody : t.workoutLockedBody}</div>
          </div>
        )}

        {/* Template active banner */}
        {templateExercises && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(18,101,254,0.08)", border: "1px solid rgba(18,101,254,0.28)",
            borderRadius: 14, padding: "9px 14px", marginBottom: 14,
            fontSize: 12, fontWeight: 700, color: ACCENT,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
              Template active — {templateExercises.length} exercises
            </span>
            <button
              onClick={() => setTemplateExercises(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: ACCENT, fontSize: 11, fontWeight: 800, padding: "2px 0" }}
            >
              Reset ×
            </button>
          </div>
        )}

        {/* W1 Exercise cards — plan view, no set buttons */}
        {loading || computing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
                <SkeletonExerciseRow />
              </div>
            ))}
          </motion.div>
        ) : (
          <div>
            {todayExercises.map((ex, i) => {
              const name = ex[0]
              const setsReps = ex[1]
              const category = getCategory(name, i)
              const catStyle = CATEGORY_COLORS[category] || CATEGORY_COLORS.CORE
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.24, ease: "easeOut" }}
                  style={{
                    background: "var(--panel)",
                    borderTop: "1px solid var(--border)",
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: `3px solid ${catStyle.color}`,
                    borderRadius: 20, marginBottom: 10, overflow: "hidden",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 0 13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: catStyle.color }} />
                      <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.11em", color: catStyle.color }}>{category}</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>· {getMuscleGroup(name)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)" }}>#{String(i + 1).padStart(2, "0")}</span>
                      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 800, color: "var(--text-muted)" }}>{setsReps}</div>
                    </div>
                  </div>
                  {/* Body: 1:1 square demo + info */}
                  <div style={{ display: "flex", padding: "8px 12px 12px 12px", gap: 12 }}>
                    {/* Square demo */}
                    <div style={{ width: 120, height: 120, flexShrink: 0, borderRadius: 14, overflow: "hidden" }}>
                      <ExerciseDemoVisual exerciseName={name} compact height={120} objectFit="contain" />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 5 }}>
                      <div style={{ fontSize: 17, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.2px", lineHeight: 1.1 }}>{name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{getExerciseDesc(name)}</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "10px 16px",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        background: "linear-gradient(to top, var(--bg) 72%, transparent)",
      }}>
        {!workoutBlocked ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <motion.button
              onClick={startExFlow}
              whileTap={{ scale: 0.985 }}
              style={{
                width: "100%", border: "none",
                background: "linear-gradient(135deg, #1265fe 0%, #52a8a0 100%)",
                color: "#0b1715",
                borderRadius: 18, padding: "15px 24px",
                fontSize: 15, fontWeight: 900,
                letterSpacing: "-0.01em",
                cursor: "pointer",
                boxShadow: "0 4px 24px rgba(18,101,254,0.38), inset 0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              {t.goExercise}
            </motion.button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0 0" }}>
              <button
                onClick={async () => {
                  const selectedDate = weekDates[selectedDay]
                  if (!selectedDate) return
                  const dateStr = formatLocalDate(selectedDate)
                  const exercises = todayExercises.map(([name, reps]) => ({ name, ...parseSetsReps(reps) }))
                  const res = await fetch("/api/workout-schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: dateStr, workoutName: muscle, exercises, source: "manual" }) })
                  if (res.ok) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000) }
                }}
                style={{
                  background: "none", border: "none",
                  fontSize: 12, fontWeight: 700,
                  color: saveSuccess ? ACCENT : "var(--text-muted)",
                  cursor: "pointer", padding: "4px 8px",
                  transition: "color 0.18s",
                }}
              >
                {saveSuccess ? t.savedToSchedule : t.saveToSchedule}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, fontSize: 13, color: "#65c97a", fontWeight: 700, textAlign: "center" }}>
            {selectedDayBlocked ? t.todayOnly : t.workoutCompleted}
          </div>
        )}
      </div>



          <AnimatePresence>
            {showTemplates && (
              <WorkoutTemplatesModal
                currentExercises={todayExercises}
                onLoad={(exs) => { setTemplateExercises(exs) }}
                onClose={() => setShowTemplates(false)}
              />
            )}
          </AnimatePresence>

          {/* ── Fullscreen exercise walkthrough — always light ─────────────── */}
          <AnimatePresence>
            {exMode !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed", inset: 0, zIndex: 9998,
                  background: "#f8fafc",
                  display: "flex", flexDirection: "column",
                  userSelect: "none",
                }}
              >
                {/* Top progress bar */}
                <div style={{ height: 3, background: "rgba(0,0,0,0.07)", flexShrink: 0 }}>
                  <motion.div
                    animate={{ width: `${((exIdx + (exMode === "done" ? 1 : 0)) / Math.max(todayExercises.length, 1)) * 100}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ height: "100%", background: ACCENT, borderRadius: 999 }}
                  />
                </div>


                {/* Verification status pill — top right, after verify is settled */}
                {verifySettled && (
                  <div style={{
                    position: "absolute", top: 18, right: 18, zIndex: 10,
                    display: "flex", alignItems: "center", gap: 5,
                    background: verifyState === "active" ? ACCENT_DIM : "rgba(0,0,0,0.06)",
                    border: `1px solid ${verifyState === "active" ? ACCENT_BD : "rgba(0,0,0,0.1)"}`,
                    borderRadius: 999, padding: "5px 11px",
                    fontSize: 10, fontWeight: 800,
                    color: verifyState === "active" ? ACCENT : "#9ca3af",
                    letterSpacing: "0.06em",
                  }}>
                    {verifyState === "active" ? (
                      <>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />
                        VERIFIED
                      </>
                    ) : (
                      <>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9ca3af" }} />
                        UNVERIFIED
                      </>
                    )}
                  </div>
                )}

                {/* Exercise counter */}
                {exMode !== "verify" && (
                  <div style={{
                    paddingTop: 20, textAlign: "center",
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.16em",
                    color: "rgba(0,0,0,0.3)",
                  }}>
                    {exMode !== "done"
                      ? `${exIdx + 1} / ${todayExercises.length}`
                      : `${todayExercises.length} / ${todayExercises.length}`}
                  </div>
                )}

                {/* ── Verify screen ─────────────────────────────────────────────── */}
                {exMode === "verify" && (
                  <div style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    padding: "0 28px", gap: 20,
                  }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 18 }}
                      style={{
                        width: 72, height: 72, borderRadius: "50%",
                        background: ACCENT_DIM, border: `2px solid ${ACCENT_BD}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
                      </svg>
                    </motion.div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 24, fontWeight: 900, color: "#111827",
                        letterSpacing: "-0.025em", marginBottom: 8,
                      }}>
                        Verify your workout
                      </div>
                      <div style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", lineHeight: 1.55, maxWidth: 280 }}>
                        Use motion verification to earn <strong style={{ color: ACCENT }}>full FitTokens</strong>. Skip = 50% tokens only.
                      </div>
                    </div>

                    <div style={{
                      width: "100%", background: "#fff",
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 16, padding: "14px 16px",
                      fontSize: 12, color: "rgba(0,0,0,0.45)", lineHeight: 1.55,
                      display: "flex", alignItems: "flex-start", gap: 9,
                    }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <span>No microphone or audio access is used. Verification relies on movement signals only.</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                      <button
                        onClick={handleStartVerified}
                        disabled={verifyRequesting}
                        style={{
                          width: "100%", border: "none",
                          background: verifyRequesting ? "rgba(18,101,254,0.55)" : ACCENT,
                          color: "#0b1715",
                          borderRadius: 16, padding: "15px 24px",
                          fontSize: 15, fontWeight: 900,
                          cursor: verifyRequesting ? "default" : "pointer",
                          fontFamily: "var(--font-display)",
                          boxShadow: verifyRequesting ? "none" : "0 4px 20px rgba(18,101,254,0.32)",
                          transition: "background 0.2s, box-shadow 0.2s",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}
                      >
                        {verifyRequesting ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                              style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid #0b1715", borderTopColor: "transparent" }}
                            />
                            Requesting access…
                          </>
                        ) : "Start verified workout ->"}
                      </button>
                      <button
                        onClick={handleSkipVerify}
                        disabled={verifyRequesting}
                        style={{
                          width: "100%", border: "1px solid rgba(0,0,0,0.1)",
                          background: "transparent", color: "rgba(0,0,0,0.45)",
                          borderRadius: 16, padding: "13px 24px",
                          fontSize: 14, fontWeight: 700,
                          cursor: verifyRequesting ? "default" : "pointer",
                          opacity: verifyRequesting ? 0.4 : 1,
                          transition: "opacity 0.2s",
                        }}
                      >
                        Skip - start unverified
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Countdown screen ─────────────────────────────────────────── */}
                {exMode === "countdown" && (
                  <div style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    padding: "0 28px", gap: 18,
                  }}>
                    {/* Exercise progress bar */}
                    <div style={{ width: 180 }}>
                      <div style={{ height: 5, background: "rgba(0,0,0,0.09)", borderRadius: 999, overflow: "hidden" }}>
                        <motion.div
                          animate={{ width: `${((exIdx + 1) / Math.max(todayExercises.length, 1)) * 100}%` }}
                          transition={{ type: "spring", stiffness: 200, damping: 26 }}
                          style={{ height: "100%", background: ACCENT, borderRadius: 999 }}
                        />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 800, color: "rgba(0,0,0,0.28)", letterSpacing: "0.12em", textAlign: "center" }}>
                        {exIdx + 1} / {todayExercises.length}
                      </div>
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>
                      Up next
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={cdCount}
                        initial={{ opacity: 0, scale: 0.45, y: 18 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.5, y: -18 }}
                        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 120, fontWeight: 900, lineHeight: 1,
                          color: "#111827", letterSpacing: "-0.05em",
                        }}
                      >
                        {cdCount}
                      </motion.div>
                    </AnimatePresence>

                    <div style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 26, fontWeight: 900, color: "#111827",
                      letterSpacing: "-0.025em", textAlign: "center", lineHeight: 1.2,
                    }}>
                      {todayExercises[exIdx]?.[0]}
                    </div>
                    <div style={{
                      background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
                      borderRadius: 999, padding: "5px 16px",
                      fontSize: 12, fontWeight: 800, color: ACCENT,
                    }}>
                      {todayExercises[exIdx]?.[1]}
                    </div>
                  </div>
                )}

                {/* ── Active exercise screen ────────────────────────────────────── */}
                {exMode === "active" && (() => {
                  const [exName, exSR] = todayExercises[exIdx] || ["", ""]
                  const isLast = exIdx + 1 >= todayExercises.length
                  return (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <div style={{
                        flex: 1, display: "flex", alignItems: "center",
                        justifyContent: "center", padding: "12px 16px 4px", minHeight: 0,
                      }}>
                        <motion.div
                          key={exIdx}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                          style={{ width: "min(100%, 340px)", aspectRatio: "1 / 1", borderRadius: 26, overflow: "hidden" }}
                        >
                          <ExerciseDemoVisual exerciseName={exName} compact={false} height={340} objectFit="contain" />
                        </motion.div>
                      </div>

                      <motion.div
                        key={`info-${exIdx}`}
                        initial={{ y: 48, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          background: "#fff",
                          borderTop: "1px solid rgba(0,0,0,0.07)",
                          borderRadius: "28px 28px 0 0",
                          padding: "22px 22px",
                          paddingBottom: "max(22px, env(safe-area-inset-bottom))",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={{
                              background: ACCENT_DIM, border: `1px solid ${ACCENT_BD}`,
                              borderRadius: 999, padding: "3px 12px",
                              fontSize: 11, fontWeight: 800, color: ACCENT,
                            }}>{exSR}</span>
                            <span style={{ fontSize: 10, color: "rgba(0,0,0,0.35)", fontWeight: 700, letterSpacing: "0.06em" }}>
                              {getMuscleGroup(exName).toUpperCase()}
                            </span>
                          </div>
                          <div style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 28, fontWeight: 900, color: "#111827",
                            letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 6,
                          }}>{exName}</div>
                          <div style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", lineHeight: 1.55 }}>
                            {getExerciseDesc(exName)}
                          </div>
                        </div>
                        <button
                          onClick={advanceEx}
                          style={{
                            width: "100%", border: "none",
                            background: ACCENT, color: "#0b1715",
                            borderRadius: 16, padding: "15px 24px",
                            fontSize: 15, fontWeight: 900, cursor: "pointer",
                            fontFamily: "var(--font-display)", letterSpacing: "-0.01em",
                            boxShadow: "0 4px 20px rgba(18,101,254,0.32)",
                          }}
                        >
                          {isLast ? (
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              Finish
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                              Next
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            </span>
                          )}
                        </button>
                      </motion.div>
                    </div>
                  )
                })()}

                {/* ── Done screen ───────────────────────────────────────────────── */}
                {exMode === "done" && (
                  <div style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    padding: "0 24px", gap: 20, overflowY: "auto",
                    paddingBottom: "max(24px, env(safe-area-inset-bottom))",
                  }}>
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.08 }}
                      style={{
                        width: 72, height: 72, borderRadius: "50%",
                        background: ACCENT_DIM, border: `2px solid ${ACCENT}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 900, color: "#111827", letterSpacing: "-0.04em", marginBottom: 6 }}>
                        All done.
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(0,0,0,0.45)" }}>
                        {todayExercises.length} exercises · ~{Math.round(todayExercises.length * 4)} min
                      </div>
                    </motion.div>

                    {/* Verification badge */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: verifyState === "active" ? ACCENT_DIM : "rgba(0,0,0,0.05)",
                        border: `1px solid ${verifyState === "active" ? ACCENT_BD : "rgba(0,0,0,0.08)"}`,
                        borderRadius: 999, padding: "7px 16px",
                        fontSize: 12, fontWeight: 800,
                        color: verifyState === "active" ? ACCENT : "rgba(0,0,0,0.4)",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      </svg>
                      {verifyState === "active" ? "Verified — full FitTokens" : "Unverified — 50% FitTokens"}
                    </motion.div>

                    {/* Exercise recap list */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                      style={{ width: "100%", background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 18, padding: "4px 18px" }}
                    >
                      {todayExercises.map(([name, sr], i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "11px 0",
                          borderBottom: i < todayExercises.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                        }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ flex: 1, fontSize: 13, color: "#111827", fontWeight: 700 }}>{name}</span>
                          <span style={{ fontSize: 11, color: "rgba(0,0,0,0.38)", fontWeight: 600 }}>{sr}</span>
                        </div>
                      ))}
                    </motion.div>

                    {saveError && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        style={{
                          width: "100%", borderRadius: 12, padding: "11px 14px",
                          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                          fontSize: 12, fontWeight: 700, color: "#dc2626",
                          textAlign: "center", lineHeight: 1.4,
                        }}
                      >
                        Save failed — check your connection and tap below to retry
                      </motion.div>
                    )}

                    <motion.button
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
                      onClick={finishWorkout}
                      disabled={completing}
                      style={{
                        width: "100%", border: "none",
                        background: saveError ? "#ef4444" : ACCENT, color: "#fff",
                        borderRadius: 16, padding: "16px 24px",
                        fontSize: 16, fontWeight: 900,
                        cursor: completing ? "default" : "pointer",
                        fontFamily: "var(--font-display)", letterSpacing: "-0.01em",
                        boxShadow: saveError ? "0 4px 20px rgba(239,68,68,0.32)" : "0 4px 20px rgba(18,101,254,0.32)",
                        opacity: completing ? 0.7 : 1,
                      }}
                    >
                      {completing ? "Saving…" : saveError ? "Retry →" : "Complete workout →"}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

    </div>
  )
}
