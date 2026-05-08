"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useStore } from "@/store/useStore"
import { useLanguage } from "@/contexts/LanguageContext"

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

const scaleIn = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.25, ease: "easeOut" as const } },
}

const MUSCLE_GROUPS = ["Rest", "Chest & Triceps", "Back & Biceps", "Legs", "Shoulders & Core", "Full Body", "Arms & Core"]
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const DEFAULT_EXERCISES: Record<number, Array<[string, string]>> = {
  0: [],
  1: [["Push-ups","3×15"],["Diamond Push-ups","3×10"],["Tricep Dips","3×12"],["Chest Fly","3×12"],["Close-grip Push-ups","3×10"]],
  2: [["Pull-ups","3×10"],["Bicep Curls","3×12"],["Hammer Curls","3×10"],["Superman Hold","3×30s"],["Reverse Fly","3×12"]],
  3: [["Squats","4×15"],["Lunges","3×12 each"],["Glute Bridges","3×15"],["Wall Sit","3×45s"],["Calf Raises","3×20"]],
  4: [["Pike Push-ups","3×12"],["Lateral Raises","3×15"],["Plank","3×45s"],["Russian Twist","3×20"],["Mountain Climbers","3×30s"]],
  5: [["Burpees","4×10"],["Jump Squats","4×15"],["High Knees","4×30s"],["Box Jumps","3×12"],["Sprint","4×20s"]],
  6: [["Curl to Press","3×12"],["Tricep Extension","3×12"],["Plank Reaches","3×10 each"],["Leg Raises","3×15"],["Bicycle Crunches","3×20"]],
}

