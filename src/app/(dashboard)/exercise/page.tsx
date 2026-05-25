"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import { saveWorkoutFeedback, type SessionFeedback } from "@/lib/workoutFeedback"
import { useWorkoutVerification, type ActiveChallenge } from "@/lib/workoutVerification"
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

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = "sine"; osc.frequency.value = 880
    gain.gain.setValueAtTime(0.28, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

export default function ExerciseSessionPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({})
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [fitTokenReward, setFitTokenReward] = useState<FitTokenReward | null>(null)
  const [checkingLock, setCheckingLock] = useState(true)
  const [locked, setLocked] = useState(false)
  const [lockReason, setLockReason] = useState<"completed" | "date">("completed")
  const [streakDay, setStreakDay] = useState(1)
  const [savedWorkoutLogId, setSavedWorkoutLogId] = useState<string | null>(null)
  const [sessionFeedback, setSessionFeedback] = useState<SessionFeedback | null>(null)
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const [verifySettled, setVerifySettled] = useState(false)
  const { state: verifyState, challenge, start: startVerify, getResult } = useWorkoutVerification()
  const sessionTokenRef = useRef<string | null>(null)
  const [restSeconds, setRestSeconds] = useState<number | null>(null)
  const [restDuration, setRestDuration] = useState(60)
  const [workoutNote, setWorkoutNote] = useState("")
  const [noteSaved, setNoteSaved] = useState(false)
  const [swapIdx, setSwapIdx] = useState<number | null>(null)
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [newPRs, setNewPRs] = useState<PRRecord[]>([])
  const [exerciseWeights, setExerciseWeights] = useState<Record<number, number | null>>({})
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, { sets: number; reps: number; completedAt: string; weight?: number }>>({})

  useEffect(() => {
    let active = true
    const loadWorkout = async () => {
      setCheckingLock(true)
      let parsed: ActiveWorkout | null = null
      try { const raw = sessionStorage.getItem("fitsched-active-workout"); if (raw) parsed = JSON.parse(raw) as ActiveWorkout } catch {}
      if (!active) return
      setWorkout(parsed)
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
  }, [])

  // Elapsed timer
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(v => v + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // Rest timer countdown
  useEffect(() => {
    if (restSeconds === null) return
    if (restSeconds <= 0) {
      playBeep()
      setRestSeconds(null)
      return
    }
    const t = window.setTimeout(() => setRestSeconds(v => (v !== null && v > 0) ? v - 1 : null), 1000)
    return () => window.clearTimeout(t)
  }, [restSeconds])

  const totalSets = useMemo(() => workout?.exercises.reduce((s, e) => s + e.sets, 0) ?? 0, [workout])
  const doneSets = useMemo(() => Object.values(completedSets).reduce((s, v) => s + v, 0), [completedSets])
  const allDone = Boolean(workout && doneSets === totalSets && totalSets > 0)

  function completeSet(exIdx: number) {
    if (!workout) return
    const ex = workout.exercises[exIdx]
    const newCount = Math.min((completedSets[exIdx] || 0) + 1, ex.sets)
    const newCompleted = { ...completedSets, [exIdx]: newCount }
    setCompletedSets(newCompleted)
    // Start rest timer unless this was the very last set of the session
    const newDone = Object.values(newCompleted).reduce((s, v) => s + v, 0)
    if (newDone < totalSets) {
      setRestSeconds(restDuration)
    }
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
        try { const sr = await fetch("/api/streak"); if (sr.ok) { const sd = await sr.json(); setStreakDay(Number(sd.streak) || 1) } } catch {}
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
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 16px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "var(--surface)", border: "1px solid rgba(107,191,184,0.32)", borderRadius: 20, padding: 24, textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(107,191,184,0.14)", color: ACCENT, display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 16, fontWeight: 950 }}>OK</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{lockReason === "date" ? t.todayWorkoutOnlyTitle : t.workoutAlreadyComplete}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.5 }}>{lockReason === "date" ? t.todayWorkoutOnlyBody : t.workoutAlreadyCompleteBody}</div>
          <button onClick={() => router.push("/workout")} style={{ border: "none", borderRadius: 14, padding: "13px 18px", background: ACCENT, color: "#fff", fontWeight: 900, cursor: "pointer" }}>{t.backToWorkout}</button>
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      {/* W1 Header — breadcrumb style */}
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => router.push("/workout")} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)" }}>WORKOUT · TODAY</span>
        </button>
        {verifySettled && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", background: verifyState === "active" ? "rgba(107,191,184,0.14)" : "rgba(255,255,255,0.06)", border: verifyState === "active" ? "1px solid rgba(107,191,184,0.3)" : "1px solid var(--border)", color: verifyState === "active" ? ACCENT : "var(--text-muted)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: verifyState === "active" ? ACCENT : "var(--text-muted)", flexShrink: 0 }} />
            {verifyState === "active" ? "LIVE" : "UNVERIFIED"}
          </div>
        )}
      </div>

      {/* W1 Title block */}
      <div style={{ padding: "10px 16px 14px" }}>
        <div className="display-text" style={{ fontSize: 32, fontWeight: 950, letterSpacing: "-0.5px", color: "var(--text)", marginBottom: 4 }}>{workout.workoutName}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
          {workout.exercises.length} exercises · {Math.round(totalSets * 0.75)} min · medium
        </div>
      </div>

      {/* W1 FT earn strip */}
      <div style={{ margin: "0 16px 14px", background: "rgba(107,191,184,0.08)", border: "1px solid rgba(107,191,184,0.28)", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: ACCENT }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Finish to earn +0.2 FT
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {doneSets} of {totalSets}
        </div>
      </div>

      {/* Verification prompt */}
      {!verifySettled && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ margin: "0 16px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text)", marginBottom: 2 }}>Verify your workout</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>Enable mic to detect breathing and earn full FitTokens. Skip = 50%.</div>
          </div>
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <button type="button" onClick={() => setVerifySettled(true)} style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", borderRadius: 10, padding: "7px 11px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Skip</button>
            <button type="button" onClick={() => { startVerify(); setVerifySettled(true) }} style={{ border: "none", background: ACCENT, color: "#fff", borderRadius: 10, padding: "7px 13px", fontSize: 11, fontWeight: 900, cursor: "pointer" }}>Enable</button>
          </div>
        </motion.div>
      )}

      {/* W1 Exercise card list */}
      <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", padding: "0 16px", paddingBottom: 120 }}>
        {workout.exercises.map((ex, i) => {
          const done = completedSets[i] || 0
          const category = getCategory(ex.name, i)
          const catStyle = CATEGORY_COLORS[category] || CATEGORY_COLORS.CORE
          const allSetsDone = done >= ex.sets

          return (
            <motion.div
              key={`${ex.name}-${i}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.28, ease: "easeOut" }}
              style={{
                background: allSetsDone ? "rgba(107,191,184,0.04)" : "var(--panel)",
                borderTop: allSetsDone ? "1px solid rgba(107,191,184,0.28)" : "1px solid var(--border)",
                borderRight: allSetsDone ? "1px solid rgba(107,191,184,0.28)" : "1px solid var(--border)",
                borderBottom: allSetsDone ? "1px solid rgba(107,191,184,0.28)" : "1px solid var(--border)",
                borderLeft: `3px solid ${catStyle.color}`,
                borderRadius: 20,
                marginBottom: 12,
                overflow: "hidden",
                transition: "border-color 0.25s, background 0.25s",
              }}
            >
              {/* ── Card header: category · muscle group ── exercise # + sets×reps + done check */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 0 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: catStyle.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.11em", color: catStyle.color }}>{category}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>· {getMuscleGroup(ex.name)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>#{String(i + 1).padStart(2, "0")}</span>
                  <div style={{ background: allSetsDone ? "rgba(107,191,184,0.18)" : "var(--surface-2)", border: allSetsDone ? "1px solid rgba(107,191,184,0.35)" : "1px solid var(--border)", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 800, color: allSetsDone ? ACCENT : "var(--text-muted)", transition: "all 0.2s" }}>
                    {ex.sets}×{ex.reps}
                  </div>
                  <AnimatePresence>
                    {allSetsDone && (
                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} style={{ width: 20, height: 20, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#0b1715" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Main content: visual tile + detail */}
              <div style={{ display: "flex" }}>
                {/* Left: styled category tile */}
                <div style={{ width: 96, padding: "8px 0 10px 12px", flexShrink: 0 }}>
                  <div style={{
                    width: "100%", height: 104, borderRadius: 14,
                    background: `linear-gradient(150deg, ${catStyle.color}20 0%, ${catStyle.color}08 100%)`,
                    border: `1px solid ${catStyle.color}30`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 5, position: "relative", overflow: "hidden",
                  }}>
                    {/* Watermark number */}
                    <div style={{
                      position: "absolute", right: 3, bottom: -2,
                      fontSize: 58, fontWeight: 950, lineHeight: 1,
                      color: catStyle.color, opacity: 0.12,
                      fontVariantNumeric: "tabular-nums", userSelect: "none",
                    }}>
                      {i + 1}
                    </div>
                    {/* Category icon */}
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={catStyle.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {catIconPaths(category)}
                    </svg>
                    {/* Muscle group */}
                    <div style={{
                      fontSize: 9, fontWeight: 900, color: catStyle.color,
                      textAlign: "center", letterSpacing: "0.06em", lineHeight: 1.3,
                      padding: "0 5px", textTransform: "uppercase",
                    }}>
                      {getMuscleGroup(ex.name)}
                    </div>
                    {/* Done overlay */}
                    {allSetsDone && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          position: "absolute", inset: 0, borderRadius: 14,
                          background: "rgba(107,191,184,0.18)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Right: name, desc, history, sets, weight */}
                <div style={{ flex: 1, padding: "10px 14px 12px 10px", minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.3px", marginBottom: 4, lineHeight: 1.1 }}>{ex.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, marginBottom: exerciseHistory[ex.name] ? 6 : 10 }}>
                    {getExerciseDesc(ex.name)}
                  </div>

                  {/* Last session hint */}
                  {exerciseHistory[ex.name] && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10, borderRadius: 999, padding: "2px 8px", background: "rgba(107,191,184,0.08)", border: "1px solid rgba(107,191,184,0.2)", fontSize: 10, fontWeight: 800, color: ACCENT }}>
                      <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      {exerciseHistory[ex.name].weight != null && `${exerciseHistory[ex.name].weight}kg · `}Last: {exerciseHistory[ex.name].sets}×{exerciseHistory[ex.name].reps} · {daysAgoLabel(exerciseHistory[ex.name].completedAt)}
                    </div>
                  )}

                  {/* Set buttons + swap */}
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {Array.from({ length: ex.sets }, (_, setIdx) => {
                      const setDone = setIdx < done
                      const isCurrent = setIdx === done
                      return (
                        <motion.button
                          key={setIdx}
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => isCurrent ? completeSet(i) : undefined}
                          style={{
                            flex: 1,
                            border: setDone ? `1px solid ${catStyle.color}55` : isCurrent ? `1px solid ${catStyle.color}66` : "1px solid var(--border)",
                            background: setDone ? `${catStyle.color}22` : isCurrent ? `${catStyle.color}11` : "var(--surface-2)",
                            color: setDone ? catStyle.color : isCurrent ? catStyle.color : "var(--text-muted)",
                            borderRadius: 10,
                            padding: "7px 4px",
                            fontSize: 10,
                            fontWeight: 900,
                            cursor: isCurrent ? "pointer" : "default",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 3,
                            transition: "all 0.18s",
                          }}
                        >
                          {setDone
                            ? <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : <span>{setIdx + 1}</span>
                          }
                        </motion.button>
                      )
                    })}
                    {/* Swap button */}
                    {!allSetsDone && (
                      <button
                        type="button"
                        onClick={() => setSwapIdx(i)}
                        style={{ flexShrink: 0, width: 32, height: 32, border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}
                        title="Swap exercise"
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Weight input row */}
                  {(() => {
                    const currentWeight = exerciseWeights[i]
                    const histWeight = exerciseHistory[ex.name]?.weight
                    const isPRAttempt = currentWeight != null && currentWeight > 0 && (histWeight == null || currentWeight > histWeight)
                    const suggested = histWeight != null ? Math.round((histWeight + 2.5) * 10) / 10 : null
                    return (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={999}
                            step={0.5}
                            placeholder={histWeight != null ? String(histWeight) : "0"}
                            value={currentWeight ?? ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value)
                              setExerciseWeights((prev) => ({ ...prev, [i]: isNaN(v) ? null : v }))
                            }}
                            style={{
                              flex: 1,
                              background: isPRAttempt ? "rgba(107,191,184,0.08)" : "var(--surface-2)",
                              border: isPRAttempt ? "1px solid rgba(107,191,184,0.4)" : "1px solid var(--border)",
                              borderRadius: 10,
                              padding: "6px 10px",
                              color: "var(--text)",
                              fontSize: 13,
                              fontWeight: 700,
                              outline: "none",
                              fontFamily: "inherit",
                              transition: "border-color 0.2s, background 0.2s",
                            }}
                          />
                          <span style={{ fontSize: 11, fontWeight: 800, color: isPRAttempt ? ACCENT : "var(--text-muted)", flexShrink: 0, minWidth: 20 }}>kg</span>
                          {isPRAttempt && (
                            <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 900, color: ACCENT, flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                              PR
                            </motion.span>
                          )}
                        </div>
                        {suggested != null && currentWeight == null && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => setExerciseWeights((prev) => ({ ...prev, [i]: suggested }))}
                            style={{ marginTop: 5, border: "1px dashed rgba(107,191,184,0.45)", background: "rgba(107,191,184,0.06)", borderRadius: 8, padding: "4px 9px", color: ACCENT, fontSize: 10, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                            Try {suggested} kg (+2.5)
                          </motion.button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* ── Progress bar — animates as sets complete */}
              <div style={{ height: 3, background: "var(--border)", margin: "0 13px 11px" }}>
                <motion.div
                  style={{ height: "100%", borderRadius: 2, background: catStyle.color }}
                  animate={{ width: ex.sets > 0 ? `${(done / ex.sets) * 100}%` : "0%" }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* W1 Sticky bottom CTA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", paddingBottom: "max(12px, env(safe-area-inset-bottom))", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        <button
          type="button"
          onClick={allDone ? finishWorkout : undefined}
          disabled={saving}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 16,
            padding: 15,
            background: allDone ? ACCENT : "var(--surface-2)",
            color: allDone ? "#0b1715" : "var(--text-muted)",
            fontSize: 15,
            fontWeight: 950,
            cursor: allDone && !saving ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.2s, color 0.2s",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5h2v5H3z"/><path d="M19 9.5h2v5h-2z"/><path d="M5 12h14"/>
          </svg>
          {saving ? t.saving : allDone ? t.finishWorkout : `${doneSets} / ${totalSets} sets done`}
        </button>
      </div>

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

      {/* Breath-hold liveness challenge */}
      <AnimatePresence>
        {challenge && <BreathChallengeBanner challenge={challenge} />}
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 60, overflow: "hidden", background: "radial-gradient(circle at 50% 18%, rgba(107,191,184,0.22), rgba(0,0,0,0.76) 58%)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", display: "grid", placeItems: "center", padding: 22 }}>
            {CONFETTI.map(p => (
              <motion.div key={p.id} initial={{ y: -80, x: 0, rotate: 0, opacity: 0 }} animate={{ y: "110vh", x: p.drift, rotate: p.rotate, opacity: [0, 1, 1, 0] }} transition={{ duration: 2.8 + (p.id % 5) * 0.18, delay: p.delay, ease: "easeOut", repeat: Infinity, repeatDelay: 0.6 }} style={{ position: "absolute", top: 0, left: `${p.left}%`, width: p.id % 3 === 0 ? 6 : 9, height: p.id % 3 === 0 ? 18 : 9, borderRadius: p.id % 3 === 0 ? 999 : 3, background: p.color }} />
            ))}
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 18 }} style={{ width: "100%", maxWidth: 430, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(26,26,26,0.82)", color: "#fff", borderRadius: 28, padding: "28px 22px 22px", textAlign: "center", boxShadow: "0 30px 90px rgba(0,0,0,0.45)", position: "relative", maxHeight: "calc(100dvh - 44px)", overflowY: "auto" }}>
              <motion.div initial={{ scale: 0.5, rotate: -18 }} animate={{ scale: [0.5, 1.15, 1], rotate: [-18, 8, 0] }} transition={{ duration: 0.75, ease: "easeOut" }} style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px", display: "grid", placeItems: "center", background: "rgba(107,191,184,0.16)", border: "1px solid rgba(107,191,184,0.42)", color: ACCENT, fontSize: 26, fontWeight: 950 }}>FT</motion.div>
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
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} style={{ borderRadius: 14, padding: "10px 14px", background: "rgba(107,191,184,0.10)", border: "1px solid rgba(107,191,184,0.28)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 800, letterSpacing: "0.1em" }}>EST. CALORIES</div>
                <div style={{ fontSize: 18, fontWeight: 950, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>~{estimateCalories(workout?.exercises ?? [])} kcal</div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.40 }} style={{ borderRadius: 18, padding: "14px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, fontWeight: 800 }}>{t.streakLabel}</span>
                <span style={{ fontSize: 16, fontWeight: 950, color: ACCENT }}>{streakDay} {t.dayStreak}</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.50 }} style={{ borderRadius: 18, padding: 16, background: "linear-gradient(135deg, rgba(107,191,184,0.2), rgba(107,191,184,0.06))", border: "1px solid rgba(107,191,184,0.32)", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", fontWeight: 850, letterSpacing: "0.12em" }}>{t.receiveFitToken}</div>
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
                <div style={{ fontSize: 34, fontWeight: 950, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>+{Number(fitTokenReward?.amount ?? fitTokenReward?.totalAwarded ?? 1).toFixed(2)} FT</div>
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
                      <button key={o.value} type="button" onClick={() => saveSessionFeedback(o.value)} style={{ minWidth: 0, border: sel ? "1px solid rgba(107,191,184,0.7)" : "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 8px", background: sel ? "rgba(107,191,184,0.18)" : "rgba(255,255,255,0.055)", color: sel ? ACCENT : "#fff", cursor: "pointer", textAlign: "center" }}>
                        <span style={{ display: "block", fontSize: 12, fontWeight: 950, marginBottom: 3 }}>{o.label}</span>
                        <span style={{ display: "block", fontSize: 10, color: sel ? "rgba(107,191,184,0.82)" : "rgba(255,255,255,0.48)", fontWeight: 750 }}>{o.detail}</span>
                      </button>
                    )
                  })}
                </div>
                {feedbackSaved && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 9, fontSize: 11, color: "rgba(107,191,184,0.92)", fontWeight: 800, textAlign: "center" }}>Feedback saved for future recommendations.</motion.div>}
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
                  <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 6, fontSize: 11, color: "rgba(107,191,184,0.9)", fontWeight: 800 }}>
                    ✓ Note saved
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

              <button type="button" onClick={() => router.push("/workout")} style={{ width: "100%", border: "none", borderRadius: 16, padding: 15, background: ACCENT, color: "#fff", fontSize: 15, fontWeight: 950, cursor: "pointer", boxShadow: "0 12px 28px rgba(107,191,184,0.3)" }}>{t.continueLabel}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

function BreathChallengeBanner({ challenge }: { challenge: ActiveChallenge }) {
  const isHold = challenge.phase === "hold"
  return (
    <motion.div key={challenge.phase} initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ type: "spring", stiffness: 320, damping: 22 }} style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: isHold ? "rgba(249,115,115,0.96)" : "rgba(107,191,184,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: isHold ? "0 8px 32px rgba(249,115,115,0.35)" : "0 8px 32px rgba(107,191,184,0.35)" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", color: "rgba(255,255,255,0.65)", marginBottom: 3 }}>{isHold ? `HOLD ${challenge.ping}/${challenge.totalPings}` : "VERIFICATION CHECK"}</div>
          <div style={{ fontSize: 17, fontWeight: 950, color: "#fff", letterSpacing: "-0.2px" }}>{isHold ? "Hold your breath!" : challenge.ping < challenge.totalPings ? "Breathe... next hold coming" : "OK — breathe normally"}</div>
        </div>
        {isHold ? (
          <motion.div key={challenge.countdown} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ fontSize: 40, fontWeight: 950, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{challenge.countdown}</motion.div>
        ) : (
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "grid", placeItems: "center" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
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
          border: "1px solid rgba(107,191,184,0.28)",
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
            <circle cx={74} cy={74} r={REST_RING_R} fill="none" stroke="rgba(107,191,184,0.12)" strokeWidth={8} />
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
                background: total === d ? "rgba(107,191,184,0.14)" : "var(--surface-2)",
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
              border: `1px solid rgba(107,191,184,0.35)`,
              background: "rgba(107,191,184,0.1)",
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
