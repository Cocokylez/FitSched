"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useStore } from "@/store/useStore"
import { SkeletonBlock } from "@/components/LoadingScreen"
import { useLanguage } from "@/context/LanguageContext"
import { useTheme } from "@/context/ThemeContext"

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MUSCLE_GROUPS = ["Rest", "Chest & Triceps", "Back & Biceps", "Legs", "Shoulders & Core", "Full Body", "Arms & Core"]

interface ScheduleBlock {
  time: string
  label: string
  kind: "cls" | "free" | "wrk" | "rst"
  duration: string
  hint?: string
}

const MOCK: Record<number, ScheduleBlock[]> = {
  0: [{ time: "7:00", label: "Wake up", kind: "rst", duration: "" }, { time: "9:00", label: "Free", kind: "free", duration: "3h" }, { time: "12:00", label: "Lunch", kind: "free", duration: "2h" }, { time: "14:00", label: "Afternoon rest", kind: "rst", duration: "" }],
  1: [{ time: "7:30", label: "Data Structures", kind: "cls", duration: "90m" }, { time: "9:00", label: "Free", kind: "free", duration: "2h" }, { time: "11:00", label: "Calculus", kind: "cls", duration: "90m" }, { time: "12:30", label: "Lunch", kind: "free", duration: "1h" }, { time: "13:30", label: "STS", kind: "cls", duration: "90m" }, { time: "15:00", label: "Free", kind: "free", duration: "2.5h — best window" }],
  2: [{ time: "8:00", label: "PE", kind: "cls", duration: "2h" }, { time: "10:00", label: "Free", kind: "free", duration: "3h" }, { time: "13:00", label: "Programming", kind: "cls", duration: "90m" }, { time: "14:30", label: "Free", kind: "free", duration: "2h" }],
  3: [{ time: "7:30", label: "English", kind: "cls", duration: "90m" }, { time: "9:00", label: "Math", kind: "cls", duration: "90m" }, { time: "10:30", label: "Free", kind: "free", duration: "90m" }, { time: "12:00", label: "Lunch", kind: "free", duration: "1h" }, { time: "13:00", label: "CS Lab", kind: "cls", duration: "3h" }, { time: "16:00", label: "Free", kind: "free", duration: "1.5h — best window" }],
  4: [{ time: "8:00", label: "Data Structures", kind: "cls", duration: "90m" }, { time: "9:30", label: "Free", kind: "free", duration: "2h" }, { time: "11:30", label: "STS", kind: "cls", duration: "90m" }, { time: "13:00", label: "Free", kind: "free", duration: "2h" }],
  5: [{ time: "8:00", label: "Free", kind: "free", duration: "All morning" }, { time: "12:00", label: "Lunch", kind: "free", duration: "1h" }, { time: "13:00", label: "Free", kind: "free", duration: "All afternoon" }],
  6: [{ time: "9:00", label: "Free", kind: "free", duration: "All day" }, { time: "12:00", label: "Lunch", kind: "free", duration: "1h" }],
}

