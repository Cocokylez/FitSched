"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"
import { SkeletonExerciseRow } from "@/components/Skeleton"
import { ExerciseDemoPanel } from "@/components/ExerciseDemoPanel"

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

const scaleIn = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const MUSCLE_GROUPS = ["Rest", "Chest & Triceps", "Back & Biceps", "Legs", "Shoulders & Core", "Full Body", "Arms & Core"]

const DEFAULT_EXERCISES: Record<number, Array<[string, string]>> = {
  0: [],
  1: [["Push-ups","3×15"],["Diamond Push-ups","3×10"],["Tricep Dips","3×12"],["Chest Fly","3×12"],["Close-grip Push-ups","3×10"]],
  2: [["Pull-ups","3×10"],["Bicep Curls","3×12"],["Hammer Curls","3×10"],["Superman Hold","3×30s"],["Reverse Fly","3×12"]],
  3: [["Squats","4×15"],["Lunges","3×12 each"],["Glute Bridges","3×15"],["Wall Sit","3×45s"],["Calf Raises","3×20"]],
  4: [["Pike Push-ups","3×12"],["Lateral Raises","3×15"],["Plank","3×45s"],["Russian Twist","3×20"],["Mountain Climbers","3×30s"]],
  5: [["Burpees","4×10"],["Jump Squats","4×15"],["High Knees","4×30s"],["Box Jumps","3×12"],["Sprint","4×20s"]],
  6: [["Curl to Press","3×12"],["Tricep Extension","3×12"],["Plank Reaches","3×10 each"],["Leg Raises","3×15"],["Bicycle Crunches","3×20"]],
}

interface ExerciseDef {
  name: string
  muscleGroup: string
  difficulty: string
  goalTypes: string[]
}

