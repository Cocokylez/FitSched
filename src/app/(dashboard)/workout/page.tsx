"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"
import { SkeletonExerciseRow } from "@/components/Skeleton"
import { getSmartExercisePlan, parseSetsReps, toWorkoutExercises } from "@/lib/workoutRecommendations"
import { getFeedbackAdjustedExperienceLevel } from "@/lib/workoutFeedback"
import { MUSCLE_GROUPS } from "@/lib/exerciseData"
import { formatLocalDate } from "@/lib/dateUtils"

const ACCENT = "#6bbfb8"

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

type WorkoutEnvironment = "home_bodyweight" | "home_dumbbells" | "gym"
type ExerciseAccess = "BODYWEIGHT" | "DUMBBELLS" | "GYM"

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

const EXERCISE_ACCESS: Record<string, ExerciseAccess> = {
  "Bench Press": "GYM",
  "Chest Dips": "GYM",
  "Pull-ups": "GYM",
  "Chin-ups": "GYM",
  "Deadlift": "GYM",
  "Lat Pulldown": "GYM",
  "Preacher Curl": "GYM",
  "Hanging Knee Raises": "GYM",
  "Face Pull": "GYM",
  "Box Jumps": "GYM",
  "Battle Ropes": "GYM",
  "Bicep Curls": "DUMBBELLS",
  "Hammer Curls": "DUMBBELLS",
  "Bent-over Row": "DUMBBELLS",
  "Dumbbell Row": "DUMBBELLS",
  "Dumbbell Fly": "DUMBBELLS",
  "Lateral Raises": "DUMBBELLS",
  "Front Raises": "DUMBBELLS",
  "Overhead Press": "DUMBBELLS",
  "Arnold Press": "DUMBBELLS",
  "Shrugs": "DUMBBELLS",
  "Tricep Extension": "DUMBBELLS",
  "Concentration Curl": "DUMBBELLS",
  "Curl to Press": "DUMBBELLS",
  "Romanian Deadlift": "DUMBBELLS",
  "Goblet Squats": "DUMBBELLS",
}

function getAllowedExerciseAccess(environment: string): ExerciseAccess[] {
  if (environment === "home_bodyweight") return ["BODYWEIGHT"]
  if (environment === "home_dumbbells") return ["BODYWEIGHT", "DUMBBELLS"]
  return ["BODYWEIGHT", "DUMBBELLS", "GYM"]
}

function getExerciseAccess(name: string): ExerciseAccess {
  return EXERCISE_ACCESS[name] || "BODYWEIGHT"
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
    return { groups: splits[workoutDayIndex], isRestDay: false }
  }
  const splits = [["CHEST"], ["BACK"], ["SHOULDERS"], ["ARMS"], ["LEGS", "CORE"]]
  return { groups: splits[workoutDayIndex], isRestDay: false }
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  WARM:     { bg: "rgba(246,211,101,0.18)", color: "#c8960a" },
  CORE:     { bg: "rgba(107,191,184,0.18)", color: "#6bbfb8" },
  LEGS:     { bg: "rgba(138,180,255,0.18)", color: "#5b8fff" },
  PULL:     { bg: "rgba(160,100,255,0.18)", color: "#a064ff" },
  PUSH:     { bg: "rgba(249,115,115,0.18)", color: "#e85555" },
  CARDIO:   { bg: "rgba(255,165,50,0.18)",  color: "#e08010" },
  SHOULDER: { bg: "rgba(107,191,184,0.14)", color: "#6bbfb8" },
}

