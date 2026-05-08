"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/store/useStore"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"
import { SkeletonExerciseRow } from "@/components/Skeleton"

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
  const [savedWorkout, setSavedWorkout] = useState<any>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [logging, setLogging] = useState(false)
  const [loggedExercises, setLoggedExercises] = useState<Array<{name: string; sets: number; reps: number}>>([])
  const [loading, setLoading] = useState(true)
  const { t, language } = useLanguage()
  const { theme, toggleTheme } = useTheme()

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
    setLoading(true)
    const selectedDate = weekDates[selectedDay]
    if (!selectedDate) return
    const dateStr = selectedDate.toISOString().split("T")[0]
    fetch(`/api/workout-schedule?date=${dateStr}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (data.length > 0) setSavedWorkout(data[0])
        else setSavedWorkout(null)
        setLoading(false)
      })
      .catch(() => { setSavedWorkout(null); setLoading(false) })
  }, [status, selectedDay, weekDates])

  useEffect(() => {
    setCompleted(false)
  }, [selectedDay])

  if (selectedDay === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{
          background: "var(--surface)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>
            <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {t.workout}
            </motion.span>
          </div>
          <button onClick={toggleTheme} style={{
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: "50%", width: "32px", height: "32px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text)",
          }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              {theme === "dark" ? (
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
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "32px 24px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>{t.restDay}</div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "20px" }}>
                  {t.restBody}
                </p>
                <button
                  onClick={() => router.push("/ai")}
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "12px",
                    color: "var(--text)",
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

  const currentExercises = todayExercises.map(([name, reps]) => {
    const parts = reps.split("×")
    return { name, sets: parseInt(parts[0]) || 3, reps: parseInt(parts[1]) || 12 }
  })

  const updateLog = (index: number, field: string, value: string) => {
    setLoggedExercises(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: parseInt(value) }
      return updated
    })
  }

  const modalStyle = {
    background: theme === 'dark'
      ? 'rgba(28, 28, 28, 0.75)'
      : 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: theme === 'dark'
      ? '1px solid rgba(255,255,255,0.08)'
      : '1px solid rgba(0,0,0,0.08)',
    borderRadius: '24px 24px 0 0',
    padding: '24px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{
        background: "var(--surface)",
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>{t.workout}</div>
        <button onClick={toggleTheme} style={{
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderRadius: "50%", width: "32px", height: "32px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--text)",
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            {theme === "dark" ? (
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
                      {DAY_NAMES[i]}
                    </div>
                    <div style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: i === selectedDay ? "var(--bg)" : "var(--text)",
                    }}>
                      {date.getDate()}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "12px" }}>
              <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {t.todaysPlan}
              </motion.span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "20px", padding: "6px 12px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5h2v5H3z"/><path d="M19 9.5h2v5h-2z"/><path d="M5 12h14"/>
              </svg>
              {muscle}
            </div>
          </motion.div>

          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", overflow: "hidden", marginBottom: "16px" }}>
                {[1,2,3,4,5].map(i => (
                  <SkeletonExerciseRow key={i} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div variants={fadeUp}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", overflow: "hidden", marginBottom: "16px" }}>
                {todayExercises.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px 16px",
                      borderBottom: i < todayExercises.length - 1 ? "1px solid var(--border)" : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <motion.div variants={scaleIn} style={{
                      background: "var(--surface-2)",
                      borderRadius: "8px",
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </motion.div>
                    <div style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{ex[0]}</div>
                    <div style={{
                      background: "var(--surface-2)",
                      borderRadius: "20px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}>
                      {ex[1]}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

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
              background: "var(--text)",
              color: "var(--bg)",
              border: "none",
              borderRadius: "14px",
              padding: "13px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}>
              {saveSuccess ? t.savedToSchedule : t.saveToSchedule}
            </button>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button onClick={() => router.push("/ai")} style={{
                flex: 1,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "13px",
                color: "var(--text)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}>
                <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  {t.askForTips}
                </motion.span>
              </button>
              <button onClick={() => router.push("/ai")} style={{
                flex: 1,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "13px",
                color: "var(--text)",
                fontSize: "14px",
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
            {!completed ? (
              <button
                onClick={() => {
                  setLoggedExercises(currentExercises.map(e => ({ ...e })))
                  setLogging(true)
                }}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  background: "#6bbfb8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "13px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(107, 191, 184, 0.3)",
                }}
              >
                ✓ Mark as Done
              </button>
            ) : (
              <div style={{
                width: "100%",
                marginTop: "8px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "13px",
                fontSize: "14px",
                color: "#65c97a",
                fontWeight: 600,
                textAlign: "center"
              }}>
                ✓ Workout completed!
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "12px" }}>
              <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {t.reminder}
              </motion.span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--text)",
              borderRadius: "16px",
              padding: "16px 20px",
            }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{t.fitSched}</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>{t.workoutIn}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{muscle} — your slot opens soon.</div>
              {reminderSet ? (
                <div style={{
                  marginTop: "12px",
                  textAlign: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  padding: "12px",
                  background: "var(--surface-2)",
                  borderRadius: "12px",
                }}>
                  {t.reminderSet}
                </div>
              ) : (
                <button onClick={() => setReminderSet(true)} style={{
                  width: "100%",
                  marginTop: "12px",
                  background: "var(--text)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}>
                  {t.setReminder}
                </button>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {logging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.5)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
                onClick={() => setLogging(false)}
              >
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  onClick={e => e.stopPropagation()}
                  style={modalStyle}
                >
                  <h3 style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "var(--text)",
                    marginBottom: "4px",
                  }}>
                    Log Workout
                  </h3>
                  <p style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "20px",
                  }}>
                    Adjust actual reps and sets completed
                  </p>

                  {loggedExercises.map((exercise, index) => (
                    <div key={index} style={{
                      background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                      borderLeft: "3px solid rgba(107,191,184,0.5)",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      marginBottom: "10px",
                    }}>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "10px",
                      }}>
                        {exercise.name}
                      </div>
                      <div style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}>
                        <div style={{ flex: 1 }}>
                          <label style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            letterSpacing: "0.1em",
                            fontWeight: 600,
                          }}>
                            SETS
                          </label>
                          <input
                            type="number"
                            defaultValue={exercise.sets}
                            onChange={e => updateLog(index, "sets", e.target.value)}
                            style={{
                              width: "100%",
                              background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                              border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "var(--text)",
                              fontSize: "14px",
                              marginTop: "4px",
                              outline: "none",
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            letterSpacing: "0.1em",
                            fontWeight: 600,
                          }}>
                            REPS
                          </label>
                          <input
                            type="number"
                            defaultValue={exercise.reps}
                            onChange={e => updateLog(index, "reps", e.target.value)}
                            style={{
                              width: "100%",
                              background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                              border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "var(--text)",
                              fontSize: "14px",
                              marginTop: "4px",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={async () => {
                      const selectedDate = weekDates[selectedDay]
                      if (!selectedDate) return
                      const dateStr = selectedDate.toISOString().split("T")[0]
                      await fetch("/api/workout-log", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          date: dateStr,
                          workoutName: muscle,
                          exercises: loggedExercises,
                        }),
                      })
                      setLogging(false)
                      setCompleted(true)
                    }}
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      background: "#6bbfb8",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      padding: "14px",
                      fontSize: "14px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 4px 16px rgba(107,191,184,0.3)",
                    }}
                  >
                    Save Workout Log
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