const EXERCISE_LIBRARY: ExerciseDef[] = [
  { name: "Push-ups", muscleGroup: "CHEST", difficulty: "BEGINNER", goalTypes: ["stay_active", "lose_weight", "build_muscle", "improve_endurance"] },
  { name: "Diamond Push-ups", muscleGroup: "CHEST", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Wide Push-ups", muscleGroup: "CHEST", difficulty: "BEGINNER", goalTypes: ["stay_active", "lose_weight", "build_muscle"] },
  { name: "Incline Push-ups", muscleGroup: "CHEST", difficulty: "BEGINNER", goalTypes: ["stay_active", "lose_weight"] },
  { name: "Decline Push-ups", muscleGroup: "CHEST", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Bench Press", muscleGroup: "CHEST", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Dumbbell Fly", muscleGroup: "CHEST", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Chest Dips", muscleGroup: "CHEST", difficulty: "ADVANCED", goalTypes: ["build_muscle"] },
  { name: "Pull-ups", muscleGroup: "BACK", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Chin-ups", muscleGroup: "BACK", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Bent-over Row", muscleGroup: "BACK", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Dumbbell Row", muscleGroup: "BACK", difficulty: "BEGINNER", goalTypes: ["stay_active", "build_muscle"] },
  { name: "Superman Hold", muscleGroup: "BACK", difficulty: "BEGINNER", goalTypes: ["stay_active", "lose_weight"] },
  { name: "Reverse Fly", muscleGroup: "BACK", difficulty: "BEGINNER", goalTypes: ["stay_active", "build_muscle"] },
  { name: "Deadlift", muscleGroup: "BACK", difficulty: "ADVANCED", goalTypes: ["build_muscle"] },
  { name: "Lat Pulldown", muscleGroup: "BACK", difficulty: "BEGINNER", goalTypes: ["build_muscle", "stay_active"] },
  { name: "Pike Push-ups", muscleGroup: "SHOULDERS", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Lateral Raises", muscleGroup: "SHOULDERS", difficulty: "BEGINNER", goalTypes: ["stay_active", "build_muscle"] },
  { name: "Front Raises", muscleGroup: "SHOULDERS", difficulty: "BEGINNER", goalTypes: ["stay_active"] },
  { name: "Overhead Press", muscleGroup: "SHOULDERS", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Arnold Press", muscleGroup: "SHOULDERS", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Face Pull", muscleGroup: "SHOULDERS", difficulty: "BEGINNER", goalTypes: ["stay_active", "build_muscle"] },
  { name: "Shrugs", muscleGroup: "SHOULDERS", difficulty: "BEGINNER", goalTypes: ["stay_active", "build_muscle"] },
  { name: "Bicep Curls", muscleGroup: "ARMS", difficulty: "BEGINNER", goalTypes: ["build_muscle", "stay_active"] },
  { name: "Hammer Curls", muscleGroup: "ARMS", difficulty: "BEGINNER", goalTypes: ["build_muscle"] },
  { name: "Tricep Dips", muscleGroup: "ARMS", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Tricep Extension", muscleGroup: "ARMS", difficulty: "BEGINNER", goalTypes: ["build_muscle"] },
  { name: "Close-grip Push-ups", muscleGroup: "ARMS", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Preacher Curl", muscleGroup: "ARMS", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Concentration Curl", muscleGroup: "ARMS", difficulty: "BEGINNER", goalTypes: ["build_muscle"] },
  { name: "Bodyweight Squats", muscleGroup: "LEGS", difficulty: "BEGINNER", goalTypes: ["lose_weight", "stay_active", "build_muscle", "improve_endurance"] },
  { name: "Walking Lunges", muscleGroup: "LEGS", difficulty: "BEGINNER", goalTypes: ["lose_weight", "stay_active"] },
  { name: "Glute Bridges", muscleGroup: "LEGS", difficulty: "BEGINNER", goalTypes: ["stay_active"] },
  { name: "Wall Sit", muscleGroup: "LEGS", difficulty: "BEGINNER", goalTypes: ["lose_weight", "stay_active"] },
  { name: "Calf Raises", muscleGroup: "LEGS", difficulty: "BEGINNER", goalTypes: ["stay_active"] },
  { name: "Bulgarian Split Squats", muscleGroup: "LEGS", difficulty: "ADVANCED", goalTypes: ["build_muscle"] },
  { name: "Romanian Deadlift", muscleGroup: "LEGS", difficulty: "ADVANCED", goalTypes: ["build_muscle"] },
  { name: "Goblet Squats", muscleGroup: "LEGS", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Step-ups", muscleGroup: "LEGS", difficulty: "BEGINNER", goalTypes: ["lose_weight", "stay_active"] },
  { name: "Jump Squats", muscleGroup: "LEGS", difficulty: "INTERMEDIATE", goalTypes: ["lose_weight", "improve_endurance"] },
  { name: "Plank", muscleGroup: "CORE", difficulty: "BEGINNER", goalTypes: ["stay_active", "lose_weight"] },
  { name: "Russian Twist", muscleGroup: "CORE", difficulty: "BEGINNER", goalTypes: ["stay_active", "lose_weight"] },
  { name: "Leg Raises", muscleGroup: "CORE", difficulty: "BEGINNER", goalTypes: ["build_muscle", "stay_active"] },
  { name: "Bicycle Crunches", muscleGroup: "CORE", difficulty: "BEGINNER", goalTypes: ["lose_weight", "stay_active"] },
  { name: "Mountain Climbers", muscleGroup: "CORE", difficulty: "INTERMEDIATE", goalTypes: ["lose_weight", "improve_endurance"] },
  { name: "Hanging Knee Raises", muscleGroup: "CORE", difficulty: "INTERMEDIATE", goalTypes: ["build_muscle"] },
  { name: "Plank Reaches", muscleGroup: "CORE", difficulty: "BEGINNER", goalTypes: ["stay_active"] },
  { name: "Dead Bug", muscleGroup: "CORE", difficulty: "BEGINNER", goalTypes: ["stay_active", "lose_weight"] },
  { name: "Burpees", muscleGroup: "FULL_BODY", difficulty: "INTERMEDIATE", goalTypes: ["lose_weight", "improve_endurance"] },
  { name: "Jumping Jacks", muscleGroup: "FULL_BODY", difficulty: "BEGINNER", goalTypes: ["lose_weight", "improve_endurance"] },
  { name: "High Knees", muscleGroup: "FULL_BODY", difficulty: "BEGINNER", goalTypes: ["lose_weight", "improve_endurance"] },
  { name: "Squat Thrusts", muscleGroup: "FULL_BODY", difficulty: "INTERMEDIATE", goalTypes: ["lose_weight", "improve_endurance"] },
  { name: "Bear Crawl", muscleGroup: "FULL_BODY", difficulty: "INTERMEDIATE", goalTypes: ["stay_active"] },
  { name: "Tuck Jumps", muscleGroup: "FULL_BODY", difficulty: "ADVANCED", goalTypes: ["improve_endurance", "lose_weight"] },
  { name: "Box Jumps", muscleGroup: "FULL_BODY", difficulty: "ADVANCED", goalTypes: ["build_muscle", "improve_endurance"] },
  { name: "Sprints", muscleGroup: "CARDIO", difficulty: "INTERMEDIATE", goalTypes: ["improve_endurance", "lose_weight"] },
  { name: "Jump Rope", muscleGroup: "CARDIO", difficulty: "BEGINNER", goalTypes: ["lose_weight", "improve_endurance"] },
  { name: "Battle Ropes", muscleGroup: "CARDIO", difficulty: "INTERMEDIATE", goalTypes: ["improve_endurance", "lose_weight"] },
]

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
    return { groups: splits[workoutDayIndex], isRestDay: false }
  }
  const splits = [["CHEST"], ["BACK"], ["SHOULDERS"], ["ARMS"], ["LEGS", "CORE"]]
  return { groups: splits[workoutDayIndex], isRestDay: false }
}

export default function WorkoutPage() {
  const { status } = useSession()
  const router = useRouter()
  const { selectedDay, setSelectedDay } = useStore()
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [todayIdx, setTodayIdx] = useState(-1)
  const [savedWorkout, setSavedWorkout] = useState<any>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [logging, setLogging] = useState(false)
  const [loggedExercises, setLoggedExercises] = useState<Array<{name: string; sets: number; reps: number}>>([])
  const [loading, setLoading] = useState(true)
  const [completedDateIds, setCompletedDateIds] = useState<Set<string>>(new Set())
  const { t, language } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [smartExercises, setSmartExercises] = useState<Array<[string, string]> | null>(null)
  const [computing, setComputing] = useState(true)
  const dayNames = [t.days.sun, t.days.mon, t.days.tue, t.days.wed, t.days.thu, t.days.fri, t.days.sat]

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
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
        const experienceLevel = profile.experienceLevel || "intermediate"
        const workoutsPerWeek = profile.workoutsPerWeek || 3
        const hasInjury = Boolean(profile.hasInjury)

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
          (fitnessGoal === "stay_active" || ex.goalTypes.includes(fitnessGoal))
        )

        if (filtered.length < 3) {
          filtered = EXERCISE_LIBRARY.filter((ex) =>
            allowedGroups.includes(ex.muscleGroup) &&
            allowedDifficulties.includes(ex.difficulty)
          )
        }

        if (filtered.length < 3) {
          filtered = EXERCISE_LIBRARY.filter((ex) =>
            allowedGroups.includes(ex.muscleGroup)
          )
        }

        if (filtered.length === 0) {
          filtered = [...EXERCISE_LIBRARY]
        }

        if (hasInjury) {
          const cautionExercises = new Set(["Burpees", "Jump Squats", "Tuck Jumps", "Box Jumps", "Sprints", "Battle Ropes"])
          filtered = filtered.filter((ex) => !cautionExercises.has(ex.name))
          if (filtered.length === 0) {
            filtered = EXERCISE_LIBRARY.filter((ex) => ex.difficulty === "BEGINNER")
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

        setSmartExercises(selected.map((ex) => [ex.name, setsReps]))
      } catch {
        setSmartExercises(null)
      }
      setComputing(false)
    }

    compute()
  }, [status, selectedDay])

  const selectedDate = weekDates[selectedDay]
  const selectedDateId = selectedDate ? formatLocalDate(selectedDate) : ""
  const todayDateId = formatLocalDate(new Date())
  const selectedDayBlocked = Boolean(selectedDateId && selectedDateId !== todayDateId)
  const workoutLocked = Boolean(selectedDateId && completedDateIds.has(selectedDateId)) || completed
  const workoutBlocked = selectedDayBlocked || workoutLocked

  if (selectedDay === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{
          background: "var(--surface)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>
            <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {t.workout}
            </motion.span>
          </div>
          <button onClick={toggleTheme} style={{
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "50%", width: "32px", height: "32px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text)",
          }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              {theme === "dark" ? (
                <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
              ) : (
                <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
              )}
            </svg>
          </button>
        </div>
        <div data-dashboard-scroll style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "32px 24px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>{t.restDay}</div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "20px" }}>
                  {t.restBody}
                </p>

              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  const muscle = MUSCLE_GROUPS[selectedDay]
  const todayExercises = smartExercises ?? (DEFAULT_EXERCISES[selectedDay] || [])

  const currentExercises = todayExercises.map(([name, reps]) => {
    const parts = reps.split("×")
    return { name, sets: parseInt(parts[0]) || 3, reps: parseInt(parts[1]) || 12 }
  })

  const updateLog = (index: number, field: string, value: string) => {
    setLoggedExercises(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: parseInt(value) }
      return updated
    })
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
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{
        background: "var(--surface)",
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>{t.workout}</div>
        <button onClick={toggleTheme} style={{
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderRadius: "50%", width: "32px", height: "32px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--text)",
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            {theme === "dark" ? (
              <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
            ) : (
              <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
            )}
          </svg>
        </button>
      </div>

      <div data-dashboard-scroll style={{ padding: "20px", flex: 1, overflowY: "auto", paddingBottom: "32px" }}>
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "20px", scrollbarWidth: "none" }}>
              {weekDates.map((date, i) => {
                const isToday = i === todayIdx
                return (
                    <motion.button
                    key={i}
                    onClick={() => setSelectedDay(i)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    style={{
                      background: i === selectedDay ? "var(--text)" : "var(--surface)",
                      border: i === selectedDay ? "1px solid var(--text)" : "1px solid var(--border)",
                      borderRadius: "14px",
                      padding: "10px 14px",
                      textAlign: "center",
                      minWidth: "52px",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      marginBottom: "4px",
                    }}>
                      {dayNames[i]}
                    </div>
                    <div style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: i === selectedDay ? "var(--bg)" : "var(--text)",
                    }}>
                      {date.getDate()}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "12px" }}>
              <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {t.todaysPlan}
              </motion.span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "20px", padding: "6px 12px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5h2v5H3z"/><path d="M19 9.5h2v5h-2z"/><path d="M5 12h14"/>
              </svg>
              {muscle}
            </div>
          </motion.div>

          {workoutBlocked && (
            <motion.div variants={fadeUp}>
              <div style={{
                background: "rgba(107, 191, 184, 0.12)",
                border: "1px solid rgba(107, 191, 184, 0.32)",
                borderRadius: "16px",
                padding: "14px 16px",
                marginBottom: "14px",
                color: "var(--text)",
              }}>
                <div style={{ fontSize: "14px", fontWeight: 900, marginBottom: "4px" }}>
                  {selectedDayBlocked ? t.todayWorkoutOnlyTitle : t.workoutLockedTitle}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.45 }}>
                  {selectedDayBlocked ? t.todayWorkoutOnlyBody : t.workoutLockedBody}
                </div>
              </div>
            </motion.div>
          )}

          {loading || computing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", overflow: "hidden", marginBottom: "16px" }}>
                {[1,2,3,4,5].map(i => (
                  <SkeletonExerciseRow key={i} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", overflow: "hidden", marginBottom: "16px" }}>
                {todayExercises.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px 16px",
                      borderBottom: i < todayExercises.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <motion.div variants={scaleIn} style={{
                        background: "var(--surface-2)",
                        borderRadius: "8px",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}>
                        {String(i + 1).padStart(2, "0")}
                      </motion.div>
                      <div style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{ex[0]}</div>
                      <div style={{
                        background: "var(--surface-2)",
                        borderRadius: "20px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}>
                        {ex[1]}
                      </div>
                    </div>
                    <ExerciseDemoPanel exerciseName={ex[0]} compact />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <button onClick={async () => {
              const selectedDate = weekDates[selectedDay]
              if (!selectedDate) return
              const dateStr = formatLocalDate(selectedDate)
              const exercises = todayExercises.map(([name, reps]) => {
                const parts = reps.split("×")
                return { name, sets: parseInt(parts[0]) || 3, reps: parseInt(parts[1]) || 12 }
              })
              const res = await fetch("/api/workout-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: dateStr, workoutName: muscle, exercises, source: "manual" }),
              })
              if (res.ok) {
                setSaveSuccess(true)
                setTimeout(() => setSaveSuccess(false), 2000)
              }
            }} style={{
              width: "100%",
              marginTop: "12px",
              background: "var(--surface-2)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "13px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}>
              {saveSuccess ? t.savedToSchedule : t.saveToSchedule}
            </button>
          </motion.div>



          <motion.div variants={fadeUp}>
            {!workoutBlocked ? (
              <button
                onClick={() => {
                  const selectedDate = weekDates[selectedDay]
                  if (!selectedDate) return
                  const dateStr = formatLocalDate(selectedDate)
                  sessionStorage.setItem("fitsched-active-workout", JSON.stringify({
                    date: dateStr,
                    workoutName: muscle,
                    exercises: currentExercises.map(e => ({ ...e })),
                  }))
                  router.push("/exercise")
                }}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  background: "#6bbfb8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(107, 191, 184, 0.3)",
                }}
              >
                {t.goExercise}
              </button>
            ) : (
              <div style={{
                width: "100%",
                marginTop: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "13px",
                fontSize: "14px",
                color: "#65c97a",
                fontWeight: 600,
                textAlign: "center"
              }}>
                {selectedDayBlocked ? t.todayOnly : t.workoutCompleted}
              </div>
            )}
          </motion.div>



          <AnimatePresence>
            {logging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.5)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
                onClick={() => setLogging(false)}
              >
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={e => e.stopPropagation()}
                  style={modalStyle}
                >
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "var(--text)",
                    marginBottom: "4px",
                  }}>
                    {t.logWorkout}
                  </h3>
                  <p style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "20px",
                  }}>
                    {t.adjustReps}
                  </p>

                  {loggedExercises.map((exercise, index) => (
                    <div key={index} style={{
                      background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                      borderLeft: "3px solid rgba(107,191,184,0.5)",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      marginBottom: "10px",
                    }}>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "10px",
                      }}>
                        {exercise.name}
                      </div>
                      <div style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}>
                        <div style={{ flex: 1 }}>
                          <label style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            letterSpacing: "0.1em",
                            fontWeight: 600,
                          }}>
                            {t.sets}
                          </label>
                          <input
                            type="number"
                            defaultValue={exercise.sets}
                            onChange={e => updateLog(index, "sets", e.target.value)}
                            style={{
                              width: "100%",
                              background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                              border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "var(--text)",
                              fontSize: "14px",
                              marginTop: "4px",
                              outline: "none",
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            letterSpacing: "0.1em",
                            fontWeight: 600,
                          }}>
                            {t.reps}
                          </label>
                          <input
                            type="number"
                            defaultValue={exercise.reps}
                            onChange={e => updateLog(index, "reps", e.target.value)}
                            style={{
                              width: "100%",
                              background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                              border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "var(--text)",
                              fontSize: "14px",
                              marginTop: "4px",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={async () => {
                      const selectedDate = weekDates[selectedDay]
                      if (!selectedDate) return
                      const dateStr = formatLocalDate(selectedDate)
                      const response = await fetch("/api/workout-log", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          date: dateStr,
                          workoutName: muscle,
                          exercises: loggedExercises,
                        }),
                      })
                      if (response.ok) {
                        window.dispatchEvent(new Event("fitsched:tokens-updated"))
                        window.dispatchEvent(new Event("fitsched:workout-completed"))
                        setCompletedDateIds((current) => new Set([...current, dateStr]))
                      }
                      setLogging(false)
                      setCompleted(true)
                    }}
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      background: "#6bbfb8",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      padding: "14px",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(107,191,184,0.3)",
                    }}
                  >
                    {t.saveWorkoutLog}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
