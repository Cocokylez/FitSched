"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { SkeletonCard } from "@/components/Skeleton"
import { FitTokenBalancePill } from "@/components/FitTokenBalancePill"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"
import { getSmartExercisePlan, toWorkoutExercises } from "@/lib/workoutRecommendations"

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

const MUSCLE_GROUPS = ["Rest", "Chest & Triceps", "Back & Biceps", "Legs", "Shoulders & Core", "Full Body", "Arms & Core"]

const DAY_EXERCISES: Record<number, Array<{ name: string; sets: number; reps: number }>> = {
  1: [
    { name: "Push-ups", sets: 3, reps: 15 },
    { name: "Diamond Push-ups", sets: 3, reps: 10 },
    { name: "Tricep Dips", sets: 3, reps: 12 },
    { name: "Chest Fly", sets: 3, reps: 12 },
    { name: "Close-grip Push-ups", sets: 3, reps: 10 },
  ],
  2: [
    { name: "Pull-ups", sets: 3, reps: 10 },
    { name: "Bicep Curls", sets: 3, reps: 12 },
    { name: "Hammer Curls", sets: 3, reps: 10 },
    { name: "Superman Hold", sets: 3, reps: 30 },
    { name: "Reverse Fly", sets: 3, reps: 12 },
  ],
  3: [
    { name: "Squats", sets: 4, reps: 15 },
    { name: "Lunges", sets: 3, reps: 12 },
    { name: "Glute Bridges", sets: 3, reps: 15 },
    { name: "Wall Sit", sets: 3, reps: 45 },
    { name: "Calf Raises", sets: 3, reps: 20 },
  ],
  4: [
    { name: "Pike Push-ups", sets: 3, reps: 12 },
    { name: "Lateral Raises", sets: 3, reps: 15 },
    { name: "Plank", sets: 3, reps: 45 },
    { name: "Russian Twist", sets: 3, reps: 20 },
    { name: "Mountain Climbers", sets: 3, reps: 30 },
  ],
  5: [
    { name: "Burpees", sets: 4, reps: 10 },
    { name: "Jump Squats", sets: 4, reps: 15 },
    { name: "High Knees", sets: 4, reps: 30 },
    { name: "Box Jumps", sets: 3, reps: 12 },
    { name: "Sprint", sets: 4, reps: 20 },
  ],
  6: [
    { name: "Curl to Press", sets: 3, reps: 12 },
    { name: "Tricep Extension", sets: 3, reps: 12 },
    { name: "Plank Reaches", sets: 3, reps: 10 },
    { name: "Leg Raises", sets: 3, reps: 15 },
    { name: "Bicycle Crunches", sets: 3, reps: 20 },
  ],
}

interface ScheduleBlock {
  id?: string
  time: string
  label: string
  kind: "cls" | "free" | "wrk" | "rst"
  duration: string
  hint?: string
  description?: string
  source?: "manual" | "calendar" | "workout" | "mock"
  exercises?: Array<{ name: string; sets?: number; reps?: number; description?: string; time?: string }>
}

