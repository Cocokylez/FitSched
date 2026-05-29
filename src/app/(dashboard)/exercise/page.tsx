"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AnimatePresence, motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import { saveWorkoutFeedback, type SessionFeedback } from "@/lib/workoutFeedback"
import { useWorkoutVerification } from "@/lib/workoutVerification"
import { ExerciseDemoVisual } from "@/components/ExerciseDemoPanel" // still used in full panel; not in list cards
import { ACCENT } from "@/lib/theme"
import { getCategory, CATEGORY_COLORS } from "@/lib/exerciseUtils"
import { estimateCalories } from "@/lib/calorieEstimate"
import { getMuscleGroup } from "@/lib/exerciseData"
import { ACHIEVEMENT_MAP, TIER_COLORS } from "@/lib/achievements"

// Alternatives pool keyed by muscle group (display name)
const SWAP_POOL: Record<string, string[]> = {
  Chest:     ["Push-ups", "Wide Push-ups", "Incline Push-ups", "Decline Push-ups", "Diamond Push-ups", "Close-grip Push-ups"],
  Back:      ["Pull-ups", "Superman Hold", "Reverse Fly", "Bent-over Row", "Dumbbell Row", "Chin-ups"],
  Legs:      ["Bodyweight Squats", "Walking Lunges", "Glute Bridges", "Wall Sit", "Calf Raises", "Step-ups", "Jump Squats"],
  Shoulders: ["Pike Push-ups", "Lateral Raises", "Front Raises", "Overhead Press", "Face Pull", "Shrugs"],
  Arms:      ["Bicep Curls", "Hammer Curls", "Tricep Dips", "Tricep Extension", "Close-grip Push-ups", "Concentration Curl"],
  Core:      ["Plank", "Russian Twist", "Leg Raises", "Bicycle Crunches", "Mountain Climbers", "Dead Bug", "Plank Reaches"],
  "Full Body": ["Burpees", "Jumping Jacks", "High Knees", "Bear Crawl", "Squat Thrusts"],
  Cardio:    ["Jump Rope", "Sprints", "High Knees", "Mountain Climbers", "Burpees"],
}

const CONFETTI = Array.from({ length: 42 }, (_, i) => ({ id: i, left: 8 + ((i * 17) % 84), delay: (i % 9) * 0.08, drift: ((i % 7) - 3) * 18, rotate: ((i * 47) % 220) - 110, color: [ACCENT, "#f6d365", "#f97373", "#8ab4ff", "#ffffff"][i % 5] }))
const FEEDBACK_OPTIONS: Array<{ value: SessionFeedback; label: string; detail: string }> = [
  { value: "too_easy", label: "Too easy", detail: "Add challenge" },
  { value: "just_right", label: "Just right", detail: "Keep pace" },
  { value: "too_hard", label: "Too hard", detail: "Scale back" },
]

type ActiveExercise = { name: string; sets: number; reps: number; weight?: number }
type ActiveWorkout = { date: string; workoutName: string; exercises: ActiveExercise[] }
type FitTokenReward = { amount?: number; totalAwarded?: number; boosted?: boolean }
type PRRecord = { exerciseName: string; weight: number; prevBest?: number }
type ExPhase = "intro" | "permission" | "countdown" | "session"

// Returns JSX path elements for each workout category icon
function catIconPaths(category: string) {
  switch (category) {
    case "WARM":
      return <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    case "PUSH":
      return <><circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><line x1="8" y1="12" x2="16" y2="12" strokeWidth="2.5"/></>
    case "PULL":
      return <><path d="M9 3H15"/><path d="M12 3v5"/><path d="M5 9a7 7 0 1 0 14 0"/><path d="M9 16l-2 5"/><path d="M15 16l2 5"/></>
    case "LEGS":
      return <><path d="M12 2v10"/><path d="m8 12-3 9"/><path d="m16 12 3 9"/><path d="M6 12h12"/></>
    case "CORE":
      return <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    case "CARDIO":
      return <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></>
    case "SHOULDER":
      return <><circle cx="12" cy="5" r="3"/><path d="M6.5 8.5 4 15h16l-2.5-6.5"/><path d="M12 8v7"/></>
    default:
      return <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  }
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

function daysAgoLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  return `${days}d ago`
}