function getCategory(name: string, index: number): string {
  if (index === 0) return "WARM"
  const n = name.toLowerCase()
  if (n.includes("plank") || n.includes("crunch") || n.includes("twist") || n.includes("climb") || n.includes("leg raise") || n.includes("bicycle")) return "CORE"
  if (n.includes("squat") || n.includes("lunge") || n.includes("glute") || n.includes("calf") || n.includes("jump") || n.includes("step")) return "LEGS"
  if (n.includes("pull") || n.includes("row") || n.includes("curl") || n.includes("hammer") || n.includes("superman")) return "PULL"
  if (n.includes("push") || n.includes("press") || n.includes("fly") || n.includes("dip") || n.includes("pike")) return "PUSH"
  if (n.includes("burpee") || n.includes("sprint") || n.includes("high knee") || n.includes("rope") || n.includes("battle")) return "CARDIO"
  if (n.includes("raise") || n.includes("shrug") || n.includes("face pull") || n.includes("lateral") || n.includes("front")) return "SHOULDER"
  return "CORE"
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
  const [logging, setLogging] = useState(false)
  const [loggedExercises, setLoggedExercises] = useState<Array<{name: string; sets: number; reps: number}>>([])
  const [loading, setLoading] = useState(true)
  const [completedDateIds, setCompletedDateIds] = useState<Set<string>>(new Set())
  const { t, language } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [smartExercises, setSmartExercises] = useState<Array<[string, string]> | null>(null)
  const [computing, setComputing] = useState(true)
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
        const workoutsPerWeek = profile.workoutsPerWeek || 3
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

  const selectedDate = weekDates[selectedDay]
  const selectedDateId = selectedDate ? formatLocalDate(selectedDate) : ""
  const todayDateId = formatLocalDate(new Date())
  const selectedDayBlocked = Boolean(selectedDateId && selectedDateId !== todayDateId)
  const workoutLocked = Boolean(selectedDateId && completedDateIds.has(selectedDateId)) || completed
  const workoutBlocked = selectedDayBlocked || workoutLocked

  if (selectedDay === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)" }}>WORKOUT</div>
          <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">{theme === "dark" ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg>
          </button>
        </div>
        <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", padding: "0 16px", paddingBottom: 100 }}>
          <div style={{ display: "flex", gap: 6, padding: "12px 0 20px" }}>
            {weekDates.map((date, i) => {
              const isActive = i === selectedDay
              const isToday = i === todayDay
              const dateId = formatLocalDate(date)
              const isDone = completedDateIds.has(dateId)
              return (
                <motion.button key={i} onClick={() => setSelectedDay(i)} whileTap={{ scale: 0.92 }} style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: 0, position: "relative" }}>
                  <div style={{ width: "100%", borderRadius: 12, padding: "7px 2px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative", overflow: "hidden", boxSizing: "border-box", border: isToday && !isActive ? `1.5px solid ${ACCENT}` : "1.5px solid transparent", background: isActive ? "transparent" : isToday ? "transparent" : "var(--surface-2, rgba(255,255,255,0.06))" }}>
                    {isActive && (
                      <motion.div layoutId="workout-week-pill" style={{ position: "absolute", inset: 0, borderRadius: 10, background: "linear-gradient(145deg, #7dd4cc 0%, #5aaea7 100%)", boxShadow: "0 4px 14px rgba(107,191,184,0.4), inset 0 1px 0 rgba(255,255,255,0.22)" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                    )}
                    <div style={{ position: "relative", zIndex: 1, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: isActive ? "#0b1715" : isToday ? ACCENT : "var(--text-muted)", transition: "color 0.22s" }}>{DAY_ABBR[i]}</div>
                    <div style={{ position: "relative", zIndex: 1, fontSize: 17, fontWeight: 900, lineHeight: 1, color: isActive ? "#0b1715" : isToday ? ACCENT : "var(--text)", transition: "color 0.22s" }}>{date.getDate()}</div>
                    <div style={{ minHeight: 4, position: "relative", zIndex: 1, marginTop: 1 }}>
                      {isDone && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isActive ? "rgba(11,23,21,0.4)" : ACCENT }} />}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
          <div className="ios-inset-grouped" style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(107,191,184,0.1)", border: "1px solid rgba(107,191,184,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#6bbfb8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{t.restDay}</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>{t.restBody}</p>
          </div>
        </div>
      </div>
    )
  }

  const muscle = MUSCLE_GROUPS[selectedDay]
  const todayExercises = smartExercises ?? getSmartExercisePlan({ selectedDay })

  const currentExercises = toWorkoutExercises(todayExercises)

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
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column" }}>
      {/* W1 Header */}
      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)" }}>WORKOUT</div>
        <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">{theme === "dark" ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg>
        </button>
      </div>

      <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", padding: "0 16px", paddingBottom: 140 }}>
        {/* Day selector — card style */}
        <div style={{ display: "flex", gap: 6, padding: "12px 0 20px" }}>
          {weekDates.map((date, i) => {
            const isActive = i === selectedDay
            const isToday = i === todayDay
            const dateId = formatLocalDate(date)
            const isDone = completedDateIds.has(dateId)
            return (
              <motion.button key={i} onClick={() => setSelectedDay(i)} whileTap={{ scale: 0.92 }} style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: 0, position: "relative" }}>
                <div style={{ width: "100%", borderRadius: 12, padding: "7px 2px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative", overflow: "hidden", boxSizing: "border-box", border: isToday && !isActive ? `1.5px solid ${ACCENT}` : "1.5px solid transparent", background: isActive ? "transparent" : isToday ? "transparent" : "var(--surface-2, rgba(255,255,255,0.06))" }}>
                  {isActive && (
                    <motion.div layoutId="workout-week-pill" style={{ position: "absolute", inset: 0, borderRadius: 10, background: "linear-gradient(145deg, #7dd4cc 0%, #5aaea7 100%)", boxShadow: "0 4px 14px rgba(107,191,184,0.4), inset 0 1px 0 rgba(255,255,255,0.22)" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  <div style={{ position: "relative", zIndex: 1, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: isActive ? "#0b1715" : isToday ? ACCENT : "var(--text-muted)", transition: "color 0.22s" }}>{DAY_ABBR[i]}</div>
                  <div style={{ position: "relative", zIndex: 1, fontSize: 17, fontWeight: 900, lineHeight: 1, color: isActive ? "#0b1715" : isToday ? ACCENT : "var(--text)", transition: "color 0.22s" }}>{date.getDate()}</div>
                  <div style={{ minHeight: 4, position: "relative", zIndex: 1, marginTop: 1 }}>
                    {isDone && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isActive ? "rgba(11,23,21,0.4)" : ACCENT }} />}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* W1 Title block */}
        <div style={{ marginBottom: 14 }}>
          <div className="display-text" style={{ fontSize: 32, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 4 }}>{muscle}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {computing ? "Computing…" : `${todayExercises.length} exercises · ${Math.round(todayExercises.length * 4)} min · medium`}
          </div>
        </div>

        {/* FT motivation strip */}
        <div style={{ background: "rgba(107,191,184,0.08)", border: "1px solid rgba(107,191,184,0.28)", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "#6bbfb8", marginBottom: 14 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Complete to earn FitTokens
        </div>

        {/* Blocked banner */}
        {workoutBlocked && (
          <div style={{ background: "rgba(107,191,184,0.1)", border: "1px solid rgba(107,191,184,0.28)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text)", marginBottom: 3 }}>{selectedDayBlocked ? t.todayWorkoutOnlyTitle : t.workoutLockedTitle}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{selectedDayBlocked ? t.todayWorkoutOnlyBody : t.workoutLockedBody}</div>
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
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.24, ease: "easeOut" }} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, marginBottom: 10, overflow: "hidden", boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex" }}>
                    <div style={{ width: 64, padding: "14px 0 14px 14px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0, gap: 8 }}>
                      <div style={{ background: catStyle.bg, color: catStyle.color, borderRadius: 6, padding: "2px 6px", fontSize: 9, fontWeight: 900, letterSpacing: "0.1em" }}>{category}</div>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: catStyle.bg, border: `1px solid ${catStyle.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: catStyle.color }}>{i + 1}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: "14px 14px 14px 8px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: 8, marginBottom: 6 }}>
                        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 800, color: "var(--text-muted)", flexShrink: 0 }}>{setsReps}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.2px", marginBottom: 5, lineHeight: 1.1 }}>{name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>{getExerciseDesc(name)}</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "8px 16px", paddingBottom: "max(14px, env(safe-area-inset-bottom))", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        {!workoutBlocked ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={async () => {
                const selectedDate = weekDates[selectedDay]
                if (!selectedDate) return
                const dateStr = formatLocalDate(selectedDate)
                const exercises = todayExercises.map(([name, reps]) => ({ name, ...parseSetsReps(reps) }))
                const res = await fetch("/api/workout-schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: dateStr, workoutName: muscle, exercises, source: "manual" }) })
                if (res.ok) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000) }
              }}
              style={{ width: "100%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {saveSuccess ? t.savedToSchedule : t.saveToSchedule}
            </button>
            <button
              onClick={() => {
                const selectedDate = weekDates[selectedDay]
                if (!selectedDate) return
                const dateStr = formatLocalDate(selectedDate)
                sessionStorage.setItem("fitsched-active-workout", JSON.stringify({ date: dateStr, workoutName: muscle, exercises: currentExercises.map(e => ({ ...e })) }))
                router.push("/exercise")
              }}
              style={{ width: "100%", border: "none", background: "#6bbfb8", color: "#0b1715", borderRadius: 14, padding: 13, fontSize: 14, fontWeight: 950, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(107,191,184,0.3)" }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5h2v5H3z"/><path d="M19 9.5h2v5h-2z"/><path d="M5 12h14"/></svg>
              {t.goExercise}
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 13, fontSize: 14, color: "#65c97a", fontWeight: 600, textAlign: "center" }}>
            {selectedDayBlocked ? t.todayOnly : t.workoutCompleted}
          </div>
        )}
      </div>



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
    </div>
  )
}
