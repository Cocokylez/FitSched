"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, X } from "lucide-react"
import { getMuscleGroup } from "@/lib/exerciseData"

// ── Types ─────────────────────────────────────────────────────────────────────

type WorkoutLog = {
  id: string
  workoutName: string
  completedAt: string
  exercises: Array<{ name: string; sets: number; reps: number }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

function lastWeekBounds(): { start: Date; end: Date } {
  const now = new Date()
  const dow = now.getDay() // 0=Sun
  // Monday of current week
  const curMon = new Date(now)
  curMon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  curMon.setHours(0, 0, 0, 0)
  // Previous Monday (start of last week)
  const prevMon = new Date(curMon)
  prevMon.setDate(curMon.getDate() - 7)
  // Previous Sunday (end of last week)
  const prevSun = new Date(curMon)
  prevSun.setDate(curMon.getDate() - 1)
  prevSun.setHours(23, 59, 59, 999)
  return { start: prevMon, end: prevSun }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WeeklyRecapModal() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [goal, setGoal] = useState(3)

  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const week = isoWeekNumber(now)
    const storageKey = `fitsched-weekly-recap:${year}-W${week}`
    if (window.sessionStorage.getItem(storageKey)) return

    Promise.all([
      fetch("/api/workout-log").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/onboarding").then((r) => (r.ok ? r.json() : {})),
    ])
      .then(([allLogs, profile]: [WorkoutLog[], any]) => {
        if (profile?.workoutsPerWeek) setGoal(Number(profile.workoutsPerWeek) || 3)
        const { start, end } = lastWeekBounds()
        const weekLogs = (allLogs as WorkoutLog[]).filter((log) => {
          const d = new Date(log.completedAt)
          return d >= start && d <= end
        })
        if (weekLogs.length > 0) {
          setLogs(weekLogs)
          setOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const totalSets = logs.reduce(
      (sum, log) => sum + log.exercises.reduce((s, ex) => s + ex.sets, 0),
      0
    )
    const totalExercises = logs.reduce((sum, log) => sum + log.exercises.length, 0)
    const consistency = Math.min(100, Math.round((logs.length / Math.max(goal, 1)) * 100))

    // Top muscle group
    const counts: Record<string, number> = {}
    logs.forEach((log) =>
      log.exercises.forEach((ex) => {
        const g = getMuscleGroup(ex.name)
        counts[g] = (counts[g] || 0) + 1
      })
    )
    const topMuscle =
      Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

    // Verdict message
    const message =
      consistency >= 100
        ? "Goal crushed. Full week, full effort."
        : consistency >= 66
        ? "Solid week. Keep the momentum going."
        : consistency >= 33
        ? "Getting there. Push a bit harder this week."
        : "Every rep counts. More this week."

    const { start } = lastWeekBounds()
    const weekLabel = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

    return { totalSets, totalExercises, consistency, topMuscle, message, weekLabel }
  }, [logs, goal])

  const dismiss = () => {
    const now = new Date()
    const year = now.getFullYear()
    const week = isoWeekNumber(now)
    window.sessionStorage.setItem(`fitsched-weekly-recap:${year}-W${week}`, "1")
    setOpen(false)
  }

  const chips = [
    { label: "Sets", value: String(stats.totalSets) },
    { label: "Exercises", value: String(stats.totalExercises) },
    { label: "Consistency", value: `${stats.consistency}%` },
    ...(stats.topMuscle ? [{ label: "Top muscle", value: stats.topMuscle }] : []),
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9992,
            background: "rgba(0,0,0,0.64)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 155, damping: 20, delay: 0.06 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(92vw, 370px)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 26,
              padding: "28px 22px 22px",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            {/* Accent glow blob */}
            <div
              style={{
                position: "absolute",
                top: -80,
                left: "50%",
                transform: "translateX(-50%)",
                width: 280,
                height: 200,
                background:
                  "radial-gradient(ellipse, rgba(18,101,254,0.22) 0%, transparent 68%)",
                pointerEvents: "none",
              }}
            />

            {/* Close button */}
            <button
              onClick={dismiss}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>

            {/* Label */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: 4,
                }}
              >
                Week of {stats.weekLabel}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 22,
                }}
              >
                Your weekly recap
              </div>
            </motion.div>

            {/* Big workout count */}
            <motion.div
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.24,
                type: "spring",
                stiffness: 180,
                damping: 16,
              }}
              style={{ marginBottom: 18 }}
            >
              <span
                style={{
                  fontSize: 80,
                  fontWeight: 900,
                  color: "var(--text)",
                  lineHeight: 1,
                  letterSpacing: "-0.045em",
                }}
              >
                {logs.length}
              </span>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                workout{logs.length !== 1 ? "s" : ""} last week
                <span style={{ opacity: 0.55 }}> / {goal} goal</span>
              </div>
            </motion.div>

            {/* Stat chips */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 }}
              style={{
                display: "flex",
                gap: 7,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              {chips.map((chip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.36 + i * 0.07 }}
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "7px 11px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--text)",
                      lineHeight: 1.1,
                    }}
                  >
                    {chip.value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {chip.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Consistency bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.44 }}
              style={{ marginBottom: 18 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  marginBottom: 5,
                }}
              >
                <span>Goal progress</span>
                <span>{stats.consistency}%</span>
              </div>
              <div
                style={{
                  height: 5,
                  background: "var(--border)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.consistency}%` }}
                  transition={{ delay: 0.56, duration: 1.0, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    background:
                      stats.consistency >= 100
                        ? "var(--accent)"
                        : stats.consistency >= 50
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    opacity: stats.consistency >= 50 ? 1 : 0.6,
                  }}
                />
              </div>
            </motion.div>

            {/* Verdict */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1.45,
                marginBottom: 22,
              }}
            >
              {stats.message}
            </motion.div>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.6,
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              whileTap={{ scale: 0.97 }}
              onClick={dismiss}
              style={{
                width: "100%",
                background: "var(--accent)",
                color: "#0d1a19",
                border: "none",
                borderRadius: 14,
                padding: "13px 20px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>Let&apos;s go this week</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