export default function ExerciseSessionPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()
  const abandonedKey = `fitsched-session-abandoned-date-${session?.user?.id ?? "guest"}`
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({})
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [fitTokenReward, setFitTokenReward] = useState<FitTokenReward | null>(null)
  const [checkingLock, setCheckingLock] = useState(true)
  const [locked, setLocked] = useState(false)
  const [lockReason, setLockReason] = useState<"completed" | "date" | "quit">("completed")
  const [quitConfirm, setQuitConfirm] = useState(false)
  const [streakDay, setStreakDay] = useState(1)
  const [savedWorkoutLogId, setSavedWorkoutLogId] = useState<string | null>(null)
  const [sessionFeedback, setSessionFeedback] = useState<SessionFeedback | null>(null)
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const [verifySettled, setVerifySettled] = useState(false)
  const { state: verifyState, start: startVerify, getResult } = useWorkoutVerification()
  const sessionTokenRef = useRef<string | null>(null)
  const afterRestRef    = useRef<(() => void) | null>(null)
  const workoutRef      = useRef<ActiveWorkout | null>(null)
  const sessionDoneRef  = useRef(false)   // true once celebration fires
  const quitRef         = useRef(false)   // true once user explicitly quits
  const [restSeconds, setRestSeconds] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState(60)
  const [currentExIdx, setCurrentExIdx] = useState(0)
  const [workoutNote, setWorkoutNote] = useState("")
  const [noteSaved, setNoteSaved] = useState(false)
  const [swapIdx, setSwapIdx] = useState<number | null>(null)
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [newPRs, setNewPRs] = useState<PRRecord[]>([])
  const [exerciseWeights, setExerciseWeights] = useState<Record<number, number | null>>({})
  const [phase, setPhase] = useState<ExPhase>("intro")
  const [countdownNum, setCountdownNum] = useState(3)
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, { sets: number; reps: number; completedAt: string; weight?: number }>>({})

  useEffect(() => {
    let active = true
    const loadWorkout = async () => {
      setCheckingLock(true)
      let parsed: ActiveWorkout | null = null
      try { const raw = sessionStorage.getItem("fitsched-active-workout"); if (raw) parsed = JSON.parse(raw) as ActiveWorkout } catch {}
      if (!active) return
      // Check if today's session was already abandoned
      if (parsed?.date) {
        try {
          const abandonedDate = localStorage.getItem(abandonedKey)
          if (abandonedDate === parsed.date) {
            setLockReason("quit")
            setLocked(true)
            sessionStorage.removeItem("fitsched-active-workout")
            if (active) setCheckingLock(false)
            return
          }
        } catch {}
      }
      setWorkout(parsed)
      workoutRef.current = parsed
      if (!parsed?.date) { setCheckingLock(false); return }
      try {
        const response = await fetch(`/api/workout-log?date=${encodeURIComponent(parsed.date)}`)
        if (response.ok) { const logs = await response.json(); if (active && Array.isArray(logs) && logs.length > 0) { setLockReason("completed"); setLocked(true); sessionStorage.removeItem("fitsched-active-workout") } }
      } catch {}
      // Load exercise history for "last time" hints
      try {
        const histRes = await fetch("/api/workout-log")
        if (histRes.ok && active) {
          const allLogs = await histRes.json()
          const hist: Record<string, { sets: number; reps: number; completedAt: string; weight?: number }> = {}
          for (const log of allLogs) {
            // skip today's date (we want previous sessions only)
            if (log.date === parsed?.date) continue
            for (const ex of (log.exercises || [])) {
              if (!hist[ex.name]) {
                hist[ex.name] = {
                  sets: ex.sets,
                  reps: ex.reps,
                  completedAt: log.completedAt,
                  weight: ex.weight ?? undefined,
                }
              } else if (ex.weight != null && (hist[ex.name].weight == null || ex.weight > hist[ex.name].weight!)) {
                // Keep track of personal best weight seen across all history
                hist[ex.name] = {
                  ...hist[ex.name],
                  weight: ex.weight,
                }
              }
            }
          }
          if (active) setExerciseHistory(hist)
        }
      } catch {}
      if (active) {
        try {
          const sessionRes = await fetch("/api/workout-session/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: parsed.date }) })
          if (sessionRes.ok) { const d = await sessionRes.json(); sessionTokenRef.current = d.sessionToken ?? null }
        } catch {}
      }
      if (active) setCheckingLock(false)
    }
    loadWorkout()
    return () => { active = false }
  }, [abandonedKey])

  // Elapsed timer
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(v => v + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // Rest timer countdown — calls afterRestRef.current when it hits zero
  useEffect(() => {
    if (restSeconds === null) return
    if (restSeconds <= 0) {
      setRestSeconds(null)
      if (afterRestRef.current) {
        const fn = afterRestRef.current
        afterRestRef.current = null
        fn()
      }
      return
    }
    const t = window.setTimeout(() => setRestSeconds(v => (v !== null && v > 0) ? v - 1 : null), 1000)
    return () => window.clearTimeout(t)
  }, [restSeconds])

  // Countdown 3→2→1→GO then enter session
  useEffect(() => {
    if (phase !== "countdown") return
    if (countdownNum > 0) {
      const t = window.setTimeout(() => setCountdownNum(n => n - 1), 1000)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => {
      setPhase("session")
      setCountdownNum(3)
    }, 700)
    return () => window.clearTimeout(t)
  }, [phase, countdownNum])

  // Abandon session on tab close or SPA navigation away (if not finished/quit explicitly)
  useEffect(() => {
    const markAbandoned = () => {
      if (!sessionDoneRef.current && !quitRef.current && workoutRef.current?.date) {
        try { localStorage.setItem(abandonedKey, workoutRef.current.date) } catch {}
      }
    }
    window.addEventListener("beforeunload", markAbandoned)
    return () => {
      window.removeEventListener("beforeunload", markAbandoned)
      markAbandoned() // fires on SPA unmount too
    }
  }, [])

  const totalSets = useMemo(() => workout?.exercises.reduce((s, e) => s + e.sets, 0) ?? 0, [workout])
  const doneSets = useMemo(() => Object.values(completedSets).reduce((s, v) => s + v, 0), [completedSets])
  const allDone = Boolean(workout && doneSets === totalSets && totalSets > 0)

  function handleQuit() {
    quitRef.current = true
    try {
      if (workoutRef.current?.date) {
        localStorage.setItem(abandonedKey, workoutRef.current.date)
      }
      sessionStorage.removeItem("fitsched-active-workout")
    } catch {}
    router.push("/workout")
  }

  function completeSet(exIdx: number) {
    if (!workout) return
    const ex = workout.exercises[exIdx]
    const newCount = Math.min((completedSets[exIdx] || 0) + 1, ex.sets)
    const newCompleted = { ...completedSets, [exIdx]: newCount }
    setCompletedSets(newCompleted)
    // Rest between individual sets, but not after the last set of this exercise
    // (pressing "Next Exercise" triggers the rest before advancing to the next one)
    const justFinishedAllSetsForThisEx = newCount >= ex.sets
    if (!justFinishedAllSetsForThisEx) {
      setRestSeconds(restDuration)
    }
  }

  function handleNextExercise() {
    afterRestRef.current = () => setCurrentExIdx(i => i + 1)
    setRestSeconds(restDuration)
  }

  function saveSessionFeedback(value: SessionFeedback) {
    if (!workout) return
    setSessionFeedback(value)
    setFeedbackSaved(true)
    saveWorkoutFeedback({ workoutLogId: savedWorkoutLogId, date: workout.date, workoutName: workout.workoutName, feedback: value, durationSeconds: elapsed, exerciseCount: workout.exercises.length, totalSets, totalReps: workout.exercises.reduce((s, e) => s + e.sets * e.reps, 0), createdAt: new Date().toISOString() })
  }

  const saveNote = async (text: string) => {
    if (!savedWorkoutLogId || !text.trim()) return
    try {
      await fetch("/api/workout-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedWorkoutLogId, notes: text.trim() }),
      })
      setNoteSaved(true)
    } catch {}
  }

  const swapExercise = (idx: number, newName: string) => {
    if (!workout) return
    const updated = workout.exercises.map((ex, i) =>
      i === idx ? { ...ex, name: newName } : ex
    )
    const updatedWorkout = { ...workout, exercises: updated }
    setWorkout(updatedWorkout)
    // Reset completed sets for that exercise
    setCompletedSets(prev => { const n = { ...prev }; delete n[idx]; return n })
    // Persist back to sessionStorage
    try { sessionStorage.setItem("fitsched-active-workout", JSON.stringify(updatedWorkout)) } catch {}
    setSwapIdx(null)
  }

  const finishWorkout = async () => {
    if (!workout) return
    setSaving(true)
    try {
      const { score: verificationScore } = getResult(elapsed)
      // Merge per-exercise weights into the exercises array before sending
      const exercisesWithWeight = workout.exercises.map((ex, i) => {
        const w = exerciseWeights[i]
        return w != null && w > 0 ? { ...ex, weight: w } : ex
      })
      const response = await fetch("/api/workout-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...workout,
          exercises: exercisesWithWeight,
          verificationScore,
          sessionToken: sessionTokenRef.current,
        }),
      })
      if (response.ok) {
        const savedLog = await response.json()
        setSavedWorkoutLogId(savedLog.id || null)
        setFitTokenReward(savedLog.fitTokenReward || null)
        if (Array.isArray(savedLog.newAchievements) && savedLog.newAchievements.length > 0) {
          setNewAchievements(savedLog.newAchievements)
        }
        if (Array.isArray(savedLog.newPRs) && savedLog.newPRs.length > 0) {
          setNewPRs(savedLog.newPRs)
        }
        setSessionFeedback(null)
        setFeedbackSaved(false)
        window.dispatchEvent(new Event("fitsched:tokens-updated"))
        window.dispatchEvent(new Event("fitsched:workout-completed"))
        sessionStorage.removeItem("fitsched-active-workout")
        // Clear any abandoned flag for today (they finished properly)
        try { localStorage.removeItem(abandonedKey) } catch {}
        try { const sr = await fetch("/api/streak"); if (sr.ok) { const sd = await sr.json(); setStreakDay(Number(sd.streak) || 1) } } catch {}
        sessionDoneRef.current = true
        setCelebrating(true)
        return
      }
      if (response.status === 409) { setLockReason("completed"); setLocked(true); sessionStorage.removeItem("fitsched-active-workout"); window.dispatchEvent(new Event("fitsched:workout-completed")) }
      if (response.status === 403) { setLockReason("date"); setLocked(true); sessionStorage.removeItem("fitsched-active-workout"); window.dispatchEvent(new Event("fitsched:workout-completed")) }
    } finally { setSaving(false) }
  }

  if (checkingLock) {
    return <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "grid", placeItems: "center" }}><div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.12em" }}>{t.checkingWorkout}</div></div>
  }

  if (locked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          {lockReason === "quit" ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>You already exited today&apos;s session</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.5 }}>Come back tomorrow for a fresh workout and full FitToken reward.</div>
              <button
                disabled
                style={{ width: "100%", border: "none", borderRadius: 16, padding: "16px", background: "var(--surface-2)", color: "var(--text-muted)", fontSize: 15, fontWeight: 900, cursor: "not-allowed", opacity: 0.5 }}
              >
                Go Exercise
              </button>
            </>
          ) : (
            <>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(18,101,254,0.14)", color: ACCENT, display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 22 }}>✓</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
                {lockReason === "date" ? t.todayWorkoutOnlyTitle : t.workoutAlreadyComplete}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.5 }}>
                {lockReason === "date" ? t.todayWorkoutOnlyBody : t.workoutAlreadyCompleteBody}
              </div>
              <button onClick={() => router.push("/workout")} style={{ border: "none", borderRadius: 14, padding: "13px 18px", background: ACCENT, color: "#fff", fontWeight: 900, cursor: "pointer" }}>{t.backToWorkout}</button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 16px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{t.noWorkoutLoaded}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>{t.noWorkoutLoadedBody}</div>
          <button onClick={() => router.push("/workout")} style={{ border: "none", borderRadius: 14, padding: "13px 18px", background: "var(--text)", color: "var(--bg)", fontWeight: 800, cursor: "pointer" }}>{t.backToWorkout}</button>
        </div>
      </div>
    )
  }

  // ── Intro screen ──────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#fff", color: "#111", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 200, overflowY: "auto" }}>
        {/* Inner column — max width for desktop */}
        <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", flex: 1, minHeight: "100%" }}>
          {/* Back */}
          <div style={{ padding: "20px 24px 0" }}>
            <button type="button" onClick={() => router.push("/workout")} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "#888", fontSize: 13, fontWeight: 600 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
          </div>
          {/* Content */}
          <div style={{ flex: 1, padding: "24px 24px 32px" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", color: "#bbb", marginBottom: 10 }}>TODAY&apos;S WORKOUT</div>
            <div style={{ fontSize: 44, fontWeight: 950, letterSpacing: "-1.5px", color: "#111", marginBottom: 6, lineHeight: 1.05 }}>{workout.workoutName}</div>
            <div style={{ fontSize: 14, color: "#999", fontWeight: 600, marginBottom: 32 }}>
              {workout.exercises.length} exercises · {Math.round(totalSets * 0.75)} min
            </div>
            {/* Exercise list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {workout.exercises.map((ex, i) => {
                const category = getCategory(ex.name, i)
                const catStyle = CATEGORY_COLORS[category] || CATEGORY_COLORS.CORE
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#f7f7f7", borderRadius: 14, border: "1px solid #efefef" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: catStyle.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: "#111" }}>{ex.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#bbb" }}>{ex.sets}×{ex.reps}</div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Bottom CTA — part of flow, not fixed, so desktop doesn't get a full-width bar */}
          <div style={{ padding: "16px 24px", paddingBottom: "max(24px, env(safe-area-inset-bottom))", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "10px 14px", background: "rgba(255,160,0,0.07)", border: "1px solid rgba(255,160,0,0.24)", borderRadius: 12 }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffa000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#ffa000", lineHeight: 1.4 }}>One shot only — exit means no FitTokens today</span>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setPhase("permission")}
              style={{ width: "100%", border: "none", borderRadius: 16, padding: "17px", background: "#111", color: "#fff", fontSize: 16, fontWeight: 950, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              Let&apos;s Go
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  // ── Permission screen ─────────────────────────────────────────────────────
  if (phase === "permission") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#fff", color: "#111", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px", zIndex: 200 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          {/* Icon */}
          <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#f3f3f3", display: "grid", placeItems: "center", margin: "0 auto 28px" }}>
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <path d="M12 18h.01"/>
              <path d="M9 7l1.5 3L12 8l1.5 2L15 7"/>
            </svg>
          </div>
          <div style={{ fontSize: 30, fontWeight: 950, letterSpacing: "-0.5px", marginBottom: 12 }}>Track your movement</div>
          <div style={{ fontSize: 14, color: "#888", lineHeight: 1.65, marginBottom: 40 }}>
            FitSched uses your device&apos;s motion sensors to verify your workout and award full FitTokens. Your data never leaves your device.
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => { startVerify(); setVerifySettled(true); setPhase("countdown") }}
            style={{ width: "100%", border: "none", borderRadius: 16, padding: "17px", background: "#111", color: "#fff", fontSize: 15, fontWeight: 950, cursor: "pointer", marginBottom: 10 }}
          >
            Enable Motion Tracking
          </motion.button>
          <button
            type="button"
            onClick={() => { setVerifySettled(true); setPhase("countdown") }}
            style={{ width: "100%", border: "1px solid #e8e8e8", borderRadius: 16, padding: "15px", background: "transparent", color: "#aaa", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
          >
            Skip — earn 50% FitTokens
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Countdown screen ──────────────────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={countdownNum}
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            style={{ textAlign: "center" }}
          >
            {countdownNum > 0 && (
              <div style={{ fontSize: 160, fontWeight: 950, color: "#111", lineHeight: 1, letterSpacing: "-6px", fontVariantNumeric: "tabular-nums" }}>{countdownNum}</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", color: "#111", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 50 }}>
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header — breadcrumb style */}
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => setQuitConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#aaa" }}>Today&apos;s workout</span>
        </button>
        {verifySettled && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", background: verifyState === "active" ? "rgba(18,101,254,0.10)" : "#f5f5f5", border: verifyState === "active" ? "1px solid rgba(18,101,254,0.25)" : "1px solid #e8e8e8", color: verifyState === "active" ? ACCENT : "#bbb" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: verifyState === "active" ? ACCENT : "#ccc", flexShrink: 0 }} />
            {verifyState === "active" ? "VERIFIED" : "UNVERIFIED"}
          </div>
        )}
      </div>

      {/* Title block */}
      <div style={{ padding: "10px 16px 14px" }}>
        <div style={{ fontSize: 30, fontWeight: 950, letterSpacing: "-0.5px", color: "#111" }}>{workout.workoutName}</div>
      </div>

      {/* W1 Fullscreen single exercise display */}
      <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", padding: "0 16px", paddingBottom: 120 }}>
        {(() => {
          const ex = workout.exercises[currentExIdx]
          if (!ex) return null
          const done = completedSets[currentExIdx] || 0
          const category = getCategory(ex.name, currentExIdx)
          const catStyle = CATEGORY_COLORS[category] || CATEGORY_COLORS.CORE
          const allSetsDoneForCurrent = done >= ex.sets
          const currentWeight = exerciseWeights[currentExIdx]
          const histWeight = exerciseHistory[ex.name]?.weight
          const isPRAttempt = currentWeight != null && currentWeight > 0 && (histWeight == null || currentWeight > histWeight)
          const suggested = histWeight != null ? Math.round((histWeight + 2.5) * 10) / 10 : null

          return (
            <AnimatePresence mode="wait">
              <motion.div
                key={`ex-${currentExIdx}`}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {/* Exercise name */}
                <div style={{ fontSize: 28, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.5px", lineHeight: 1.1 }}>{ex.name}</div>

                {/* Large demo visual — full-bleed */}
                <div style={{ position: "relative", width: "calc(100% + 32px)", marginLeft: -16, marginRight: -16 }}>
                  <ExerciseDemoVisual exerciseName={ex.name} height={360} objectFit="cover" />
                  <AnimatePresence>
                    {allSetsDoneForCurrent && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: "absolute", inset: 0, borderRadius: 20, background: "rgba(18,101,254,0.22)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(1px)" }}
                      >
                        <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!allSetsDoneForCurrent && (
                    <button
                      type="button"
                      onClick={() => setSwapIdx(currentExIdx)}
                      style={{ position: "absolute", top: 10, right: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.45)", borderRadius: 10, padding: "5px 10px", fontSize: 11, fontWeight: 800, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
                    >
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                      </svg>
                      Swap
                    </button>
                  )}
                </div>

                {/* Last session hint */}
                {exerciseHistory[ex.name] && (
                  <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 4, borderRadius: 999, padding: "3px 10px", background: "rgba(18,101,254,0.08)", border: "1px solid rgba(18,101,254,0.2)", fontSize: 11, fontWeight: 800, color: ACCENT }}>
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    {exerciseHistory[ex.name].weight != null && `${exerciseHistory[ex.name].weight}kg · `}Last: {exerciseHistory[ex.name].sets}×{exerciseHistory[ex.name].reps} · {daysAgoLabel(exerciseHistory[ex.name].completedAt)}
                  </div>
                )}

                {/* Set — one at a time */}
                <div>
                  {allSetsDoneForCurrent ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "20px", background: `${catStyle.color}18`, border: `1.5px solid ${catStyle.color}55`, borderRadius: 18, color: catStyle.color, fontWeight: 900, fontSize: 15 }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Complete
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => completeSet(currentExIdx)}
                      style={{
                        width: "100%", border: `1.5px solid ${catStyle.color}`,
                        background: `${catStyle.color}14`, color: catStyle.color,
                        borderRadius: 18, padding: "22px 16px",
                        fontSize: 16, fontWeight: 900, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      }}
                    >
                      <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}>
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </motion.span>
                    </motion.button>
                  )}
                  {/* Set progress bar */}
                  <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
                    {Array.from({ length: ex.sets }, (_, i) => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < done ? catStyle.color : i === done && !allSetsDoneForCurrent ? `${catStyle.color}55` : "var(--border)", transition: "background 0.3s" }} />
                    ))}
                  </div>
                </div>

                {/* Progress dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingBottom: 4 }}>
                  {workout.exercises.map((_, dotIdx) => {
                    const dotDone = (completedSets[dotIdx] || 0) >= workout.exercises[dotIdx].sets
                    const isCurrent = dotIdx === currentExIdx
                    return (
                      <div
                        key={dotIdx}
                        style={{
                          width: isCurrent ? 22 : 7,
                          height: 7,
                          borderRadius: 4,
                          background: dotDone ? catStyle.color : isCurrent ? ACCENT : "var(--border)",
                          transition: "all 0.3s ease",
                        }}
                      />
                    )
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )
        })()}
      </div>

      {/* Overall workout progress bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 3, background: "var(--surface-2)", zIndex: 10 }}>
        <div style={{ height: "100%", background: ACCENT, width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%`, transition: "width 0.5s ease", borderRadius: "0 2px 2px 0" }} />
      </div>

      {/* W1 Sticky bottom CTA — appears only when all sets for current exercise are done */}
      {(() => {
        const ex = workout.exercises[currentExIdx]
        if (!ex) return null
        const done = completedSets[currentExIdx] || 0
        const allSetsDoneForCurrent = done >= ex.sets
        const isLastExercise = currentExIdx >= workout.exercises.length - 1
        if (!allSetsDoneForCurrent) return null
        return (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
            <AnimatePresence mode="wait">
              <motion.button
                key={isLastExercise ? "finish" : `next-${currentExIdx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                type="button"
                onClick={isLastExercise ? finishWorkout : handleNextExercise}
                disabled={saving}
                style={{
                  width: "100%", border: "none", borderRadius: 16, padding: 15,
                  background: ACCENT, color: "#fff", fontSize: 15, fontWeight: 950,
                  cursor: saving ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: saving ? 0.6 : 1,
                  boxShadow: "0 8px 24px rgba(18,101,254,0.28)",
                }}
              >
                {saving ? t.saving : isLastExercise ? t.finishWorkout : "Next Exercise →"}
                {!saving && (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                )}
              </motion.button>
            </AnimatePresence>
          </div>
        )
      })()}

      {/* Exercise swap sheet */}
      <AnimatePresence>
        {swapIdx !== null && workout && (() => {
          const ex = workout.exercises[swapIdx]
          const group = getMuscleGroup(ex.name)
          const pool = (SWAP_POOL[group] ?? SWAP_POOL["Full Body"] ?? []).filter(n => n !== ex.name)
          return (
            <motion.div
              key="swap-sheet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSwapIdx(null)}
              style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 32 }}
                onClick={e => e.stopPropagation()}
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--panel)", borderRadius: "20px 20px 0 0", padding: "20px 16px max(24px, calc(env(safe-area-inset-bottom) + 16px))", maxHeight: "60vh", overflowY: "auto" }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 18px" }} />
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 12 }}>
                  SWAP · {ex.name.toUpperCase()}
                </div>
                {pool.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>No alternatives available</div>
                ) : pool.map(name => (
                  <motion.button
                    key={name}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => swapExercise(swapIdx, name)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px 16px", marginBottom: 8, cursor: "pointer", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{name}</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Quit confirmation overlay */}
      <AnimatePresence>
        {quitConfirm && (
          <motion.div
            key="quit-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px max(28px, calc(env(safe-area-inset-bottom) + 20px))" }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              style={{ width: "100%", maxWidth: 480, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 28, padding: "26px 22px 22px", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.28)", color: "#ff5050", fontSize: 20, display: "grid", placeItems: "center", margin: "0 auto 16px" }}>✗</div>
              <div style={{ fontSize: 20, fontWeight: 950, color: "var(--text)", textAlign: "center", marginBottom: 8 }}>Quit workout?</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.55, marginBottom: 22 }}>
                You only get <strong style={{ color: "var(--text)" }}>one chance per day</strong>. Leaving now means no FitTokens today and no re-entry until tomorrow.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setQuitConfirm(false)}
                  style={{ flex: 1, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", borderRadius: 16, padding: "14px 0", fontSize: 14, fontWeight: 900, cursor: "pointer" }}
                >
                  Keep going
                </button>
                <button
                  type="button"
                  onClick={handleQuit}
                  style={{ flex: 1, border: "none", background: "rgba(255,80,80,0.18)", color: "#ff5050", borderRadius: 16, padding: "14px 0", fontSize: 14, fontWeight: 900, cursor: "pointer" }}
                >
                  Quit & lose it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rest timer overlay */}
      <AnimatePresence>
        {restSeconds !== null && !celebrating && (
          <RestTimerOverlay
            seconds={restSeconds}
            total={restDuration}
            onSkip={() => setRestSeconds(null)}
            onAddTime={() => setRestSeconds(s => s !== null ? s + 30 : s)}
            onChangeDuration={(d) => { setRestDuration(d); setRestSeconds(d) }}
          />
        )}
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 60, overflow: "hidden", background: "radial-gradient(circle at 50% 18%, rgba(18,101,254,0.22), rgba(0,0,0,0.76) 58%)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", display: "grid", placeItems: "center", padding: 22 }}>
            {CONFETTI.map(p => (
              <motion.div key={p.id} initial={{ y: -80, x: 0, rotate: 0, opacity: 0 }} animate={{ y: "110vh", x: p.drift, rotate: p.rotate, opacity: [0, 1, 1, 0] }} transition={{ duration: 2.8 + (p.id % 5) * 0.18, delay: p.delay, ease: "easeOut", repeat: Infinity, repeatDelay: 0.6 }} style={{ position: "absolute", top: 0, left: `${p.left}%`, width: p.id % 3 === 0 ? 6 : 9, height: p.id % 3 === 0 ? 18 : 9, borderRadius: p.id % 3 === 0 ? 999 : 3, background: p.color }} />
            ))}
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18 }} style={{ width: "100%", maxWidth: 430, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(26,26,26,0.82)", color: "#fff", borderRadius: 28, padding: "28px 22px 22px", textAlign: "center", boxShadow: "0 30px 90px rgba(0,0,0,0.45)", position: "relative", maxHeight: "calc(100dvh - 44px)", overflowY: "auto" }}>
              <motion.div initial={{ scale: 0.5, rotate: -18 }} animate={{ scale: [0.5, 1.15, 1], rotate: [-18, 8, 0] }} transition={{ duration: 0.75, ease: "easeOut" }} style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px", display: "grid", placeItems: "center", background: "rgba(18,101,254,0.16)", border: "1px solid rgba(18,101,254,0.42)", color: ACCENT, fontSize: 26, fontWeight: 950 }}>FT</motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ fontSize: 30, fontWeight: 950, letterSpacing: "-0.5px", marginBottom: 6 }}>{t.workoutCompleteTitle}</motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} style={{ color: "rgba(255,255,255,0.64)", fontSize: 14, lineHeight: 1.45, marginBottom: 18 }}>{t.workoutCompleteBody}</motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[{ label: "Time", value: formatTime(elapsed) }, { label: "Exercises", value: String(workout?.exercises.length ?? 0) }, { label: "Sets", value: String(doneSets) }, { label: "Reps", value: String(workout?.exercises.reduce((s, e) => s + e.sets * e.reps, 0) ?? 0) }].map(item => (
                  <div key={item.label} style={{ borderRadius: 16, padding: "12px 10px", background: "rgba(255,255,255,0.065)", border: "1px solid rgba(255,255,255,0.10)", textAlign: "left" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.48)", fontWeight: 850, letterSpacing: "0.12em", marginBottom: 5 }}>{item.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 950, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{item.value}</div>
                  </div>
                ))}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} style={{ borderRadius: 14, padding: "10px 14px", background: "rgba(18,101,254,0.10)", border: "1px solid rgba(18,101,254,0.28)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 800, letterSpacing: "0.1em" }}>EST. CALORIES</div>
                <div style={{ fontSize: 18, fontWeight: 950, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>~{estimateCalories(workout?.exercises ?? [])} kcal</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.40 }} style={{ borderRadius: 18, padding: "14px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, fontWeight: 800 }}>{t.streakLabel}</span>
                <span style={{ fontSize: 16, fontWeight: 950, color: ACCENT }}>{streakDay} {t.dayStreak}</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.50 }} style={{ borderRadius: 18, padding: 16, background: "linear-gradient(135deg, rgba(18,101,254,0.2), rgba(18,101,254,0.06))", border: "1px solid rgba(18,101,254,0.32)", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", fontWeight: 850, letterSpacing: "0.12em" }}>YOU RECEIVED</div>
                  {fitTokenReward?.boosted && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.55 }}
                      style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: "#f6d365", background: "rgba(246,211,101,0.18)", border: "1px solid rgba(246,211,101,0.4)", borderRadius: 999, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}
                    >
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      2X BOOST
                    </motion.span>
                  )}
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.55 }}
                  style={{ fontSize: 44, fontWeight: 950, color: ACCENT, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
                >
                  +{fitTokenReward ? Number(fitTokenReward.amount ?? 0).toFixed(2) : "—"} FT
                </motion.div>
                {fitTokenReward && Number(fitTokenReward.amount) < 1 && Number(fitTokenReward.amount) > 0 && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>Partial reward — tap Verify next time for full +1.0 FT</div>
                )}
                {fitTokenReward && Number(fitTokenReward.amount) === 0 && (
                  <div style={{ fontSize: 11, color: "rgba(255,80,80,0.8)", marginTop: 6 }}>No tokens this session — workout was too fast to verify</div>
                )}
              </motion.div>

              {/* PRs section */}
              {newPRs.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.53 }} style={{ borderRadius: 20, padding: 14, background: "rgba(212,180,80,0.08)", border: "1px solid rgba(212,180,80,0.3)", marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", fontWeight: 850, letterSpacing: "0.11em", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                    PERSONAL RECORDS
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {newPRs.map((pr) => (
                      <motion.div
                        key={pr.exerciseName}
                        initial={{ scale: 0.88, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 12, padding: "10px 14px", background: "rgba(212,180,80,0.12)", border: "1px solid rgba(212,180,80,0.28)" }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#c8a832", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.exerciseName}</div>
                          {pr.prevBest != null && (
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.48)", marginTop: 2 }}>was {pr.prevBest} kg</div>
                          )}
                          {pr.prevBest == null && (
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.48)", marginTop: 2 }}>First time logged!</div>
                          )}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 950, color: "#c8a832", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{pr.weight} kg</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ borderRadius: 20, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 18, textAlign: "left" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", fontWeight: 850, letterSpacing: "0.11em", marginBottom: 10 }}>HOW DID IT FEEL?</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {FEEDBACK_OPTIONS.map(o => {
                    const sel = sessionFeedback === o.value
                    return (
                      <button key={o.value} type="button" onClick={() => saveSessionFeedback(o.value)} style={{ minWidth: 0, border: sel ? "1px solid rgba(18,101,254,0.7)" : "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 8px", background: sel ? "rgba(18,101,254,0.18)" : "rgba(255,255,255,0.055)", color: sel ? ACCENT : "#fff", cursor: "pointer", textAlign: "center" }}>
                        <span style={{ display: "block", fontSize: 12, fontWeight: 950, marginBottom: 3 }}>{o.label}</span>
                        <span style={{ display: "block", fontSize: 10, color: sel ? "rgba(18,101,254,0.82)" : "rgba(255,255,255,0.48)", fontWeight: 750 }}>{o.detail}</span>
                      </button>
                    )
                  })}
                </div>
                {feedbackSaved && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 9, fontSize: 11, color: "rgba(18,101,254,0.92)", fontWeight: 800, textAlign: "center" }}>Feedback saved for future recommendations.</motion.div>}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }} style={{ borderRadius: 20, padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 18, textAlign: "left" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", fontWeight: 850, letterSpacing: "0.11em", marginBottom: 10 }}>SESSION NOTES</div>
                <textarea
                  value={workoutNote}
                  onChange={(e) => { setWorkoutNote(e.target.value); setNoteSaved(false) }}
                  onBlur={() => saveNote(workoutNote)}
                  placeholder="How did it go? PR? Something to remember…"
                  rows={3}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12, padding: "10px 12px", color: "#fff", fontSize: 13, fontWeight: 500,
                    resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5,
                    boxSizing: "border-box",
                  }}
                />
                {noteSaved && (
                  <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 6, fontSize: 11, color: "rgba(18,101,254,0.9)", fontWeight: 800 }}>
                    Saved
                  </motion.div>
                )}
              </motion.div>
              {newAchievements.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", fontWeight: 850, letterSpacing: "0.11em", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>ACHIEVEMENT UNLOCKED</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {newAchievements.map(type => {
                      const def = ACHIEVEMENT_MAP[type]
                      if (!def) return null
                      const tc = TIER_COLORS[def.tier]
                      return (
                        <motion.div
                          key={type}
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 14, padding: "10px 14px", background: tc.bg, border: `1px solid ${tc.border}` }}
                        >
                          <span style={{ fontSize: 22, display: "flex", alignItems: "center", color: tc.color }} dangerouslySetInnerHTML={{ __html: def.svg }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: tc.color }}>{def.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{def.description}</div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: tc.color, background: tc.border, borderRadius: 999, padding: "2px 7px", textTransform: "uppercase" }}>{def.tier}</span>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              <button type="button" onClick={() => router.push("/workout")} style={{ width: "100%", border: "none", borderRadius: 16, padding: 15, background: ACCENT, color: "#fff", fontSize: 15, fontWeight: 950, cursor: "pointer", boxShadow: "0 12px 28px rgba(18,101,254,0.3)" }}>{t.continueLabel}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

// Brief descriptions for exercises
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

// ── Rest Timer Overlay ─────────────────────────────────────────────────────────

const REST_RING_R    = 56
const REST_RING_CIRC = 2 * Math.PI * REST_RING_R   // ≈ 351.9

function RestTimerOverlay({
  seconds,
  total,
  onSkip,
  onAddTime,
  onChangeDuration,
}: {
  seconds: number
  total: number
  onSkip: () => void
  onAddTime: () => void
  onChangeDuration: (d: number) => void
}) {
  const pct        = Math.max(0, Math.min(1, seconds / total))
  const dashoffset = REST_RING_CIRC * (1 - pct)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 90,
        background: "rgba(0,0,0,0.80)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "20px 20px max(90px, calc(env(safe-area-inset-bottom) + 90px))",
      }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 22 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 22 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        style={{
          background: "var(--panel)",
          border: "1px solid rgba(18,101,254,0.28)",
          borderRadius: 28,
          padding: "28px 24px 22px",
          width: "100%", maxWidth: 330,
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 20,
          boxShadow: "0 28px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Label */}
        <div style={{
          fontSize: 10, fontWeight: 900, letterSpacing: "0.2em",
          color: ACCENT, textTransform: "uppercase",
        }}>
          Rest
        </div>

        {/* Progress ring + countdown */}
        <div style={{ position: "relative", width: 148, height: 148 }}>
          <svg width={148} height={148} style={{ transform: "rotate(-90deg)" }}>
            {/* background track */}
            <circle cx={74} cy={74} r={REST_RING_R} fill="none" stroke="rgba(18,101,254,0.12)" strokeWidth={8} />
            {/* progress arc */}
            <circle
              cx={74} cy={74} r={REST_RING_R}
              fill="none"
              stroke={ACCENT}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={REST_RING_CIRC}
              strokeDashoffset={dashoffset}
              style={{ transition: "stroke-dashoffset 0.95s linear" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <motion.div
              key={seconds}
              initial={{ scale: 1.12, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.14 }}
              style={{
                fontSize: 46, fontWeight: 950, color: "var(--text)",
                fontVariantNumeric: "tabular-nums", lineHeight: 1,
              }}
            >
              {seconds}
            </motion.div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 3 }}>sec</div>
          </div>
        </div>

        {/* Duration chips */}
        <div style={{ display: "flex", gap: 8 }}>
          {([30, 60, 90, 120] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => onChangeDuration(d)}
              style={{
                border: total === d ? `1px solid ${ACCENT}` : "1px solid var(--border)",
                background: total === d ? "rgba(18,101,254,0.14)" : "var(--surface-2)",
                color: total === d ? ACCENT : "var(--text-muted)",
                borderRadius: 10, padding: "5px 11px",
                fontSize: 11, fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {d}s
            </button>
          ))}
        </div>

        {/* Skip / +30s */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              flex: 1,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              borderRadius: 14, padding: "13px 0",
              fontSize: 13, fontWeight: 900, cursor: "pointer",
            }}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onAddTime}
            style={{
              flex: 1,
              border: `1px solid rgba(18,101,254,0.35)`,
              background: "rgba(18,101,254,0.1)",
              color: ACCENT,
              borderRadius: 14, padding: "13px 0",
              fontSize: 13, fontWeight: 900, cursor: "pointer",
            }}
          >
            +30s
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
