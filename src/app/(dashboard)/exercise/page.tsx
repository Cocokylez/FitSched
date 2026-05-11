"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"
import { ExerciseDemoPanel, ExerciseDemoVisual } from "@/components/ExerciseDemoPanel"

type ActiveExercise = {
  name: string
  sets: number
  reps: number
}

type ActiveWorkout = {
  date: string
  workoutName: string
  exercises: ActiveExercise[]
}

type FitTokenReward = {
  amount?: number
  totalAwarded?: number
}

const CONFETTI = Array.from({ length: 42 }, (_, index) => ({
  id: index,
  left: 8 + ((index * 17) % 84),
  delay: (index % 9) * 0.08,
  drift: ((index % 7) - 3) * 18,
  rotate: ((index * 47) % 220) - 110,
  color: ["#6bbfb8", "#f6d365", "#f97373", "#8ab4ff", "#ffffff"][index % 5],
}))

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export default function ExerciseSessionPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({})
  const [resting, setResting] = useState(false)
  const [restLeft, setRestLeft] = useState(30)
  const [saving, setSaving] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [fitTokenReward, setFitTokenReward] = useState<FitTokenReward | null>(null)
  const [checkingLock, setCheckingLock] = useState(true)
  const [locked, setLocked] = useState(false)
  const [lockReason, setLockReason] = useState<"completed" | "date">("completed")
  const [streakDay, setStreakDay] = useState(1)

  useEffect(() => {
    let active = true

    const loadWorkout = async () => {
      setCheckingLock(true)
      let parsed: ActiveWorkout | null = null

      try {
        const raw = sessionStorage.getItem("fitsched-active-workout")
        if (raw) parsed = JSON.parse(raw) as ActiveWorkout
      } catch {}

      if (!active) return
      setWorkout(parsed)

      if (!parsed?.date) {
        setCheckingLock(false)
        return
      }

      try {
        const response = await fetch(`/api/workout-log?date=${encodeURIComponent(parsed.date)}`)
        if (response.ok) {
          const logs = await response.json()
          if (active && Array.isArray(logs) && logs.length > 0) {
            setLockReason("completed")
            setLocked(true)
            sessionStorage.removeItem("fitsched-active-workout")
          }
        }
      } catch {}

      if (active) setCheckingLock(false)
    }

    loadWorkout()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (!resting || !running) return

    if (restLeft <= 0) {
      setResting(false)
      advanceAfterRest()
      return
    }

    const timer = window.setInterval(() => {
      setRestLeft((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resting, restLeft, running])

  const current = workout?.exercises[currentIndex]
  const currentCompletedSets = completedSets[currentIndex] || 0
  const currentSetNumber = current ? Math.min(currentCompletedSets + 1, current.sets) : 1

  const completedExerciseCount = useMemo(() => {
    if (!workout) return 0
    return workout.exercises.filter((exercise, index) => (completedSets[index] || 0) >= exercise.sets).length
  }, [completedSets, workout])

  const allDone = Boolean(workout?.exercises.length && completedExerciseCount === workout.exercises.length)

  function advanceAfterRest() {
    if (!workout) return

    const nextUnfinished = workout.exercises.findIndex((exercise, index) =>
      index > currentIndex && (completedSets[index] || 0) < exercise.sets
    )
    if (nextUnfinished !== -1) {
      setCurrentIndex(nextUnfinished)
      return
    }

    const firstUnfinished = workout.exercises.findIndex((exercise, index) =>
      (completedSets[index] || 0) < exercise.sets
    )
    if (firstUnfinished !== -1) setCurrentIndex(firstUnfinished)
  }

  function completeCurrentSet() {
    if (!workout || !current || resting) return

    const nextCompleted = Math.min(current.sets, currentCompletedSets + 1)
    const nextState = { ...completedSets, [currentIndex]: nextCompleted }
    setCompletedSets(nextState)

    const exerciseDone = nextCompleted >= current.sets
    const workoutDone = workout.exercises.every((exercise, index) =>
      (nextState[index] || 0) >= exercise.sets
    )

    if (!workoutDone) {
      setRestLeft(exerciseDone ? 45 : 30)
      setResting(true)
    }
  }

  function skipRest() {
    setResting(false)
    advanceAfterRest()
  }

  const finishWorkout = async () => {
    if (!workout) return

    setSaving(true)
    try {
      const response = await fetch("/api/workout-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workout),
      })

      if (response.ok) {
        const savedLog = await response.json()
        setFitTokenReward(savedLog.fitTokenReward || null)
        window.dispatchEvent(new Event("fitsched:tokens-updated"))
        window.dispatchEvent(new Event("fitsched:workout-completed"))
        sessionStorage.removeItem("fitsched-active-workout")
        try {
          const streakResponse = await fetch("/api/streak")
          if (streakResponse.ok) {
            const streakData = await streakResponse.json()
            setStreakDay(Number(streakData.streak) || 1)
          }
        } catch {}
        setCelebrating(true)
        return
      }

      if (response.status === 409) {
        setLockReason("completed")
        setLocked(true)
        sessionStorage.removeItem("fitsched-active-workout")
        window.dispatchEvent(new Event("fitsched:workout-completed"))
      }

      if (response.status === 403) {
        setLockReason("date")
        setLocked(true)
        sessionStorage.removeItem("fitsched-active-workout")
        window.dispatchEvent(new Event("fitsched:workout-completed"))
      }
    } finally {
      setSaving(false)
    }
  }

  if (checkingLock) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 16px", display: "grid", placeItems: "center" }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.12em" }}>{t.checkingWorkout}</div>
      </div>
    )
  }

  if (locked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 16px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ background: "var(--surface)", border: "1px solid rgba(107,191,184,0.32)", borderRadius: 20, padding: 24, textAlign: "center" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(107,191,184,0.14)", color: "#6bbfb8", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 18, fontWeight: 950 }}>OK</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
              {lockReason === "date" ? t.todayWorkoutOnlyTitle : t.workoutAlreadyComplete}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.5 }}>
              {lockReason === "date" ? t.todayWorkoutOnlyBody : t.workoutAlreadyCompleteBody}
            </div>
            <button
              onClick={() => router.push("/workout")}
              style={{ border: "none", borderRadius: 14, padding: "13px 18px", background: "#6bbfb8", color: "#fff", fontWeight: 900, cursor: "pointer" }}
            >
              {t.backToWorkout}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 16px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{t.noWorkoutLoaded}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>{t.noWorkoutLoadedBody}</div>
            <button
              onClick={() => router.push("/workout")}
              style={{ border: "none", borderRadius: 14, padding: "13px 18px", background: "var(--text)", color: "var(--bg)", fontWeight: 800, cursor: "pointer" }}
            >
              {t.backToWorkout}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "18px 16px 112px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => router.push("/workout")}
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", borderRadius: 999, padding: "9px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            {t.back}
          </button>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.12em" }}>
            {completedExerciseCount}/{workout.exercises.length} {t.exercisesDone}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            border: "1px solid rgba(107, 191, 184, 0.25)",
            background: "linear-gradient(180deg, rgba(107,191,184,0.16), var(--surface))",
            borderRadius: 24,
            padding: "22px 18px",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
            {resting ? t.restTime : t.nowTraining}
          </div>
          <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-0.5px", marginBottom: 18 }}>{workout.workoutName}</div>
          {current && (
            <ExerciseDemoVisual
              exerciseName={current.name}
              height={210}
              timerText={resting ? formatTime(restLeft) : formatTime(elapsed)}
              paused={!running}
              onToggleTimer={() => setRunning((value) => !value)}
            />
          )}
        </motion.div>

        {current && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 18, marginBottom: 14 }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.13em", marginBottom: 8 }}>
              {t.exerciseLabel} {currentIndex + 1} · {t.setLabel} {currentSetNumber} {t.ofLabel} {current.sets}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{current.name}</div>
            <div style={{ display: "inline-flex", borderRadius: 999, background: "var(--surface-2)", color: "var(--text-muted)", padding: "5px 11px", fontSize: 12, fontWeight: 750, marginBottom: 16 }}>
              {current.reps} {t.repsThisSet} · {currentCompletedSets}/{current.sets} {t.setsDone}
            </div>
            <ExerciseDemoPanel exerciseName={current.name} showVisual={false} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                disabled={!resting}
                onClick={skipRest}
                style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", borderRadius: 13, padding: 12, fontWeight: 800, opacity: resting ? 1 : 0.45, cursor: resting ? "pointer" : "default" }}
              >
                {t.skipRest}
              </button>
              <button
                disabled={resting || currentCompletedSets >= current.sets}
                onClick={completeCurrentSet}
                style={{ border: "none", background: "#6bbfb8", color: "#fff", borderRadius: 13, padding: 12, fontWeight: 900, opacity: resting || currentCompletedSets >= current.sets ? 0.55 : 1, cursor: resting || currentCompletedSets >= current.sets ? "default" : "pointer" }}
              >
                {t.doneSet}
              </button>
            </div>
          </motion.div>
        )}

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden" }}>
          {workout.exercises.map((exercise, index) => {
            const setsDone = completedSets[index] || 0
            const exerciseDone = setsDone >= exercise.sets
            return (
              <button
                key={`${exercise.name}-${index}`}
                type="button"
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: "100%",
                  border: "none",
                  borderBottom: index < workout.exercises.length - 1 ? "1px solid var(--border)" : "none",
                  background: "transparent",
                  color: "var(--text)",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", background: exerciseDone ? "#6bbfb8" : "var(--surface-2)", color: exerciseDone ? "#fff" : "var(--text-muted)", fontSize: 12, fontWeight: 900 }}>
                  {exerciseDone ? "✓" : index + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{exercise.name}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{setsDone}/{exercise.sets} {t.sets.toLowerCase()} · {exercise.reps} {t.reps.toLowerCase()}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              overflow: "hidden",
              background: "radial-gradient(circle at 50% 18%, rgba(107,191,184,0.22), rgba(0,0,0,0.76) 58%)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              display: "grid",
              placeItems: "center",
              padding: "22px",
            }}
          >
            {CONFETTI.map((piece) => (
              <motion.div
                key={piece.id}
                initial={{ y: -80, x: 0, rotate: 0, opacity: 0 }}
                animate={{ y: "110vh", x: piece.drift, rotate: piece.rotate, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.8 + (piece.id % 5) * 0.18, delay: piece.delay, ease: "easeOut", repeat: Infinity, repeatDelay: 0.6 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${piece.left}%`,
                  width: piece.id % 3 === 0 ? 6 : 9,
                  height: piece.id % 3 === 0 ? 18 : 9,
                  borderRadius: piece.id % 3 === 0 ? 999 : 3,
                  background: piece.color,
                  boxShadow: "0 0 12px rgba(255,255,255,0.16)",
                }}
              />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              style={{
                width: "100%",
                maxWidth: 430,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(26, 26, 26, 0.82)",
                color: "#fff",
                borderRadius: 28,
                padding: "28px 22px 22px",
                textAlign: "center",
                boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
                position: "relative",
              }}
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -18 }}
                animate={{ scale: [0.5, 1.15, 1], rotate: [-18, 8, 0] }}
                transition={{ duration: 0.75, ease: "easeOut" }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(107,191,184,0.16)",
                  border: "1px solid rgba(107,191,184,0.42)",
                  color: "#6bbfb8",
                  fontSize: 26,
                  fontWeight: 950,
                }}
              >
                FT
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ fontSize: 30, fontWeight: 950, letterSpacing: "-0.5px", marginBottom: 6 }}>
                {t.workoutCompleteTitle}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} style={{ color: "rgba(255,255,255,0.64)", fontSize: 14, lineHeight: 1.45, marginBottom: 18 }}>
                {t.workoutCompleteBody}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.32 }}
                style={{
                  borderRadius: 18,
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.68)", fontSize: 13, fontWeight: 800 }}>{t.streakLabel}</span>
                <span style={{ fontSize: 16, fontWeight: 950, color: "#6bbfb8" }}>{streakDay} {t.dayStreak}</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.42 }}
                style={{
                  borderRadius: 18,
                  padding: "16px",
                  background: "linear-gradient(135deg, rgba(107,191,184,0.2), rgba(107,191,184,0.06))",
                  border: "1px solid rgba(107,191,184,0.32)",
                  marginBottom: 18,
                }}
              >
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", fontWeight: 850, letterSpacing: "0.12em", marginBottom: 7 }}>
                  {t.receiveFitToken}
                </div>
                <div style={{ fontSize: 34, fontWeight: 950, color: "#6bbfb8", fontVariantNumeric: "tabular-nums" }}>
                  +{Number(fitTokenReward?.amount ?? fitTokenReward?.totalAwarded ?? 1).toFixed(2)} FT
                </div>
              </motion.div>

              <button
                type="button"
                onClick={() => router.push("/workout")}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 16,
                  padding: 15,
                  background: "#6bbfb8",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 950,
                  cursor: "pointer",
                  boxShadow: "0 12px 28px rgba(107,191,184,0.3)",
                }}
              >
                {t.continueLabel}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, padding: "12px 16px 22px", background: "linear-gradient(180deg, transparent, var(--bg) 28%)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <button
            type="button"
            onClick={allDone ? finishWorkout : completeCurrentSet}
            disabled={saving || resting}
            style={{ width: "100%", border: "none", borderRadius: 16, padding: 15, background: "#6bbfb8", color: "#fff", fontSize: 15, fontWeight: 950, cursor: !saving && !resting ? "pointer" : "default", opacity: !saving && !resting ? 1 : 0.5, boxShadow: "0 10px 28px rgba(107,191,184,0.28)" }}
          >
            {saving ? t.saving : allDone ? t.finishWorkout : resting ? t.resting : t.doneSet}
          </button>
        </div>
      </div>
    </div>
  )
}