const MOCK: Record<number, ScheduleBlock[]> = {
  0: [{ time: "7:00", label: "Wake up", kind: "rst", duration: "" }, { time: "9:00", label: "Free", kind: "free", duration: "3h" }, { time: "12:00", label: "Lunch", kind: "free", duration: "2h" }, { time: "14:00", label: "Afternoon rest", kind: "rst", duration: "" }],
  1: [{ time: "7:30", label: "Data Structures", kind: "cls", duration: "90m" }, { time: "9:00", label: "Free", kind: "free", duration: "2h" }, { time: "11:00", label: "Calculus", kind: "cls", duration: "90m" }, { time: "12:30", label: "Lunch", kind: "free", duration: "1h" }, { time: "13:30", label: "STS", kind: "cls", duration: "90m" }, { time: "15:00", label: "Free", kind: "free", duration: "2.5h — best window" }],
  2: [{ time: "8:00", label: "PE", kind: "cls", duration: "2h" }, { time: "10:00", label: "Free", kind: "free", duration: "3h" }, { time: "13:00", label: "Programming", kind: "cls", duration: "90m" }, { time: "14:30", label: "Free", kind: "free", duration: "2h" }],
  3: [{ time: "7:30", label: "English", kind: "cls", duration: "90m" }, { time: "9:00", label: "Math", kind: "cls", duration: "90m" }, { time: "10:30", label: "Free", kind: "free", duration: "90m" }, { time: "12:00", label: "Lunch", kind: "free", duration: "1h" }, { time: "13:00", label: "CS Lab", kind: "cls", duration: "3h" }, { time: "16:00", label: "Free", kind: "free", duration: "1.5h — best window" }],
  4: [{ time: "8:00", label: "Data Structures", kind: "cls", duration: "90m" }, { time: "9:30", label: "Free", kind: "free", duration: "2h" }, { time: "11:30", label: "STS", kind: "cls", duration: "90m" }, { time: "13:00", label: "Free", kind: "free", duration: "2h" }],
  5: [{ time: "8:00", label: "Free", kind: "free", duration: "All morning" }, { time: "12:00", label: "Lunch", kind: "free", duration: "1h" }, { time: "13:00", label: "Free", kind: "free", duration: "All afternoon" }],
  6: [{ time: "9:00", label: "Free", kind: "free", duration: "All day" }, { time: "12:00", label: "Lunch", kind: "free", duration: "1h" }],
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatManualTime(value: string) {
  if (!value) return ""
  const [hourRaw, minute = "00"] = value.split(":")
  const hour = Number(hourRaw)
  if (Number.isNaN(hour)) return value
  const suffix = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${suffix}`
}

export default function SchedulePage() {
  const { status } = useSession()
  const router = useRouter()
  const sp = useSearchParams()
  const { selectedDay, setSelectedDay, setCalendarConnected } = useStore()
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const { t, language } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const dayNames = [t.days.sun, t.days.mon, t.days.tue, t.days.wed, t.days.thu, t.days.fri, t.days.sat]
  const [streak, setStreak] = useState(0)
  const [newMilestone, setNewMilestone] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [manualTitle, setManualTitle] = useState("")
  const [manualDescription, setManualDescription] = useState("")
  const [manualTime, setManualTime] = useState("08:00")
  const [savingManual, setSavingManual] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [openDeleteId, setOpenDeleteId] = useState<string | null>(null)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [suggestedExercises, setSuggestedExercises] = useState<Array<{ name: string; sets: number; reps: number }>>([])
  const [workoutEnvironment, setWorkoutEnvironment] = useState("gym")
  const longPressTimer = useRef<number | null>(null)

  useEffect(() => {
    const t = new Date()
    const s = new Date(t); s.setDate(t.getDate() - t.getDay()); s.setHours(0, 0, 0, 0)
    setWeekDates(Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d }))
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const r = await fetch("/api/calendar/sync")
      if (!r.ok) return { connected: false, events: [] }
      const d = await r.json()
      if (d.connected) setCalendarConnected(true)
      return { connected: d.connected, events: d.events || [] }
    } catch { return { connected: false, events: [] } }
  }, [setCalendarConnected])

  const syncNow = useCallback(async () => {
    try { await fetch("/api/calendar/sync", { method: "POST" }) } catch {}
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status !== "authenticated") return

    const load = async () => {
      setLoading(true)
      const { connected, events } = await fetchEvents()

      // Fetch streak data
      try {
        const streakRes = await fetch("/api/streak")
        if (streakRes.ok) {
          const streakData = await streakRes.json()
          setStreak(streakData.streak)
          setNewMilestone(streakData.newMilestone)
        }
      } catch {}

      // Fetch workout schedule for selected day
      let workoutEvents: any[] = []
      let recommendationExercises: Array<{ name: string; sets: number; reps: number }> = []
      try {
        const selectedDate = weekDates[selectedDay]
        if (selectedDate) {
          try {
            const profileRes = await fetch("/api/onboarding")
            const profile = profileRes.ok ? await profileRes.json() : {}
            setWorkoutEnvironment(profile.workoutEnvironment || "gym")
            const targetMuscles = (() => {
              try {
                const raw = localStorage.getItem("fitsched-onboarding-preferences")
                const parsed = raw ? JSON.parse(raw) : {}
                return Array.isArray(parsed?.targetMuscles) ? parsed.targetMuscles : []
              } catch {
                return []
              }
            })()

            recommendationExercises = toWorkoutExercises(getSmartExercisePlan({
              selectedDay,
              fitnessGoal: profile.fitnessGoal || "stay_active",
              experienceLevel: profile.experienceLevel || "intermediate",
              workoutEnvironment: profile.workoutEnvironment || "gym",
              hasInjury: Boolean(profile.hasInjury),
              targetMuscles,
            }))
            setSuggestedExercises(recommendationExercises)
          } catch {
            recommendationExercises = toWorkoutExercises(getSmartExercisePlan({ selectedDay }))
            setSuggestedExercises(recommendationExercises)
          }

          const dateStr = formatLocalDate(selectedDate)
          const wsRes = await fetch(`/api/workout-schedule?date=${dateStr}`)
          if (wsRes.ok) {
            const wsData = await wsRes.json()
            workoutEvents = wsData.map((w: any) => {
              const details = Array.isArray(w.exercises) ? w.exercises[0] : null
              const isManual = w.source === "manual"
              return {
                id: w.id,
                time: isManual ? formatManualTime(details?.time || "") : t.workout,
                label: w.workoutName,
                kind: isManual ? "cls" as const : "wrk" as const,
                duration: isManual ? t.manual : `${w.exercises.length} ${t.exercisesCount}`,
                description: isManual ? details?.description || "" : "",
                source: isManual ? "manual" as const : "workout" as const,
                exercises: isManual ? w.exercises : (Array.isArray(w.exercises) && w.exercises.length > 0 ? w.exercises : recommendationExercises),
              }
            })
          }
        }
      } catch {}

      if (connected && events.length === 0) {
        await syncNow()
        const refreshed = await fetchEvents()
        const evs = refreshed.events
        if (evs.length > 0) {
          const dayEvs = evs.filter((e: any) => new Date(e.startTime).getDay() === selectedDay)
          if (dayEvs.length) {
            const calEvents = dayEvs.map((e: any) => ({
              time: new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              label: e.summary,
              kind: "cls" as const,
              duration: `${Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000)}m`,
            }))
            setSchedule([...calEvents, ...workoutEvents])
            setLoading(false)
            return
          }
        }
        if (workoutEvents.length > 0) {
          setSchedule(workoutEvents)
        } else {
          setSchedule([{ time: "", label: "No events today", kind: "rst", duration: "Clear day" }])
        }
        setLoading(false)
        return
      }
      if (events.length > 0) {
        const dayEvs = events.filter((e: any) => new Date(e.startTime).getDay() === selectedDay)
        const calEvents = dayEvs.length ? dayEvs.map((e: any) => ({
          time: new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          label: e.summary,
          kind: "cls" as const,
          duration: `${Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000)}m`,
        })) : []
        setSchedule([...calEvents, ...workoutEvents])
      } else {
        const mockEvents = MOCK[selectedDay] || []
        setSchedule([...mockEvents, ...workoutEvents])
      }
      setLoading(false)
    }
    load()
  }, [status, selectedDay, fetchEvents, syncNow, router, weekDates, t.workout, reloadKey])

  useEffect(() => {
    if (sp.get("connected") === "true") setCalendarConnected(true)
  }, [sp, setCalendarConnected])

  useEffect(() => {
    setOpenDeleteId(null)
  }, [selectedDay])

  const bestIdx = selectedDay !== 0 ? schedule.findIndex(b => b.kind === "free" && b.duration.includes("best")) : -1

  const workoutLabelForDay = selectedDay !== 0 && workoutEnvironment === "hike"
    ? "Hike Conditioning"
    : MUSCLE_GROUPS[selectedDay]

  const ds = schedule.map((b, i) => {
    const w = i === bestIdx
    return {
      ...b,
      kind: w ? "wrk" : b.kind,
      label: w ? workoutLabelForDay : b.label,
      duration: w ? (workoutEnvironment === "hike" ? "Best window - 35 min" : "Best window - 25 min") : b.duration,
      hint: w ? (workoutEnvironment === "hike" ? "Trail-ready conditioning" : "Optimal energy window") : b.hint,
    }
  })

  const selectedDate = weekDates[selectedDay]
  const selectedDateId = selectedDate ? formatLocalDate(selectedDate) : ""
  const todayDateId = formatLocalDate(new Date())
  const canStartExerciseToday = Boolean(selectedDateId && selectedDateId === todayDateId)

  const resetManualForm = () => {
    setManualTitle("")
    setManualDescription("")
    setManualTime("08:00")
    setEditingBlockId(null)
  }

  const openAddSchedule = () => {
    resetManualForm()
    setAddOpen(true)
  }

  const closeScheduleEditor = () => {
    setAddOpen(false)
    resetManualForm()
  }

  const saveManualSchedule = async () => {
    const title = manualTitle.trim()
    if (!title || !selectedDate) return

    setSavingManual(true)
    try {
      const body = {
        ...(editingBlockId ? { id: editingBlockId } : {}),
        date: formatLocalDate(selectedDate),
        workoutName: title,
        source: "manual",
        exercises: [{
          name: title,
          description: manualDescription.trim(),
          time: manualTime,
        }],
      }

      const response = await fetch("/api/workout-schedule", {
        method: editingBlockId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        closeScheduleEditor()
        setReloadKey((value) => value + 1)
      }
    } finally {
      setSavingManual(false)
    }
  }

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handlePressStart = (id?: string) => {
    if (!id) return
    clearLongPressTimer()
    longPressTimer.current = window.setTimeout(() => {
      setOpenDeleteId(id)
    }, 520)
  }

  const handlePressEnd = () => {
    clearLongPressTimer()
  }

  const editScheduleBlock = (block: ScheduleBlock) => {
    if (!block.id || block.source !== "manual") return
    const details = Array.isArray(block.exercises) ? block.exercises[0] : null
    setEditingBlockId(block.id)
    setManualTitle(block.label)
    setManualDescription(block.description || details?.description || "")
    setManualTime(typeof details?.time === "string" && details.time ? details.time : "08:00")
    setOpenDeleteId(null)
    setAddOpen(true)
  }

  const deleteScheduleBlock = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/workout-schedule?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSchedule((current) => current.filter((block) => block.id !== id))
        setOpenDeleteId(null)
        setReloadKey((value) => value + 1)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const startExerciseFromSchedule = (block: ScheduleBlock) => {
    if (!selectedDate) return
    if (!canStartExerciseToday) return

    const exercises = Array.isArray(block.exercises) && block.exercises.length > 0
      ? block.exercises.map((exercise) => ({
          name: exercise.name || block.label,
          sets: Number(exercise.sets) || 3,
          reps: Number(exercise.reps) || 12,
        }))
      : suggestedExercises.length > 0 ? suggestedExercises : (DAY_EXERCISES[selectedDay] || [{ name: block.label, sets: 3, reps: 12 }])

    sessionStorage.setItem("fitsched-active-workout", JSON.stringify({
      date: formatLocalDate(selectedDate),
      workoutName: block.label,
      exercises,
    }))
    router.push("/exercise")
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <motion.div variants={fadeUp}>
          <div style={{
            background: "var(--surface)",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>{t.fitSched}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FitTokenBalancePill />
              <button
                onClick={toggleTheme}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {theme === "dark" ? (
                    <>
                      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </>
                  ) : (
                    <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        <div data-dashboard-scroll style={{ padding: "20px", flex: 1, overflowY: "auto", paddingBottom: "100px" }}>
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "2px" }}>{t.goodMorning}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: streak > 0 ? "8px" : "20px" }}>{t.yourDay}</div>
              {streak > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "20px",
                    padding: "6px 14px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    color: "var(--text)",
                  }}
                >
                  <span>🔥</span>
                  <span style={{ fontWeight: 600 }}>{streak} day streak</span>
                </motion.div>
              )}
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "24px", scrollbarWidth: "none" }}>
                {weekDates.map((date, i) => (
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
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)" }}>
                  <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    {t.timeline}
                  </motion.span>
                </div>
                <button
                  type="button"
                  onClick={openAddSchedule}
                  style={{
                    border: "1px solid rgba(107, 191, 184, 0.34)",
                    background: "rgba(107, 191, 184, 0.12)",
                    color: "#6bbfb8",
                    borderRadius: "999px",
                    padding: "7px 13px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {t.add}
                </button>
              </div>
            </motion.div>

            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <SkeletonCard height="80px" />
                <SkeletonCard height="80px" />
                <SkeletonCard height="80px" />
              </motion.div>
            ) : ds.length === 1 && ds[0].label === "No events today" ? (
              <motion.div variants={fadeUp}>
                <div style={{
                  background: "var(--surface)",
                  border: "1px dashed var(--border)",
                  borderRadius: "14px",
                  padding: "24px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>
                    <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      {t.noEvents}
                    </motion.span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      {t.clearDay}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={stagger}>
                {ds.map((block, i) => {
                  const isWorkout = block.kind === "wrk"
                  const isManual = block.source === "manual"
                  const canDelete = Boolean(block.id)
                  const canEdit = Boolean(block.id && block.source === "manual")
                  const deleteOpen = Boolean(block.id && openDeleteId === block.id)
                  const actionWidth = canEdit ? 172 : 86
                  return (
                    <motion.div key={block.id || `${block.label}-${i}`} variants={fadeUp}>
                      <div style={{ position: "relative", marginBottom: "10px", overflow: "hidden", borderRadius: "14px" }}>
                        {canDelete && (
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              right: 0,
                              bottom: 0,
                              width: `${actionWidth}px`,
                              display: "flex",
                              gap: "6px",
                            }}
                          >
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => editScheduleBlock(block)}
                                style={{
                                  flex: 1,
                                  border: "1px solid rgba(107, 191, 184, 0.36)",
                                  background: "rgba(107, 191, 184, 0.16)",
                                  color: "#6bbfb8",
                                  borderRadius: "14px",
                                  fontSize: "12px",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  opacity: deleteOpen ? 1 : 0.72,
                                }}
                                aria-label={`${t.edit} ${block.label}`}
                              >
                                {t.edit}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => block.id && deleteScheduleBlock(block.id)}
                              disabled={deletingId === block.id}
                              style={{
                                flex: 1,
                                border: "1px solid rgba(255, 92, 92, 0.35)",
                                background: "rgba(255, 92, 92, 0.18)",
                                color: "#ff6b6b",
                                borderRadius: "14px",
                                fontSize: "12px",
                                fontWeight: 900,
                                cursor: deletingId === block.id ? "default" : "pointer",
                                opacity: deleteOpen ? 1 : 0.72,
                              }}
                              aria-label={`${t.delete} ${block.label}`}
                            >
                              {deletingId === block.id ? t.deleting : t.delete}
                            </button>
                          </div>
                        )}
                        <motion.div
                          drag={canDelete ? "x" : false}
                          dragConstraints={{ left: -(actionWidth + 6), right: 0 }}
                          dragElastic={0.08}
                          onDragEnd={(_, info) => {
                            if (!block.id) return
                            setOpenDeleteId(info.offset.x < -64 ? block.id : null)
                          }}
                          onPointerDown={() => handlePressStart(block.id)}
                          onPointerUp={handlePressEnd}
                          onPointerCancel={handlePressEnd}
                          onPointerLeave={handlePressEnd}
                          animate={{ x: deleteOpen ? -(actionWidth + 6) : 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderLeft: isWorkout ? "3px solid var(--text)" : "3px solid #555555",
                            borderRadius: "14px",
                            padding: "14px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            touchAction: canDelete ? "pan-y" : "auto",
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{block.label}</div>
                            {isWorkout && !isManual && (
                              <span style={{
                                background: "var(--surface-2)",
                                color: "var(--text-muted)",
                                fontSize: "10px",
                                borderRadius: "20px",
                                padding: "2px 8px",
                              }}>
                                {t.workoutLabel}
                              </span>
                            )}
                            {isManual && (
                              <span style={{
                                background: "rgba(107, 191, 184, 0.12)",
                                color: "#6bbfb8",
                                fontSize: "10px",
                                borderRadius: "20px",
                                padding: "2px 8px",
                              }}>
                                {t.manual}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{block.time}</div>
                          {block.description && (
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.45 }}>
                              {block.description}
                            </div>
                          )}
                          {block.hint && (
                            <div style={{ fontSize: "11px", color: "var(--text)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                              {block.hint}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0, marginLeft: "8px" }}>
                          {block.duration && (
                            <div style={{
                              background: "var(--surface-2)",
                              borderRadius: "20px",
                              padding: "4px 10px",
                              fontSize: "11px",
                              color: "var(--text-muted)",
                            }}>
                              {block.duration}
                            </div>
                          )}
                          {isWorkout && (
                            <button
                              type="button"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={() => startExerciseFromSchedule(block)}
                              disabled={!canStartExerciseToday}
                              title={!canStartExerciseToday ? t.todayWorkoutOnlyBody : undefined}
                              style={{
                                border: "none",
                                background: canStartExerciseToday ? "#6bbfb8" : "var(--surface-2)",
                                color: canStartExerciseToday ? "#ffffff" : "var(--text-muted)",
                                borderRadius: "999px",
                                padding: "7px 10px",
                                fontSize: "11px",
                                fontWeight: 800,
                                cursor: canStartExerciseToday ? "pointer" : "default",
                                whiteSpace: "nowrap",
                                opacity: canStartExerciseToday ? 1 : 0.72,
                              }}
                            >
                              {canStartExerciseToday ? t.goExercise : t.todayOnly}
                            </button>
                          )}
                        </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9997,
              background: "rgba(0, 0, 0, 0.42)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
            }}
            onClick={closeScheduleEditor}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "420px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: theme === "dark" ? "rgba(31, 31, 31, 0.78)" : "rgba(255, 255, 255, 0.78)",
                boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRadius: "22px",
                padding: "18px",
                color: "var(--text)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "-0.2px" }}>{editingBlockId ? t.editSchedule : t.addSchedule}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    {selectedDate ? `${dayNames[selectedDay]}, ${selectedDate.toLocaleDateString([], { month: "short", day: "numeric" })}` : "This week"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeScheduleEditor}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "999px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontSize: "20px",
                    lineHeight: 1,
                  }}
                  aria-label="Close add schedule"
                >
                  ×
                </button>
              </div>

              <label style={{ display: "block", marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: "7px" }}>{t.title}</div>
                <input
                  value={manualTitle}
                  onChange={(event) => setManualTitle(event.target.value)}
                  placeholder={t.classWorkAppointment}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    borderRadius: "13px",
                    padding: "13px 14px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: "7px" }}>{t.time}</div>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(event) => setManualTime(event.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    borderRadius: "13px",
                    padding: "13px 14px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: "7px" }}>{t.description}</div>
                <textarea
                  value={manualDescription}
                  onChange={(event) => setManualDescription(event.target.value)}
                  placeholder={t.optionalNotes}
                  rows={4}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    borderRadius: "13px",
                    padding: "13px 14px",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </label>

              <button
                type="button"
                onClick={saveManualSchedule}
                disabled={!manualTitle.trim() || savingManual}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "14px",
                  padding: "14px",
                  background: "var(--text)",
                  color: "var(--bg)",
                  fontSize: "14px",
                  fontWeight: 900,
                  cursor: manualTitle.trim() && !savingManual ? "pointer" : "default",
                  opacity: manualTitle.trim() && !savingManual ? 1 : 0.5,
                }}
              >
                {savingManual ? (editingBlockId ? t.saving : t.adding) : (editingBlockId ? t.saveChanges : t.addToSchedule)}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newMilestone && (
          <motion.div
            key={newMilestone}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setNewMilestone(null), 2500)}
            style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {Array.from({ length: 30 }, (_, i) => {
              const colors = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff6b9d", "#c084fc"]
              const color = colors[Math.floor(Math.random() * colors.length)]
              const x = (Math.random() - 0.5) * 300
              const y = -(Math.random() * 250 + 50)
              const size = Math.random() * 6 + 4
              const rotation = Math.random() * 720 - 360
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                  animate={{ x, y, opacity: [1, 1, 0], rotate: rotation, scale: [1, 0.8, 0] }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    background: color,
                  }}
                />
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
