"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

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

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export default function ExerciseSessionPage() {
  const router = useRouter()
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({})
  const [resting, setResting] = useState(false)
  const [restLeft, setRestLeft] = useState(30)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("fitsched-active-workout")
      if (raw) setWorkout(JSON.parse(raw) as ActiveWorkout)
    } catch {}
  }, [])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  useEffect(() => {
    if (!resting) return

    if (restLeft <= 0) {
      setResting(false)
      advanceAfterRest()
      return
    }

    const timer = window.setInterval(() => {
      setRestLeft((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resting, restLeft])

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
        window.dispatchEvent(new Event("fitsched:tokens-updated"))
        sessionStorage.removeItem("fitsched-active-workout")
        router.push("/workout")
      }
    } finally {
      setSaving(false)
    }
  }

  if (!workout) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "24px 16px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>No workout loaded</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>Start from the Workout tab to begin an exercise session.</div>
            <button
              onClick={() => router.push("/workout")}
              style={{ border: "none", borderRadius: 14, padding: "13px 18px", background: "var(--text)", color: "var(--bg)", fontWeight: 800, cursor: "pointer" }}
            >
              Back to Workout
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
            Back
          </button>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.12em" }}>
            {completedExerciseCount}/{workout.exercises.length} EXERCISES DONE
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
            {resting ? "Rest time" : "Now training"}
          </div>
          <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-0.5px", marginBottom: 18 }}>{workout.workoutName}</div>
          <div style={{ display: "grid", placeItems: "center", marginBottom: 18 }}>
            <div style={{ width: 148, height: 148, borderRadius: "50%", border: "1px solid rgba(107,191,184,0.35)", display: "grid", placeItems: "center", boxShadow: "inset 0 0 34px rgba(107,191,184,0.12)" }}>
              <div style={{ fontSize: 34, fontWeight: 950, color: "#6bbfb8", fontVariantNumeric: "tabular-nums" }}>
                {resting ? formatTime(restLeft) : formatTime(elapsed)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRunning((value) => !value)}
            disabled={resting}
            style={{ width: "100%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", borderRadius: 14, padding: 13, fontSize: 14, fontWeight: 850, cursor: resting ? "default" : "pointer", opacity: resting ? 0.55 : 1 }}
          >
            {resting ? "Resting..." : running ? "Pause Timer" : "Resume Timer"}
          </button>
        </motion.div>

        {current && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 18, marginBottom: 14 }}
          >
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.13em", marginBottom: 8 }}>
              EXERCISE {currentIndex + 1} · SET {currentSetNumber} OF {current.sets}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>{current.name}</div>
            <div style={{ display: "inline-flex", borderRadius: 999, background: "var(--surface-2)", color: "var(--text-muted)", padding: "5px 11px", fontSize: 12, fontWeight: 750, marginBottom: 16 }}>
              {current.reps} reps this set · {currentCompletedSets}/{current.sets} sets done
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                disabled={!resting}
                onClick={skipRest}
                style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", borderRadius: 13, padding: 12, fontWeight: 800, opacity: resting ? 1 : 0.45, cursor: resting ? "pointer" : "default" }}
              >
                Skip Rest
              </button>
              <button
                disabled={resting || currentCompletedSets >= current.sets}
                onClick={completeCurrentSet}
                style={{ border: "none", background: "#6bbfb8", color: "#fff", borderRadius: 13, padding: 12, fontWeight: 900, opacity: resting || currentCompletedSets >= current.sets ? 0.55 : 1, cursor: resting || currentCompletedSets >= current.sets ? "default" : "pointer" }}
              >
                Done Set
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
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{setsDone}/{exercise.sets} sets · {exercise.reps} reps</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, padding: "12px 16px 22px", background: "linear-gradient(180deg, transparent, var(--bg) 28%)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <button
            type="button"
            onClick={allDone ? finishWorkout : completeCurrentSet}
            disabled={saving || resting}
            style={{ width: "100%", border: "none", borderRadius: 16, padding: 15, background: "#6bbfb8", color: "#fff", fontSize: 15, fontWeight: 950, cursor: !saving && !resting ? "pointer" : "default", opacity: !saving && !resting ? 1 : 0.5, boxShadow: "0 10px 28px rgba(107,191,184,0.28)" }}
          >
            {saving ? "Saving..." : allDone ? "Finish Workout" : resting ? "Resting..." : "Done Set"}
          </button>
        </div>
      </div>
    </div>
  )
}
