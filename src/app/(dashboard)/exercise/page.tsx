"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import { saveWorkoutFeedback, type SessionFeedback } from "@/lib/workoutFeedback"
import { useWorkoutVerification, type ActiveChallenge } from "@/lib/workoutVerification"

const ACCENT = "#6bbfb8"
const CONFETTI = Array.from({ length: 42 }, (_, i) => ({ id: i, left: 8 + ((i * 17) % 84), delay: (i % 9) * 0.08, drift: ((i % 7) - 3) * 18, rotate: ((i * 47) % 220) - 110, color: [ACCENT, "#f6d365", "#f97373", "#8ab4ff", "#ffffff"][i % 5] }))
const FEEDBACK_OPTIONS: Array<{ value: SessionFeedback; label: string; detail: string }> = [
  { value: "too_easy", label: "Too easy", detail: "Add challenge" },
  { value: "just_right", label: "Just right", detail: "Keep pace" },
  { value: "too_hard", label: "Too hard", detail: "Scale back" },
]

type ActiveExercise = { name: string; sets: number; reps: number }
type ActiveWorkout = { date: string; workoutName: string; exercises: ActiveExercise[] }
type FitTokenReward = { amount?: number; totalAwarded?: number }

// Category tag based on exercise name + position
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

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  WARM:     { bg: "rgba(246,211,101,0.18)", color: "#c8960a" },
  CORE:     { bg: "rgba(107,191,184,0.18)", color: ACCENT },
  LEGS:     { bg: "rgba(138,180,255,0.18)", color: "#5b8fff" },
  PULL:     { bg: "rgba(160,100,255,0.18)", color: "#a064ff" },
  PUSH:     { bg: "rgba(249,115,115,0.18)", color: "#e85555" },
  CARDIO:   { bg: "rgba(255,165,50,0.18)",  color: "#e08010" },
  SHOULDER: { bg: "rgba(107,191,184,0.14)", color: ACCENT },
}

