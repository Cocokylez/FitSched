"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { SkeletonCard } from "@/components/Skeleton"
import { StreakWelcomeCard } from "@/components/StreakWelcomeCard"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"
import { getFeedbackAdjustedExperienceLevel } from "@/lib/workoutFeedback"
import { getSmartExercisePlan, toWorkoutExercises } from "@/lib/workoutRecommendations"
import { MUSCLE_GROUPS } from "@/lib/exerciseData"
import { formatLocalDate } from "@/lib/dateUtils"

const ACCENT = "#6bbfb8"

const DAY_EXERCISES: Record<number, Array<{ name: string; sets: number; reps: number }>> = {
  1: [{ name: "Push-ups", sets: 3, reps: 15 }, { name: "Diamond Push-ups", sets: 3, reps: 10 }, { name: "Tricep Dips", sets: 3, reps: 12 }, { name: "Chest Fly", sets: 3, reps: 12 }, { name: "Close-grip Push-ups", sets: 3, reps: 10 }],
  2: [{ name: "Pull-ups", sets: 3, reps: 10 }, { name: "Bicep Curls", sets: 3, reps: 12 }, { name: "Hammer Curls", sets: 3, reps: 10 }, { name: "Superman Hold", sets: 3, reps: 30 }, { name: "Reverse Fly", sets: 3, reps: 12 }],
  3: [{ name: "Squats", sets: 4, reps: 15 }, { name: "Lunges", sets: 3, reps: 12 }, { name: "Glute Bridges", sets: 3, reps: 15 }, { name: "Wall Sit", sets: 3, reps: 45 }, { name: "Calf Raises", sets: 3, reps: 20 }],
  4: [{ name: "Pike Push-ups", sets: 3, reps: 12 }, { name: "Lateral Raises", sets: 3, reps: 15 }, { name: "Plank", sets: 3, reps: 45 }, { name: "Russian Twist", sets: 3, reps: 20 }, { name: "Mountain Climbers", sets: 3, reps: 30 }],
  5: [{ name: "Burpees", sets: 4, reps: 10 }, { name: "Jump Squats", sets: 4, reps: 15 }, { name: "High Knees", sets: 4, reps: 30 }, { name: "Box Jumps", sets: 3, reps: 12 }, { name: "Sprint", sets: 4, reps: 20 }],
  6: [{ name: "Curl to Press", sets: 3, reps: 12 }, { name: "Tricep Extension", sets: 3, reps: 12 }, { name: "Plank Reaches", sets: 3, reps: 10 }, { name: "Leg Raises", sets: 3, reps: 15 }, { name: "Bicycle Crunches", sets: 3, reps: 20 }],
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
  0: [{ time: "9:00", label: "Free", kind: "free", duration: "3h" }, { time: "12:00", label: "Lunch", kind: "free", duration: "2h" }],
  1: [{ time: "7:30", label: "Data Structures", kind: "cls", duration: "90m" }, { time: "9:00", label: "Free window", kind: "free", duration: "2h" }, { time: "11:00", label: "Calculus", kind: "cls", duration: "90m" }, { time: "15:00", label: "Free window", kind: "free", duration: "2.5h — best window" }],
  2: [{ time: "8:00", label: "PE", kind: "cls", duration: "2h" }, { time: "10:00", label: "Free window", kind: "free", duration: "3h" }, { time: "13:00", label: "Programming", kind: "cls", duration: "90m" }, { time: "14:30", label: "Free window", kind: "free", duration: "2h" }],
  3: [{ time: "7:30", label: "English", kind: "cls", duration: "90m" }, { time: "9:00", label: "Math", kind: "cls", duration: "90m" }, { time: "10:30", label: "Free window", kind: "free", duration: "90m" }, { time: "13:00", label: "CS Lab", kind: "cls", duration: "3h" }, { time: "16:00", label: "Free window", kind: "free", duration: "1.5h — best window" }],
  4: [{ time: "8:00", label: "Data Structures", kind: "cls", duration: "90m" }, { time: "9:30", label: "Free window", kind: "free", duration: "2h" }, { time: "11:30", label: "STS", kind: "cls", duration: "90m" }, { time: "13:00", label: "Free window", kind: "free", duration: "2h" }],
  5: [{ time: "8:00", label: "Free window", kind: "free", duration: "4h — best window" }, { time: "12:00", label: "Lunch", kind: "free", duration: "1h" }, { time: "13:00", label: "Free window", kind: "free", duration: "4h" }],
  6: [{ time: "9:00", label: "Free window", kind: "free", duration: "All day" }],
}

