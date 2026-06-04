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
import { getSmartExercisePlan, toWorkoutExercises, resolveDaySplit, getSplitLabel } from "@/lib/workoutRecommendations"
import type { MuscleGroup } from "@/lib/workoutRecommendations"
import { computeMuscleReadiness, pickFreshestTarget, type MuscleReadiness } from "@/lib/muscleReadiness"
import { formatLocalDate } from "@/lib/dateUtils"
import { ACCENT } from "@/lib/theme"

interface UserProfile {
  fitnessGoal?: string | null
  experienceLevel?: string | null
  workoutEnvironment?: string | null
  hasInjury?: boolean | null
  workoutsPerWeek?: number | null
  createdAt?: string | null
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
  0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
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
  free: "rgba(18,101,254,0.7)",
  wrk: ACCENT,
  rst: "rgba(255,255,255,0.14)",
}

const KIND_DOT: Record<string, string> = {
  cls: "#63a1ff",
  free: "#1265fe",
  wrk: "#4ec9c0",
  rst: "rgba(255,255,255,0.18)",
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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [anchorDayOfWeek, setAnchorDayOfWeek] = useState<number | null>(null)
  const [readiness, setReadiness] = useState<MuscleReadiness[] | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const [weekWorkouts, setWeekWorkouts] = useState(0)
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [weekSummary, setWeekSummary] = useState<Record<number, string[]>>(() => {
    const s: Record<number, string[]> = {}
    for (let i = 0; i < 7; i++) s[i] = (MOCK[i] || []).map(b => b.kind)
    return s
  })

  // SC2: Day letter + today's full date display
  const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]
  const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
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
      // Load this week's workout count + goal
      try {
        const [logRes, profileRes] = await Promise.all([
          fetch("/api/workout-log"),
          fetch("/api/onboarding"),
        ])
        if (logRes.ok) {
          const allLogs: Array<{ date?: string; completedAt: string; exercises?: Array<{ name: string }> }> = await logRes.json()
          // Count logs completed this calendar week (Mon–Sun)
          const now = new Date()
          const dow = now.getDay()
          const monday = new Date(now); monday.setDate(now.getDate() - ((dow + 6) % 7)); monday.setHours(0, 0, 0, 0)
          const sunday = new Date(monday); sunday.setDate(monday.getDate() + 7)
          const thisWeek = allLogs.filter((l) => {
            const d = new Date(l.completedAt)
            return d >= monday && d < sunday
          })
          setWeekWorkouts(thisWeek.length)
          // Shared readiness picture for the rest-day "Train again" pick.
          setReadiness(computeMuscleReadiness(allLogs))
        }
        if (profileRes.ok) {
          const p = await profileRes.json()
          if (p.workoutsPerWeek) setWorkoutsPerWeek(Number(p.workoutsPerWeek))
          if (p.createdAt) setAnchorDayOfWeek(new Date(p.createdAt).getDay())
        }
      } catch {}
      let workoutEvents: any[] = []
      let recommendationExercises: Array<{ name: string; sets: number; reps: number }> = []
      try {
        const selDate = weekDates[selectedDay]
        if (selDate) {
          try {
            const profileRes = await fetch("/api/onboarding")
            const profileData: UserProfile = profileRes.ok ? await profileRes.json() : {}
            setProfile(profileData)
            const anchor = profileData.createdAt ? new Date(profileData.createdAt).getDay() : 0
            setAnchorDayOfWeek(anchor)
            const wpw = Number(profileData.workoutsPerWeek) || 3
            const daySplit = resolveDaySplit(selectedDay, anchor, wpw)
            const targetMuscles = (() => { try { const raw = localStorage.getItem("fitsched-onboarding-preferences"); const p = raw ? JSON.parse(raw) : {}; return Array.isArray(p?.targetMuscles) ? p.targetMuscles : [] } catch { return [] } })()
            recommendationExercises = toWorkoutExercises(getSmartExercisePlan({ selectedDay, fitnessGoal: profileData.fitnessGoal || "stay_active", experienceLevel: getFeedbackAdjustedExperienceLevel(profileData.experienceLevel || "intermediate"), workoutEnvironment: profileData.workoutEnvironment || "gym", hasInjury: Boolean(profileData.hasInjury), targetMuscles, muscleGroupsOverride: daySplit.groups }))
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
  }, [status, selectedDay, fetchEvents, syncNow, router, weekDates, t.workout, t.exercisesCount, t.manual, reloadKey])

  useEffect(() => { if (sp.get("connected") === "true") setCalendarConnected(true) }, [sp, setCalendarConnected])
  useEffect(() => { setOpenDeleteId(null) }, [selectedDay])
  useEffect(() => {
    if (schedule.length > 0) {
      setWeekSummary(prev => ({ ...prev, [selectedDay]: schedule.map(b => b.kind) }))
    }
  }, [schedule, selectedDay])

  // Anchor the rest-day view to the user's personal cycle (null until profile
  // loads). isRestView replaces the old hardcoded "Sunday = rest" assumption.
  const daySplit = anchorDayOfWeek === null ? null : resolveDaySplit(selectedDay, anchorDayOfWeek, workoutsPerWeek)
  const isRestView = Boolean(daySplit?.isRestDay)
  const splitLabel = getSplitLabel(daySplit?.groups ?? [])

  const bestIdx = !isRestView ? schedule.findIndex(b => b.kind === "free" && b.duration.includes("best")) : -1

  const ds = schedule.map((b, i) => {
    const w = i === bestIdx
    return { ...b, kind: w ? "wrk" as const : b.kind, label: w ? splitLabel : b.label, duration: w ? "25 min" : b.duration, hint: w ? "Optimal energy window" : b.hint }
  })

  const bestBlock = bestIdx >= 0 ? ds[bestIdx] : null
  const restBlocks = ds.filter((_, i) => i !== bestIdx)

  const todayDateId = formatLocalDate(new Date())
  const selectedDateId = selectedDate ? formatLocalDate(selectedDate) : ""
  const canStartExerciseToday = Boolean(selectedDateId && selectedDateId === todayDateId)

  const preferredTargets = (() => { try { const raw = localStorage.getItem("fitsched-onboarding-preferences"); const p = raw ? JSON.parse(raw) : {}; return Array.isArray(p?.targetMuscles) ? p.targetMuscles : [] } catch { return [] } })() as MuscleGroup[]
  const freshTarget: MuscleGroup = readiness && readiness.length
    ? pickFreshestTarget(readiness, preferredTargets)
    : (preferredTargets[0] ?? "FULL_BODY")

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

    // Fallback path: when the block has no exercises and the suggested cache
    // is empty (profile still loading, AI fetch failed, etc.) compute a fresh
    // smart plan from whatever profile we have. If profile is also unloaded
    // we default to home_bodyweight — the safest plan for any user since it
    // requires no equipment.
    const fallbackExercises = (): Array<{ name: string; sets: number; reps: number }> => {
      const targetMuscles = (() => {
        try {
          const raw = localStorage.getItem("fitsched-onboarding-preferences")
          const p = raw ? JSON.parse(raw) : {}
          return Array.isArray(p?.targetMuscles) ? p.targetMuscles : []
        } catch { return [] }
      })()
      const plan = toWorkoutExercises(getSmartExercisePlan({
        selectedDay,
        fitnessGoal:        profile?.fitnessGoal || "stay_active",
        experienceLevel:    getFeedbackAdjustedExperienceLevel(profile?.experienceLevel || "intermediate"),
        workoutEnvironment: profile?.workoutEnvironment || "home_bodyweight",
        hasInjury:          Boolean(profile?.hasInjury),
        targetMuscles,
        muscleGroupsOverride: daySplit?.groups,
      }))
      return plan.length > 0 ? plan : [{ name: block.label, sets: 3, reps: 12 }]
    }

    const exercises = Array.isArray(block.exercises) && block.exercises.length > 0
      ? block.exercises.map(e => ({ name: e.name || block.label, sets: Number(e.sets) || 3, reps: Number(e.reps) || 12 }))
      : suggestedExercises.length > 0 ? suggestedExercises : fallbackExercises()
    sessionStorage.setItem("fitsched-active-workout", JSON.stringify({ date: formatLocalDate(selectedDate), workoutName: block.label, exercises }))
    router.push("/exercise")
  }

  // On-demand bonus session from a rest day: build a plan for the freshest,
  // recovery-aware muscle (biased to onboarding targets) and jump into it.
  const startTrainAgain = () => {
    if (!selectedDate || !canStartExerciseToday) return
    const plan = toWorkoutExercises(getSmartExercisePlan({
      selectedDay,
      fitnessGoal:        profile?.fitnessGoal || "stay_active",
      experienceLevel:    getFeedbackAdjustedExperienceLevel(profile?.experienceLevel || "intermediate"),
      workoutEnvironment: profile?.workoutEnvironment || "home_bodyweight",
      hasInjury:          Boolean(profile?.hasInjury),
      targetMuscles:      preferredTargets,
      muscleGroupsOverride: [freshTarget],
    }))
    if (!plan.length) return
    sessionStorage.setItem("fitsched-active-workout", JSON.stringify({
      date: formatLocalDate(selectedDate),
      workoutName: `Bonus · ${getSplitLabel([freshTarget])}`,
      exercises: plan,
    }))
    router.push("/exercise")
  }

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column" }}>
      {/* SC2 Header — date display */}
      <div style={{ padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2 }}>
            {dayOfWeekFull}
          </div>
          <div className="display-text" style={{ fontSize: 36, fontWeight: 950, color: "var(--text)", lineHeight: 1, letterSpacing: "-0.5px" }}>
            {monthName} {dateNum}
          </div>
        </div>
        <button onClick={toggleTheme} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 4 }}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {theme === "dark" ? <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></> : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>}
          </svg>
        </button>
      </div>

      <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", paddingBottom: 100 }}>
        {/* Weekly goal progress bar */}
        {weekWorkouts > 0 && (
          <div style={{ padding: "4px 16px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Weekly goal</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: weekWorkouts >= workoutsPerWeek ? ACCENT : "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                {weekWorkouts} / {workoutsPerWeek}
                {weekWorkouts >= workoutsPerWeek && (
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>
            </div>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (weekWorkouts / workoutsPerWeek) * 100)}%` }}
                transition={{ type: "spring", stiffness: 160, damping: 24, delay: 0.1 }}
                style={{ height: "100%", background: ACCENT, borderRadius: 999 }}
              />
            </div>
          </div>
        )}

        {/* Week strip — sliding glass bubble (same mechanic as DashboardNav) */}
        <div style={{ display: "flex", gap: 6, padding: "8px 16px 16px" }}>
          {weekDates.map((date, i) => {
            const isActive = i === selectedDay
            const isToday  = i === todayDay
            return (
              <motion.button
                key={i}
                onClick={() => setSelectedDay(i)}
                whileTap={{ scale: 0.92 }}
                style={{ flex: 1, border: "none", background: "transparent", cursor: "pointer", padding: 0, position: "relative" }}
              >
                {/* Bubble lives on the button — outside any overflow:hidden — so layoutId can travel */}
                {isActive && (
                  <motion.span
                    layoutId="schedule-week-pill"
                    style={{
                      position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none",
                      background: "linear-gradient(180deg, rgba(18,101,254,0.22) 0%, rgba(18,101,254,0.08) 100%)",
                      border: "1px solid rgba(18,101,254,0.32)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 18px rgba(18,101,254,0.18)",
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.78 }}
                  />
                )}
                <div style={{
                  width: "100%", borderRadius: 12, padding: "7px 2px 6px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  position: "relative", zIndex: 1, boxSizing: "border-box",
                  border: isToday && !isActive ? `1.5px solid ${ACCENT}` : "1.5px solid transparent",
                  background: !isActive && !isToday ? "var(--surface-2, rgba(255,255,255,0.06))" : "transparent",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: isActive ? ACCENT : isToday ? ACCENT : "var(--text-muted)", transition: "color 0.22s" }}>
                    {DAY_ABBR[i]}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: isActive ? "var(--text)" : isToday ? ACCENT : "var(--text)", transition: "color 0.22s" }}>
                    {date.getDate()}
                  </div>
                  {/* Activity dots */}
                  {(weekSummary[i] || []).filter(k => k !== "rst").length > 0 && (
                    <div style={{ display: "flex", gap: 2.5, justifyContent: "center" }}>
                      {(weekSummary[i] || []).filter(k => k !== "rst").slice(0, 3).map((kind, ki) => (
                        <div key={ki} style={{ width: 3, height: 3, borderRadius: "50%", background: KIND_DOT[kind] ?? ACCENT }} />
                      ))}
                    </div>
                  )}
                </div>
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
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: "linear-gradient(145deg, rgba(18,101,254,0.10), rgba(18,101,254,0.05))", border: `1px solid rgba(18,101,254,0.38)`, borderRadius: 22, padding: "16px 18px", marginBottom: 20, boxShadow: `inset 0 1px 0 rgba(18,101,254,0.18), 0 8px 32px rgba(18,101,254,0.12)` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: "0.02em" }}>Best window</div>
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
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.01em" }}>{label.charAt(0) + label.slice(1).toLowerCase()}</div>
                            {sub && <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.45, fontWeight: 600 }}>· {sub}</span>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {groupBlocks.map(block => {
                              const isWorkout = block.kind === "wrk"
                              const isFree = block.kind === "free"
                              const isManual = block.source === "manual"
                              const canDelete = Boolean(block.id)
                              const canEdit = Boolean(block.id && block.source === "manual")
                              const deleteOpen = Boolean(block.id && openDeleteId === block.id)
                              const durationMins = parseDurationMins(block.duration)
                              const endTime = block.time && durationMins > 0 ? to12h(addMins(block.time, durationMins)) : null
                              const SLIDE_W = canEdit ? 156 : 82
                              return (
                                <div
                                  key={block.id || `${block.label}-${block.time}`}
                                  style={{ borderRadius: 18, overflow: "hidden", boxShadow: "inset 0 0 0 1px var(--border), var(--shadow)" }}
                                >
                                  {/* Sliding track: card face + action tray in a flex row wider than the container */}
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
                                    style={{ display: "flex", minWidth: canDelete ? `calc(100% + ${SLIDE_W}px)` : "100%", touchAction: canDelete ? "pan-y" : "auto" }}
                                  >
                                    {/* Card face — fills visible area */}
                                    <div style={{ flexGrow: 1, flexShrink: 0, background: "var(--panel)", padding: "13px 16px", display: "flex", alignItems: "center", gap: 14, minWidth: 0, overflow: "hidden" }}>
                                      <div style={{ minWidth: 44, textAlign: "right" }}>
                                        <div className="number-text" style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{block.time}</div>
                                        {endTime && <div className="number-text" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{endTime}</div>}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{block.label}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                                          {isWorkout ? (isManual ? t.manual : t.workout) : isFree ? t.freeWindow : t.classLabel}
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                                        {block.duration && !block.duration.includes("best") && (
                                          <div style={{ background: isFree ? "rgba(18,101,254,0.15)" : "var(--surface-2)", border: isFree ? "1px solid rgba(18,101,254,0.3)" : "1px solid var(--border)", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: isFree ? ACCENT : "var(--text-muted)" }}>
                                            {block.duration.replace(" — best window", "").replace(" — best", "")}
                                          </div>
                                        )}
                                        {isWorkout && (
                                          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={() => startExerciseFromSchedule(block)} disabled={!canStartExerciseToday} style={{ border: "none", background: canStartExerciseToday ? ACCENT : "var(--surface-2)", color: canStartExerciseToday ? "#0b1715" : "var(--text-muted)", borderRadius: 999, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: canStartExerciseToday ? "pointer" : "default", opacity: canStartExerciseToday ? 1 : 0.6 }}>
                                            {canStartExerciseToday ? "Start →" : "Today only"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {/* Action tray — hidden off-screen until card slides left */}
                                    {canDelete && (
                                      <div style={{ flexShrink: 0, width: SLIDE_W, display: "flex", gap: 6, padding: "8px", alignItems: "stretch", background: "var(--panel)" }}>
                                        {canEdit && (
                                          <button type="button" onClick={() => editScheduleBlock(block)} style={{ flex: 1, border: "1px solid rgba(18,101,254,0.36)", background: "rgba(18,101,254,0.16)", color: ACCENT, borderRadius: 10, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>Edit</button>
                                        )}
                                        <button type="button" onClick={() => block.id && deleteScheduleBlock(block.id)} disabled={deletingId === block.id} style={{ flex: 1, border: "1px solid rgba(255,92,92,0.35)", background: "rgba(255,92,92,0.18)", color: "#ff6b6b", borderRadius: 10, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
                                          {deletingId === block.id ? "…" : "Delete"}
                                        </button>
                                      </div>
                                    )}
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
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{t.clearDayTitle}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>{t.clearDayHint}</div>
                </div>
              )}

              {isRestView && (
                <div className="ios-inset-grouped" style={{ padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(18,101,254,0.1)", border: `1px solid rgba(18,101,254,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{t.restDay}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: canStartExerciseToday ? 20 : 0 }}>{t.restBody}</div>
                  {canStartExerciseToday && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={startTrainAgain}
                      style={{ border: `1px solid rgba(18,101,254,0.4)`, background: "rgba(18,101,254,0.12)", color: ACCENT, borderRadius: 999, padding: "10px 22px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                    >
                      Train again · {getSplitLabel([freshTarget])}
                    </motion.button>
                  )}
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
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 7 }}>{t.title}</div>
                <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder={t.classWorkAppointment} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 13, padding: "13px 14px", fontSize: 14, outline: "none" }} />
              </label>
              <label style={{ display: "block", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 7 }}>{t.time}</div>
                <input type="time" value={manualTime} onChange={e => setManualTime(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 13, padding: "13px 14px", fontSize: 14, outline: "none" }} />
              </label>
              <label style={{ display: "block", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 7 }}>{t.description}</div>
                <textarea value={manualDescription} onChange={e => setManualDescription(e.target.value)} placeholder={t.optionalNotes} rows={3} style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 13, padding: "13px 14px", fontSize: 14, outline: "none", resize: "vertical" }} />
              </label>
              <button type="button" onClick={saveManualSchedule} disabled={!manualTitle.trim() || savingManual} style={{ width: "100%", border: "none", borderRadius: 14, padding: 14, background: "var(--text)", color: "var(--bg)", fontSize: 14, fontWeight: 900, cursor: manualTitle.trim() && !savingManual ? "pointer" : "default", opacity: manualTitle.trim() && !savingManual ? 1 : 0.5 }}>
                {savingManual ? (editingBlockId ? t.saving : t.adding) : (editingBlockId ? t.saveChanges : t.addToSchedule)}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add-event FAB — fixed bottom-right in the thumb zone, above nav bar */}
      <AnimatePresence>
        {!addOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.90 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
            onClick={openAddSchedule}
            style={{
              position: "fixed", right: 20,
              bottom: "max(160px, calc(env(safe-area-inset-bottom) + 150px))",
              zIndex: 60, width: 52, height: 52, borderRadius: "50%",
              background: ACCENT, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(18,101,254,0.45), 0 2px 8px rgba(0,0,0,0.12)",
              color: "#0d1f1e",
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </motion.button>
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