function WaveformIcon() {
  const bars = [4, 9, 15, 11, 7, 13, 9, 5, 11, 15, 8, 5]
  return (
    <svg viewBox="0 0 50 28" width="46" height="26" aria-hidden>
      {bars.map((h, i) => (
        <rect key={i} x={i * 4 + 1} y={(28 - h) / 2} width="3" height={h} rx="1.5" fill="currentColor" />
      ))}
    </svg>
  )
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
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

  const totalSets = useMemo(() => workout?.exercises.reduce((s, e) => s + e.sets, 0) ?? 0, [workout])
  const doneSets = useMemo(() => Object.values(completedSets).reduce((s, v) => s + v, 0), [completedSets])
  const allDone = Boolean(workout && doneSets === totalSets && totalSets > 0)

  function completeSet(exIdx: number) {
    if (!workout) return
    const ex = workout.exercises[exIdx]
    setCompletedSets(prev => ({ ...prev, [exIdx]: Math.min((prev[exIdx] || 0) + 1, ex.sets) }))
  }

  function saveSessionFeedback(value: SessionFeedback) {
    if (!workout) return
    setSessionFeedback(value)
    setFeedbackSaved(true)
    saveWorkoutFeedback({ workoutLogId: savedWorkoutLogId, date: workout.date, workoutName: workout.workoutName, feedback: value, durationSeconds: elapsed, exerciseCount: workout.exercises.length, totalSets, totalReps: workout.exercises.reduce((s, e) => s + e.sets * e.reps, 0), createdAt: new Date().toISOString() })
  }

  const finishWorkout = async () => {
    if (!workout) return
    setSaving(true)
    try {
      const { score: verificationScore } = getResult(elapsed)
      const response = await fetch("/api/workout-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...workout, verificationScore, sessionToken: sessionTokenRef.current }),
      })
      if (response.ok) {
        const savedLog = await response.json()
        setSavedWorkoutLogId(savedLog.id || null)
        setFitTokenReward(savedLog.fitTokenReward || null)
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.28, ease: "easeOut" }}
              style={{ background: "var(--panel)", border: allSetsDone ? `1px solid rgba(107,191,184,0.38)` : "1px solid var(--border)", borderRadius: 20, marginBottom: 12, overflow: "hidden", boxShadow: allSetsDone ? "0 0 0 1px rgba(107,191,184,0.1)" : "var(--shadow)", transition: "border-color 0.2s" }}
            >
              <div style={{ display: "flex", gap: 0 }}>
                {/* Left column — category + waveform */}
                <div style={{ width: 72, padding: "14px 0 14px 14px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
                  <div style={{ background: catStyle.bg, color: catStyle.color, borderRadius: 6, padding: "2px 6px", fontSize: 9, fontWeight: 900, letterSpacing: "0.1em" }}>
                    {category}
                  </div>
                  <div style={{ color: "var(--text-muted)", opacity: 0.55, marginTop: 4 }}>
                    <WaveformIcon />
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginTop: 2 }}>POSE</div>
                </div>

                {/* Right content */}
                <div style={{ flex: 1, padding: "14px 14px 14px 8px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div style={{ background: allSetsDone ? "rgba(107,191,184,0.18)" : "var(--surface-2)", border: allSetsDone ? "1px solid rgba(107,191,184,0.35)" : "1px solid var(--border)", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 800, color: allSetsDone ? ACCENT : "var(--text-muted)", flexShrink: 0, transition: "all 0.2s" }}>
                      {ex.sets}×{ex.reps}
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.2px", marginBottom: 5, lineHeight: 1.1 }}>{ex.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45, marginBottom: 10 }}>
                    {getExerciseDesc(ex.name)}
                  </div>

                  {/* W1 Set buttons */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {Array.from({ length: ex.sets }, (_, setIdx) => {
                      const setDone = setIdx < done
                      const isCurrent = setIdx === done
                      return (
                        <motion.button
                          key={setIdx}
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => isCurrent ? completeSet(i) : undefined}
                          style={{
                            flex: 1,
                            border: setDone ? `1px solid rgba(107,191,184,0.5)` : isCurrent ? "1px solid rgba(107,191,184,0.35)" : "1px solid var(--border)",
                            background: setDone ? "rgba(107,191,184,0.2)" : isCurrent ? "rgba(107,191,184,0.08)" : "var(--surface-2)",
                            color: setDone ? ACCENT : isCurrent ? ACCENT : "var(--text-muted)",
                            borderRadius: 10,
                            padding: "7px 4px",
                            fontSize: 11,
                            fontWeight: 900,
                            cursor: isCurrent ? "pointer" : "default",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 3,
                            transition: "all 0.18s",
                          }}
                        >
                          {setDone && (
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                          SET {setIdx + 1}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
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
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[{ label: "Time", value: formatTime(elapsed) }, { label: "Exercises", value: String(workout?.exercises.length ?? 0) }, { label: "Sets", value: String(doneSets) }, { label: "Reps", value: String(workout?.exercises.reduce((s, e) => s + e.sets * e.reps, 0) ?? 0) }].map(item => (
                  <div key={item.label} style={{ borderRadius: 16, padding: "12px 10px", background: "rgba(255,255,255,0.065)", border: "1px solid rgba(255,255,255,0.10)", textAlign: "left" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.48)", fontWeight: 850, letterSpacing: "0.12em", marginBottom: 5 }}>{item.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 950, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{item.value}</div>
                  </div>
                ))}
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.32 }} style={{ borderRadius: 18, padding: "14px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, fontWeight: 800 }}>{t.streakLabel}</span>
                <span style={{ fontSize: 16, fontWeight: 950, color: ACCENT }}>{streakDay} {t.dayStreak}</span>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.42 }} style={{ borderRadius: 18, padding: 16, background: "linear-gradient(135deg, rgba(107,191,184,0.2), rgba(107,191,184,0.06))", border: "1px solid rgba(107,191,184,0.32)", marginBottom: 18 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", fontWeight: 850, letterSpacing: "0.12em", marginBottom: 7 }}>{t.receiveFitToken}</div>
                <div style={{ fontSize: 34, fontWeight: 950, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>+{Number(fitTokenReward?.amount ?? fitTokenReward?.totalAwarded ?? 1).toFixed(2)} FT</div>
              </motion.div>
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