function parseDurationMins(duration: string): number {
  const hMatch = duration.match(/(\d+(?:\.\d+)?)\s*h/)
  if (hMatch) return Math.round(parseFloat(hMatch[1]) * 60)
  const mMatch = duration.match(/(\d+(?:\.\d+)?)\s*m/)
  if (mMatch) return Math.round(parseFloat(mMatch[1]))
  return 0
}

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

function to12h(time: string): string {
  if (!time || !time.includes(":")) return time
  const [h, m] = time.split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
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

function getTimeGroup(time: string): "morning" | "afternoon" | "evening" | "unscheduled" {
  if (!time) return "unscheduled"
  const upper = time.toUpperCase()
  let hour24: number
  if (upper.includes("PM")) {
    const h = parseInt(time)
    if (isNaN(h)) return "unscheduled"
    hour24 = h === 12 ? 12 : h + 12
  } else if (upper.includes("AM")) {
    const h = parseInt(time)
    if (isNaN(h)) return "unscheduled"
    hour24 = h === 12 ? 0 : h
  } else {
    hour24 = parseInt(time.split(":")[0])
    if (isNaN(hour24)) return "unscheduled"
  }
  if (hour24 < 12) return "morning"
  if (hour24 < 17) return "afternoon"
  return "evening"
}

const KIND_ACCENT: Record<string, string> = {
  cls: "rgba(99,161,255,0.75)",
  free: "rgba(107,191,184,0.7)",
  wrk: ACCENT,
  rst: "rgba(255,255,255,0.14)",
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
  const [streak, setStreak] = useState(0)
  const [previousStreak, setPreviousStreak] = useState(0)
  const [streakBroken, setStreakBroken] = useState(false)
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
  const longPressTimer = useRef<number | null>(null)

  // SC2: Day letter + today's full date display
  const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]
  const today = new Date()
  const todayDay = today.getDay()
  const selectedDate = weekDates[selectedDay]
  const displayDate = selectedDate || today
  const monthName = displayDate.toLocaleDateString("en-US", { month: "long" })
  const dayOfWeekFull = displayDate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
  const dateNum = displayDate.getDate()

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
    if (status === "unauthenticated") { router.push("/register"); return }
    if (status !== "authenticated") return
    const load = async () => {
      setLoading(true)
      const { connected, events } = await fetchEvents()
      try {
        const streakRes = await fetch("/api/streak")
        if (streakRes.ok) {
          const d = await streakRes.json()
          setStreak(Number(d.streak) || 0)
          setPreviousStreak(Number(d.previousStreak) || 0)
          setStreakBroken(Boolean(d.streakBroken))
          setNewMilestone(d.newMilestone)
        }
      } catch {}
      let workoutEvents: any[] = []
      let recommendationExercises: Array<{ name: string; sets: number; reps: number }> = []
      try {
        const selDate = weekDates[selectedDay]
        if (selDate) {
          try {
            const profileRes = await fetch("/api/onboarding")
            const profile = profileRes.ok ? await profileRes.json() : {}
            const targetMuscles = (() => { try { const raw = localStorage.getItem("fitsched-onboarding-preferences"); const p = raw ? JSON.parse(raw) : {}; return Array.isArray(p?.targetMuscles) ? p.targetMuscles : [] } catch { return [] } })()
            recommendationExercises = toWorkoutExercises(getSmartExercisePlan({ selectedDay, fitnessGoal: profile.fitnessGoal || "stay_active", experienceLevel: getFeedbackAdjustedExperienceLevel(profile.experienceLevel || "intermediate"), workoutEnvironment: profile.workoutEnvironment || "gym", hasInjury: Boolean(profile.hasInjury), targetMuscles }))
            setSuggestedExercises(recommendationExercises)
          } catch { recommendationExercises = toWorkoutExercises(getSmartExercisePlan({ selectedDay })); setSuggestedExercises(recommendationExercises) }
          const dateStr = formatLocalDate(selDate)
          const wsRes = await fetch(`/api/workout-schedule?date=${dateStr}`)
          if (wsRes.ok) {
            const wsData = await wsRes.json()
            workoutEvents = wsData.map((w: any) => {
              const details = Array.isArray(w.exercises) ? w.exercises[0] : null
              const isManual = w.source === "manual"
              return { id: w.id, time: isManual ? formatManualTime(details?.time || "") : t.workout, label: w.workoutName, kind: isManual ? "cls" as const : "wrk" as const, duration: isManual ? t.manual : `${w.exercises.length} ${t.exercisesCount}`, description: isManual ? details?.description || "" : "", source: isManual ? "manual" as const : "workout" as const, exercises: isManual ? w.exercises : (Array.isArray(w.exercises) && w.exercises.length > 0 ? w.exercises : recommendationExercises) }
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
          if (dayEvs.length) { setSchedule([...dayEvs.map((e: any) => ({ time: new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), label: e.summary, kind: "cls" as const, duration: `${Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000)}m` })), ...workoutEvents]); setLoading(false); return }
        }
        setSchedule(workoutEvents.length > 0 ? workoutEvents : [{ time: "", label: "No events today", kind: "rst", duration: "Clear day" }])
        setLoading(false); return
      }
      if (events.length > 0) {
        const dayEvs = events.filter((e: any) => new Date(e.startTime).getDay() === selectedDay)
        setSchedule([...(dayEvs.length ? dayEvs.map((e: any) => ({ time: new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), label: e.summary, kind: "cls" as const, duration: `${Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000)}m` })) : []), ...workoutEvents])
      } else {
        setSchedule([...(MOCK[selectedDay] || []), ...workoutEvents])
      }
      setLoading(false)
    }
    load()
  }, [status, selectedDay, fetchEvents, syncNow, router, weekDates, t.workout, reloadKey])

  useEffect(() => { if (sp.get("connected") === "true") setCalendarConnected(true) }, [sp, setCalendarConnected])
  useEffect(() => { setOpenDeleteId(null) }, [selectedDay])

  const bestIdx = selectedDay !== 0 ? schedule.findIndex(b => b.kind === "free" && b.duration.includes("best")) : -1

  const ds = schedule.map((b, i) => {
    const w = i === bestIdx
    return { ...b, kind: w ? "wrk" as const : b.kind, label: w ? MUSCLE_GROUPS[selectedDay] : b.label, duration: w ? "25 min" : b.duration, hint: w ? "Optimal energy window" : b.hint }
  })

  const bestBlock = bestIdx >= 0 ? ds[bestIdx] : null
  const restBlocks = ds.filter((_, i) => i !== bestIdx)

  const todayDateId = formatLocalDate(new Date())
  const selectedDateId = selectedDate ? formatLocalDate(selectedDate) : ""
  const canStartExerciseToday = Boolean(selectedDateId && selectedDateId === todayDateId)

  const resetManualForm = () => { setManualTitle(""); setManualDescription(""); setManualTime("08:00"); setEditingBlockId(null) }
  const openAddSchedule = () => { resetManualForm(); setAddOpen(true) }
  const closeScheduleEditor = () => { setAddOpen(false); resetManualForm() }

  const saveManualSchedule = async () => {
    const title = manualTitle.trim()
    if (!title || !selectedDate) return
    setSavingManual(true)
    try {
      const body = { ...(editingBlockId ? { id: editingBlockId } : {}), date: formatLocalDate(selectedDate), workoutName: title, source: "manual", exercises: [{ name: title, description: manualDescription.trim(), time: manualTime }] }
      const response = await fetch("/api/workout-schedule", { method: editingBlockId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (response.ok) { closeScheduleEditor(); setReloadKey(v => v + 1) }
    } finally { setSavingManual(false) }
  }

  const clearLongPressTimer = () => { if (longPressTimer.current) { window.clearTimeout(longPressTimer.current); longPressTimer.current = null } }
  const handlePressStart = (id?: string) => { if (!id) return; clearLongPressTimer(); longPressTimer.current = window.setTimeout(() => setOpenDeleteId(id), 520) }
  const handlePressEnd = () => clearLongPressTimer()

  const editScheduleBlock = (block: ScheduleBlock) => {
    if (!block.id || block.source !== "manual") return
    const details = Array.isArray(block.exercises) ? block.exercises[0] : null
    setEditingBlockId(block.id); setManualTitle(block.label); setManualDescription(block.description || details?.description || ""); setManualTime(typeof details?.time === "string" && details.time ? details.time : "08:00"); setOpenDeleteId(null); setAddOpen(true)
  }

  const deleteScheduleBlock = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/workout-schedule?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (response.ok) { setSchedule(c => c.filter(b => b.id !== id)); setOpenDeleteId(null); setReloadKey(v => v + 1) }
    } finally { setDeletingId(null) }
  }

  const startExerciseFromSchedule = (block: ScheduleBlock) => {
    if (!selectedDate || !canStartExerciseToday) return
    const exercises = Array.isArray(block.exercises) && block.exercises.length > 0
      ? block.exercises.map(e => ({ name: e.name || block.label, sets: Number(e.sets) || 3, reps: Number(e.reps) || 12 }))
      : suggestedExercises.length > 0 ? suggestedExercises : (DAY_EXERCISES[selectedDay] || [{ name: block.label, sets: 3, reps: 12 }])
    sessionStorage.setItem("fitsched-active-workout", JSON.stringify({ date: formatLocalDate(selectedDate), workoutName: block.label, exercises }))
    router.push("/exercise")
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column" }}>
      {/* SC2 Header — date display */}
      <div style={{ padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: 2 }}>
            {dayOfWeekFull}
          </div>
          <div className="display-text" style={{ fontSize: 36, fontWeight: 950, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.5px" }}>
            {monthName} {dateNum}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {theme === "dark" ? <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></> : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>}
            </svg>
          </button>
          <button onClick={openAddSchedule} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", paddingBottom: 100 }}>
        {/* SC2 Week strip — single letters + animated active pill */}
        <div style={{ display: "flex", gap: 2, padding: "8px 16px 16px", justifyContent: "space-between" }}>
          {weekDates.map((date, i) => {
            const isActive = i === selectedDay
            const isToday = i === todayDay
            return (
              <motion.button key={i} onClick={() => setSelectedDay(i)} whileTap={{ scale: 0.88 }} style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: "4px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: isActive ? ACCENT : "var(--text-muted)", transition: "color 0.22s" }}>{DAY_LETTERS[i]}</div>
                <div style={{ width: 34, height: 34, borderRadius: "50%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isActive && (
                    <motion.div
                      layoutId="schedule-week-pill"
                      style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        background: "linear-gradient(145deg, #7dd4cc 0%, #5aaea7 100%)",
                        boxShadow: "0 4px 14px rgba(107,191,184,0.46), inset 0 1px 0 rgba(255,255,255,0.24)",
                      }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {isToday && !isActive && (
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${ACCENT}` }} />
                  )}
                  <span style={{ position: "relative", zIndex: 1, fontSize: 15, fontWeight: 800, color: isActive ? "#0b1715" : isToday ? ACCENT : "var(--text)" }}>{date.getDate()}</span>
                </div>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: isToday ? ACCENT : "transparent", transition: "background 0.2s", marginTop: -1 }} />
              </motion.button>
            )
          })}
        </div>

        <div style={{ padding: "0 16px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SkeletonCard height="104px" />
              <SkeletonCard height="68px" />
              <SkeletonCard height="68px" />
              <SkeletonCard height="68px" />
            </div>
          ) : (
            <>
              {/* SC2 Best window hero card */}
              {bestBlock && selectedDay !== 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: "linear-gradient(145deg, rgba(107,191,184,0.10), rgba(107,191,184,0.05))", border: `1px solid rgba(107,191,184,0.38)`, borderRadius: 22, padding: "16px 18px", marginBottom: 20, boxShadow: `inset 0 1px 0 rgba(107,191,184,0.18), 0 8px 32px rgba(107,191,184,0.12)` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill={ACCENT} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <div className="label-text" style={{ fontSize: 10, color: ACCENT }}>BEST WINDOW</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
                      {bestBlock.time ? `${to12h(bestBlock.time)} – ${to12h(addMins(bestBlock.time, 25))}` : ""}
                    </div>
                  </div>
                  <div className="display-text" style={{ fontSize: 24, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.3px", marginBottom: 4 }}>{bestBlock.label}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{suggestedExercises.length || 5} exercises · 25 min</div>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => canStartExerciseToday ? startExerciseFromSchedule(bestBlock) : undefined}
                      style={{ background: ACCENT, border: "none", borderRadius: 999, padding: "9px 18px", fontSize: 13, fontWeight: 800, color: "#0b1715", cursor: canStartExerciseToday ? "pointer" : "default", opacity: canStartExerciseToday ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                    >
                      Start
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* SCHEDULE — grouped by time of day, each block its own card */}
              {restBlocks.length > 0 && (() => {
                const TIME_GROUPS = [
                  { key: "morning" as const,     label: "MORNING",   sub: "Before noon" },
                  { key: "afternoon" as const,    label: "AFTERNOON", sub: "12 – 5 PM"   },
                  { key: "evening" as const,      label: "EVENING",   sub: "After 5 PM"  },
                  { key: "unscheduled" as const,  label: "SCHEDULE",  sub: ""            },
                ]
                return (
                  <>
                    {TIME_GROUPS.map(({ key, label, sub }) => {
                      const groupBlocks = restBlocks.filter(b => getTimeGroup(b.time) === key)
                      if (groupBlocks.length === 0) return null
                      return (
                        <div key={key} style={{ marginBottom: 18 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <div className="label-text" style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</div>
                            {sub && <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.48, fontWeight: 600 }}>· {sub}</span>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {groupBlocks.map(block => {
                              const isWorkout = block.kind === "wrk"
                              const isFree = block.kind === "free"
                              const isManual = block.source === "manual"
                              const leftAccent = KIND_ACCENT[block.kind] || KIND_ACCENT.rst
                              const canDelete = Boolean(block.id)
                              const canEdit = Boolean(block.id && block.source === "manual")
                              const deleteOpen = Boolean(block.id && openDeleteId === block.id)
                              const durationMins = parseDurationMins(block.duration)
                              const endTime = block.time && durationMins > 0 ? to12h(addMins(block.time, durationMins)) : null
                              const SLIDE_W = canEdit ? 156 : 82
                              return (
                                <div
                                  key={block.id || `${block.label}-${block.time}`}
                                  style={{ position: "relative", borderRadius: 18, overflow: "hidden", boxShadow: "inset 0 0 0 1px var(--border), var(--shadow)" }}
                                >
                                  {/* Action tray — revealed when card slides left */}
                                  {canDelete && (
                                    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: SLIDE_W, display: "flex", gap: 6, padding: "8px", alignItems: "stretch", background: "var(--panel)" }}>
                                      {canEdit && (
                                        <button type="button" onClick={() => editScheduleBlock(block)} style={{ flex: 1, border: "1px solid rgba(107,191,184,0.36)", background: "rgba(107,191,184,0.16)", color: ACCENT, borderRadius: 10, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>Edit</button>
                                      )}
                                      <button type="button" onClick={() => block.id && deleteScheduleBlock(block.id)} disabled={deletingId === block.id} style={{ flex: 1, border: "1px solid rgba(255,92,92,0.35)", background: "rgba(255,92,92,0.18)", color: "#ff6b6b", borderRadius: 10, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
                                        {deletingId === block.id ? "…" : "Delete"}
                                      </button>
                                    </div>
                                  )}
                                  {/* Draggable card surface */}
                                  <motion.div
                                    drag={canDelete ? "x" : false}
                                    dragConstraints={{ left: -SLIDE_W, right: 0 }}
                                    dragElastic={{ left: 0.06, right: 0.01 }}
                                    onDragEnd={(_, info) => { if (!block.id) return; setOpenDeleteId(info.offset.x < -44 ? block.id : null) }}
                                    onPointerDown={() => handlePressStart(block.id)}
                                    onPointerUp={handlePressEnd}
                                    onPointerCancel={handlePressEnd}
                                    onPointerLeave={handlePressEnd}
                                    animate={{ x: deleteOpen ? -SLIDE_W : 0 }}
                                    transition={{ type: "spring", stiffness: 440, damping: 36 }}
                                    onClick={() => { if (deleteOpen) setOpenDeleteId(null) }}
                                    style={{ background: "var(--panel)", padding: "13px 16px", display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1, touchAction: canDelete ? "pan-y" : "auto", borderLeft: `3px solid ${leftAccent}` }}
                                  >
                                    <div style={{ minWidth: 44, textAlign: "right" }}>
                                      <div className="number-text" style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{block.time}</div>
                                      {endTime && <div className="number-text" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{endTime}</div>}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{block.label}</div>
                                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                                        {isWorkout ? (isManual ? "Manual" : "Workout") : isFree ? "Free window" : "Class"}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                                      {block.duration && !block.duration.includes("best") && (
                                        <div style={{ background: isFree ? "rgba(107,191,184,0.15)" : "var(--surface-2)", border: isFree ? "1px solid rgba(107,191,184,0.3)" : "1px solid var(--border)", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: isFree ? ACCENT : "var(--text-muted)" }}>
                                          {block.duration.replace(" — best window", "").replace(" — best", "")}
                                        </div>
                                      )}
                                      {isWorkout && (
                                        <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => startExerciseFromSchedule(block)} disabled={!canStartExerciseToday} style={{ border: "none", background: canStartExerciseToday ? ACCENT : "var(--surface-2)", color: canStartExerciseToday ? "#0b1715" : "var(--text-muted)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: canStartExerciseToday ? "pointer" : "default", opacity: canStartExerciseToday ? 1 : 0.6 }}>
                                          {canStartExerciseToday ? "Start →" : "Today only"}
                                        </button>
                                      )}
                                    </div>
                                  </motion.div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              })()}

              {!bestBlock && restBlocks.length === 0 && (
                <div className="ios-inset-grouped" style={{ padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Clear day</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>Nothing scheduled — tap + to add a block or enjoy the rest.</div>
                </div>
              )}

              {selectedDay === 0 && (
                <div className="ios-inset-grouped" style={{ padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(107,191,184,0.1)", border: `1px solid rgba(107,191,184,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{t.restDay}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>{t.restBody}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <StreakWelcomeCard streak={streak} previousStreak={previousStreak} streakBroken={streakBroken} onGoWorkout={() => router.push("/workout")} />

      {/* Add/edit schedule modal */}
      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(0,0,0,0.42)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }} onClick={closeScheduleEditor}>
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} transition={{ duration: 0.22, ease: "easeOut" }} onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, border: "1px solid rgba(255,255,255,0.12)", background: theme === "dark" ? "rgba(31,31,31,0.78)" : "rgba(255,255,255,0.78)", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: 22, padding: 18, color: "var(--text)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>{editingBlockId ? t.editSchedule : t.addSchedule}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{selectedDate ? `${DAY_LETTERS[selectedDay]}, ${selectedDate.toLocaleDateString([], { month: "short", day: "numeric" })}` : "This week"}</div>
                </div>
                <button type="button" onClick={closeScheduleEditor} style={{ width: 34, height: 34, borderRadius: "999px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
              <label style={{ display: "block", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: 7 }}>{t.title}</div>
                <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder={t.classWorkAppointment} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 13, padding: "13px 14px", fontSize: 14, outline: "none" }} />
              </label>
              <label style={{ display: "block", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: 7 }}>{t.time}</div>
                <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 13, padding: "13px 14px", fontSize: 14, outline: "none" }} />
              </label>
              <label style={{ display: "block", marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: 7 }}>{t.description}</div>
                <textarea value={manualDescription} onChange={e => setManualDescription(e.target.value)} placeholder={t.optionalNotes} rows={3} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 13, padding: "13px 14px", fontSize: 14, outline: "none", resize: "vertical" }} />
              </label>
              <button type="button" onClick={saveManualSchedule} disabled={!manualTitle.trim() || savingManual} style={{ width: "100%", border: "none", borderRadius: 14, padding: 14, background: "var(--text)", color: "var(--bg)", fontSize: 14, fontWeight: 900, cursor: manualTitle.trim() && !savingManual ? "pointer" : "default", opacity: manualTitle.trim() && !savingManual ? 1 : 0.5 }}>
                {savingManual ? (editingBlockId ? t.saving : t.adding) : (editingBlockId ? t.saveChanges : t.addToSchedule)}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone confetti */}
      <AnimatePresence>
        {newMilestone && (
          <motion.div key={newMilestone} initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onAnimationComplete={() => setTimeout(() => setNewMilestone(null), 2500)} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {Array.from({ length: 30 }, (_, i) => { const colors = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff6b9d","#c084fc"]; const color = colors[i % colors.length]; const x = (Math.random()-0.5)*300; const y = -(Math.random()*250+50); const size = Math.random()*6+4; return <motion.div key={i} initial={{ x:0,y:0,opacity:1,rotate:0,scale:1 }} animate={{ x,y,opacity:[1,1,0],rotate:Math.random()*720-360,scale:[1,0.8,0] }} transition={{ duration:2,ease:"easeOut" }} style={{ position:"absolute",width:size,height:size,borderRadius:"50%",background:color }} /> })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