export default function SchedulePage() {
  const { status } = useSession()
  const router = useRouter()
  const sp = useSearchParams()
  const { selectedDay, setSelectedDay, isCalendarConnected, setCalendarConnected } = useStore()
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [weekDates, setWeekDates] = useState<Date[]>([])
  const { t, language } = useLanguage()
  const { theme, toggleTheme } = useTheme()

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
    if (status === "unauthenticated") { router.push("/login"); return }
    if (status !== "authenticated") return

    const load = async () => {
      setLoading(true)
      const { connected, events } = await fetchEvents()

      // Fetch workout schedule for selected day
      let workoutEvents: any[] = []
      try {
        const selectedDate = weekDates[selectedDay]
        if (selectedDate) {
          const dateStr = selectedDate.toISOString().split("T")[0]
          const wsRes = await fetch(`/api/workout-schedule?date=${dateStr}`)
          if (wsRes.ok) {
            const wsData = await wsRes.json()
            workoutEvents = wsData.map((w: any) => ({
              time: t.workout,
              label: w.workoutName,
              kind: "wrk" as const,
              duration: `${w.exercises.length} exercises`,
              exercises: w.exercises,
            }))
          }
        }
      } catch {}

      if (connected && events.length === 0) {
        await syncNow()
        const refreshed = await fetchEvents()
        const evs = refreshed.events
        if (evs.length > 0) {
          const dayEvs = evs.filter((e: any) => new Date(e.startTime).getDay() === selectedDay)
          if (dayEvs.length) {
            const calEvents = dayEvs.map((e: any) => ({
              time: new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              label: e.summary,
              kind: "cls" as const,
              duration: `${Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000)}m`,
            }))
            setSchedule([...calEvents, ...workoutEvents])
            setLoading(false)
            return
          }
        }
        if (workoutEvents.length > 0) {
          setSchedule(workoutEvents)
        } else {
          setSchedule([{ time: "", label: "No events today", kind: "rst", duration: "Clear day" }])
        }
        setLoading(false)
        return
      }
      if (events.length > 0) {
        const dayEvs = events.filter((e: any) => new Date(e.startTime).getDay() === selectedDay)
        const calEvents = dayEvs.length ? dayEvs.map((e: any) => ({
          time: new Date(e.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          label: e.summary,
          kind: "cls" as const,
          duration: `${Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000)}m`,
        })) : []
        setSchedule([...calEvents, ...workoutEvents])
      } else {
        const mockEvents = MOCK[selectedDay] || []
        setSchedule([...mockEvents, ...workoutEvents])
      }
      setLoading(false)
    }
    load()
  }, [status, selectedDay, fetchEvents, syncNow, router, weekDates])

  useEffect(() => {
    if (sp.get("connected") === "true") setCalendarConnected(true)
  }, [sp, setCalendarConnected])

  const bestIdx = selectedDay !== 0 ? schedule.findIndex(b => b.kind === "free" && b.duration.includes("best")) : -1

  const ds = schedule.map((b, i) => {
    const w = i === bestIdx
    return { ...b, kind: w ? "wrk" : b.kind, label: w ? MUSCLE_GROUPS[selectedDay] : b.label, duration: w ? "AI-scheduled — 25 min" : b.duration, hint: w ? "Optimal energy window" : b.hint }
  })

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <motion.div variants={fadeUp}>
          <div style={{
            background: "var(--surface)",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text)" }}>{t.fitSched}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "4px 10px",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}>
                {isCalendarConnected ? t.synced : t.connect}
              </div>
              <button
                onClick={toggleTheme}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {theme === "dark" ? (
                    <>
                      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </>
                  ) : (
                    <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        <div style={{ padding: "20px", flex: 1, overflowY: "auto", paddingBottom: "100px" }}>
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "2px" }}>{t.goodMorning}</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: "20px" }}>{t.yourDay}</div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "24px", scrollbarWidth: "none" }}>
                {weekDates.map((date, i) => (
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
                      color: i === selectedDay ? "var(--bg)" : "var(--text)",
                    }}>
                      {date.getDate()}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

              <motion.div variants={fadeUp}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "12px" }}>
                <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  {t.timeline}
                </motion.span>
              </div>
            </motion.div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} style={{ height: 56, width: "100%", background: "var(--surface)", borderRadius: 14 }} />)}
              </div>
            ) : ds.length === 1 && ds[0].label === "No events today" ? (
              <motion.div variants={fadeUp}>
                <div style={{
                  background: "var(--surface)",
                  border: "1px dashed var(--border)",
                  borderRadius: "14px",
                  padding: "24px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>
                    <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      {t.noEvents}
                    </motion.span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                    <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      {t.clearDay}
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div variants={stagger}>
                {ds.map((block, i) => {
                  const isWorkout = block.kind === "wrk" || (block as any).exercises
                  return (
                    <motion.div key={i} variants={fadeUp}>
                      <div style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderLeft: isWorkout ? "3px solid var(--text)" : "3px solid #555555",
                        borderRadius: "14px",
                        padding: "14px 16px",
                        marginBottom: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{block.label}</div>
                            {isWorkout && (
                              <span style={{
                                background: "var(--surface-2)",
                                color: "var(--text-muted)",
                                fontSize: "10px",
                                borderRadius: "20px",
                                padding: "2px 8px",
                              }}>
                                {t.workoutLabel}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{block.time}</div>
                          {block.hint && (
                            <div style={{ fontSize: "11px", color: "var(--text)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                              {block.hint}
                            </div>
                          )}
                        </div>
                          {block.duration && (
                          <div style={{
                            background: "var(--surface-2)",
                            borderRadius: "20px",
                            padding: "4px 10px",
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                            marginLeft: "8px",
                          }}>
                            {block.duration}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>

    </div>
  )
}
