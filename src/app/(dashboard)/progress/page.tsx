"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { useLanguage } from "@/context/LanguageContext"
import { SkeletonCard } from "@/components/Skeleton"
import { ChevronDown, ChevronRight } from "lucide-react"
import { stagger, fadeUp } from "@/lib/animations"
import { getMuscleGroup } from "@/lib/exerciseData"
import { getWeekId } from "@/lib/dateUtils"

const cardStyle = {
  background: "var(--surface)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "16px 20px",
  marginBottom: "10px",
  width: "100%",
  boxSizing: "border-box" as const,
}

const sectionLabelStyle = {
  fontSize: "10px",
  fontWeight: "600",
  letterSpacing: "0.12em",
  color: "var(--text-muted)",
  marginBottom: "8px",
  marginTop: "20px",
}

function formatShortWeek(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

interface WorkoutLog {
  id: string
  workoutName: string
  completedAt: string
  exercises: Array<{ name: string; sets: number; reps: number }>
}

export default function ProgressPage() {
  const { status } = useSession()
  const router = useRouter()
  const { t, language } = useLanguage()
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [streak, setStreak] = useState(0)
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState(3)
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    const load = async () => {
      try {
        const [logRes, streakRes, profileRes] = await Promise.all([
          fetch("/api/workout-log"),
          fetch("/api/streak"),
          fetch("/api/onboarding"),
        ])
        if (logRes.ok) setLogs(await logRes.json())
        if (streakRes.ok) {
          const data = await streakRes.json()
          setStreak(data.streak)
        }
        if (profileRes.ok) {
          const data = await profileRes.json()
          if (data.workoutsPerWeek) setWorkoutsPerWeek(data.workoutsPerWeek)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [status])

  const totalWorkouts = logs.length
  const totalExercisesDone = logs.reduce((sum, log) => sum + log.exercises.length, 0)

  const now = new Date()
  const weekIds: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    weekIds.push(getWeekId(d))
  }

  const logsByWeek: Record<string, number> = {}
  logs.forEach((log) => {
    const weekId = getWeekId(new Date(log.completedAt))
    logsByWeek[weekId] = (logsByWeek[weekId] || 0) + 1
  })

  const weeklyData = weekIds.map((id) => ({
    week: formatShortWeek(id),
    actual: logsByWeek[id] || 0,
    planned: workoutsPerWeek,
  }))

  const muscleCounts: Record<string, number> = {}
  logs.forEach((log) => {
    ;(log.exercises || []).forEach((ex) => {
      const group = getMuscleGroup(ex.name)
      muscleCounts[group] = (muscleCounts[group] || 0) + 1
    })
  })

  const totalMuscleExercises = Object.values(muscleCounts).reduce((a, b) => a + b, 0)
  const topMuscles = Object.entries(muscleCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  const recentLogs = logs.slice(0, 10)

  return (
    <div style={{ padding: "20px 16px 24px", minHeight: "100vh", background: "var(--bg)" }}>
      <motion.div variants={stagger} initial="hidden" animate="visible">
        <motion.div variants={fadeUp}>
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "var(--text)", marginBottom: "20px" }}>
            <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {t.progress}
            </motion.span>
          </div>
        </motion.div>

        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SkeletonCard height="80px" />
            <SkeletonCard height="200px" />
            <SkeletonCard height="120px" />
            <SkeletonCard height="60px" />
          </motion.div>
        ) : logs.length === 0 ? (
          <motion.div variants={fadeUp} style={{ textAlign: "center", padding: "60px 16px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <ChevronRight size={28} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{t.noWorkouts}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, maxWidth: 260, margin: "0 auto 28px" }}>
              {t.completeFirstWorkout}
            </div>
            <button
              onClick={() => router.push("/schedule")}
              style={{ background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: 999, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              {t.goToSchedule}
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div variants={fadeUp}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
                {[
                  { value: totalWorkouts, label: t.totalWorkouts },
                  { value: `${streak}`, label: t.currentStreak },
                  { value: totalExercisesDone, label: t.totalExercises },
                ].map((stat, i) => (
                  <div key={i} style={{ ...cardStyle, textAlign: "center", marginBottom: 0, padding: "14px 12px" }}>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text)" }}>{stat.value}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.last8Weeks}</div>
              <div style={cardStyle}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData} margin={{ top: 8, right: 4, bottom: 4, left: -16 }}>
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                      labelStyle={{ color: "var(--text)" }}
                    />
                    <Bar dataKey="actual" radius={[4, 4, 0, 0]} maxBarSize={24}>
                      {weeklyData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.actual >= entry.planned ? "var(--text)" : "var(--border)"}
                          opacity={entry.actual >= entry.planned ? 1 : 0.5}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {topMuscles.length > 0 && (
              <motion.div variants={fadeUp}>
                <div style={sectionLabelStyle}>{t.mostTrained}</div>
                {topMuscles.map(([group, count]) => {
                  const pct = totalMuscleExercises > 0 ? Math.round((count / totalMuscleExercises) * 100) : 0
                  return (
                    <div key={group} style={{ ...cardStyle, marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{group}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{pct}%</div>
                      </div>
                      <div style={{ width: "100%", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                          style={{ height: "100%", background: "var(--text)", borderRadius: 3 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <div style={sectionLabelStyle}>{t.workoutHistory}</div>
            </motion.div>

            {recentLogs.length === 0 ? (
              <motion.div variants={fadeUp}>
                <div style={{ ...cardStyle, textAlign: "center", padding: "24px" }}>
                  <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>{t.noWorkouts}</div>
                </div>
              </motion.div>
            ) : (
              recentLogs.map((log) => {
                const isExpanded = expandedLog === log.id
                return (
                  <motion.div key={log.id} variants={fadeUp}>
                    <div
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      style={{ ...cardStyle, cursor: "pointer", marginBottom: "8px" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                            {log.workoutName}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {new Date(log.completedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ background: "var(--surface-2)", borderRadius: "20px", padding: "4px 10px", fontSize: "11px", color: "var(--text-muted)" }}>
                            {log.exercises.length} {t.exercises}
                          </span>
                          {isExpanded ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                              {(log.exercises || []).map((ex, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: "13px" }}>
                                  <span style={{ color: "var(--text)" }}>{ex.name}</span>
                                  <span style={{ color: "var(--text-muted)" }}>{ex.sets}×{ex.reps}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