export default function WorkoutPage() {
  const { status } = useSession()
  const router = useRouter()
  const { selectedDay, setSelectedDay } = useStore()
  const [reminderSet, setReminderSet] = useState(false)
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [todayIdx, setTodayIdx] = useState(-1)
  const [isDark, setIsDark] = useState(true)
  const [savedWorkout, setSavedWorkout] = useState<any>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { t, language } = useLanguage()

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark"
    setIsDark(saved === "dark")
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
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
    const selectedDate = weekDates[selectedDay]
    if (!selectedDate) return
    const dateStr = selectedDate.toISOString().split("T")[0]
    fetch(`/api/workout-schedule?date=${dateStr}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (data.length > 0) setSavedWorkout(data[0])
        else setSavedWorkout(null)
      })
      .catch(() => setSavedWorkout(null))
  }, [status, selectedDay, weekDates])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    const val = next ? "dark" : "light"
    document.documentElement.setAttribute("data-theme", val)
    localStorage.setItem("theme", val)
  }

  if (selectedDay === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", flexDirection: "column" }}>
        <div style={{
          background: "#242424",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #333333",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "white" }}>
            <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {t.workout}
            </motion.span>
          </div>
          <button onClick={toggleTheme} style={{
            background: "#2f2f2f", border: "1px solid #333333",
            borderRadius: "50%", width: "32px", height: "32px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white",
          }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              {isDark ? (
                <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
              ) : (
                <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
              )}
            </svg>
          </button>
        </div>
        <div style={{ padding: "20px", flex: 1 }}>
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
              <div style={{
                background: "#242424",
                border: "1px solid #333333",
                borderRadius: "16px",
                padding: "32px 24px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "white", marginBottom: "8px" }}>Rest Day</div>
                <p style={{ fontSize: "13px", color: "#888888", lineHeight: 1.5, marginBottom: "20px" }}>
                  Rest is when your body rebuilds. Light walk recommended.
                </p>
                <button
                  onClick={() => router.push("/ai")}
                  style={{
                    width: "100%",
                    background: "#2f2f2f",
                    border: "1px solid #333333",
                    borderRadius: "12px",
                    padding: "12px",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Show stretch routine
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  const muscle = MUSCLE_GROUPS[selectedDay]
  const todayExercises = DEFAULT_EXERCISES[selectedDay] || []

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", flexDirection: "column" }}>
      <div style={{
        background: "#242424",
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #333333",
      }}>
        <div style={{ fontSize: "13px", fontWeight: 800, color: "white" }}>Workout</div>
        <button onClick={toggleTheme} style={{
          background: "#2f2f2f", border: "1px solid #333333",
          borderRadius: "50%", width: "32px", height: "32px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "white",
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            {isDark ? (
              <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>
            ) : (
              <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
            )}
          </svg>
        </button>
      </div>

      <div style={{ padding: "20px", flex: 1, overflowY: "auto", paddingBottom: "32px" }}>
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "20px", scrollbarWidth: "none" }}>
              {weekDates.map((date, i) => {
                const isToday = i === todayIdx
                return (
                  <motion.button
                    key={i}
                    onClick={() => setSelectedDay(i)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    style={{
                      background: i === selectedDay ? "white" : "#242424",
                      border: i === selectedDay ? "1px solid white" : "1px solid #333333",
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
                      color: "#888888",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      marginBottom: "4px",
                    }}>
                      {DAY_NAMES[i]}
                    </div>
                    <div style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: i === selectedDay ? "#1a1a1a" : "white",
                    }}>
                      {date.getDate()}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#888888", marginBottom: "12px" }}>
              <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {t.todaysPlan}
              </motion.span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#2f2f2f", border: "1px solid #333333", borderRadius: "20px", padding: "6px 12px", fontSize: "11px", color: "#888888", marginBottom: "12px" }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5h2v5H3z"/><path d="M19 9.5h2v5h-2z"/><path d="M5 12h14"/>
              </svg>
              {muscle}
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ background: "#242424", border: "1px solid #333333", borderRadius: "20px", overflow: "hidden", marginBottom: "16px" }}>
              {todayExercises.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px",
                    borderBottom: i < todayExercises.length - 1 ? "1px solid #2a2a2a" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <motion.div variants={scaleIn} style={{
                    background: "#2f2f2f",
                    borderRadius: "8px",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#888888",
                    flexShrink: 0,
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </motion.div>
                  <div style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "white" }}>{ex[0]}</div>
                  <div style={{
                    background: "#2f2f2f",
                    borderRadius: "20px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    color: "#888888",
                    flexShrink: 0,
                  }}>
                    {ex[1]}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <button onClick={async () => {
              const selectedDate = weekDates[selectedDay]
              if (!selectedDate) return
              const dateStr = selectedDate.toISOString().split("T")[0]
              const exercises = todayExercises.map(([name, reps]) => {
                const parts = reps.split("×")
                return { name, sets: parseInt(parts[0]) || 3, reps: parseInt(parts[1]) || 12 }
              })
              const res = await fetch("/api/workout-schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: dateStr, workoutName: muscle, exercises, source: "manual" }),
              })
              if (res.ok) {
                setSaveSuccess(true)
                setTimeout(() => setSaveSuccess(false), 2000)
              }
            }} style={{
              width: "100%",
              marginTop: "12px",
              background: "white",
              color: "#1a1a1a",
              border: "none",
              borderRadius: "12px",
              padding: "13px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: "12px",
            }}>
              {saveSuccess ? "Saved to schedule! \u2713" : "Save to Schedule"}
            </button>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              <button onClick={() => router.push("/ai")} style={{
                flex: 1,
                background: "#2f2f2f",
                border: "1px solid #333333",
                borderRadius: "12px",
                padding: "12px",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}>
                <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  {t.askForTips}
                </motion.span>
              </button>
              <button onClick={() => router.push("/ai")} style={{
                flex: 1,
                background: "#2f2f2f",
                border: "1px solid #333333",
                borderRadius: "12px",
                padding: "12px",
                color: "white",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}>
                <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  {t.alternative}
                </motion.span>
              </button>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#888888", marginBottom: "12px" }}>
              REMINDER
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{
              background: "#242424",
              border: "1px solid #333333",
              borderLeft: "3px solid white",
              borderRadius: "16px",
              padding: "16px 20px",
            }}>
              <div style={{ fontSize: "11px", color: "#888888", marginBottom: "4px" }}>FitSched</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>Workout in 15 minutes</div>
              <div style={{ fontSize: "12px", color: "#888888", marginTop: "2px" }}>{muscle} — your slot opens soon.</div>
              {reminderSet ? (
                <div style={{
                  marginTop: "12px",
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#888888",
                  padding: "12px",
                  background: "#2f2f2f",
                  borderRadius: "12px",
                }}>
                  Reminder set
                </div>
              ) : (
                <button onClick={() => setReminderSet(true)} style={{
                  width: "100%",
                  marginTop: "12px",
                  background: "white",
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}>
                  Set reminder
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
