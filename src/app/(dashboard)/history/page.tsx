"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts"
import { Calendar, Dumbbell, TrendingUp, Trophy, ChevronDown, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { SkeletonCard } from "@/components/Skeleton"
import { useLanguage } from "@/context/LanguageContext"
import { ACCENT } from "@/lib/theme"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionLog {
  id: string
  date: string
  workoutName: string
  exercises: Array<{ name: string; sets: number; reps: number; weight?: number }>
  notes: string | null
  completedAt: string
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<SessionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"overview" | "chart" | "prs">("overview")
  const [showAll, setShowAll] = useState(false)
  const [expandedPr, setExpandedPr] = useState<string | null>(null)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValues, setNoteValues] = useState<Record<string, string>>({})
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)
  const noteInputRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useLanguage()

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/workout-log")
      if (res.ok) setLogs(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === "authenticated") fetchLogs()
  }, [status, fetchLogs])

  const saveNote = useCallback(async (logId: string) => {
    const text = (noteValues[logId] ?? "").trim()
    setSavingNoteId(logId)
    try {
      const res = await fetch("/api/workout-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: logId, notes: text || null }),
      })
      if (res.ok) {
        setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, notes: text || null } : l))
        setEditingNoteId(null)
      }
    } catch {}
    setSavingNoteId(null)
  }, [noteValues])

  // ── Derived stats ────────────────────────────────────────────────────────────

  const totalSessions = logs.length
  const totalSets = logs.reduce((s, l) => s + l.exercises.reduce((a, e) => a + e.sets, 0), 0)
  const totalExerciseSlots = logs.reduce((s, l) => s + l.exercises.length, 0)

  const weekStart = useMemo(() => {
    const d = new Date()
    const dow = d.getDay()
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const thisWeekCount = logs.filter((l) => new Date(l.completedAt) >= weekStart).length

  // Chart: last 14 sessions
  const chartData = [...logs].slice(0, 14).reverse().map((log) => ({
    date: new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sets: log.exercises.reduce((s, e) => s + e.sets, 0),
    exercises: log.exercises.length,
  }))

  // PRs: group exercises across all sessions, track weight progression
  const personalRecords = useMemo(() => {
    const byExercise: Record<string, Array<{ date: string; maxWeight: number | null; maxReps: number; rawDate: string }>> = {}

    for (const log of [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      for (const ex of log.exercises) {
        if (!byExercise[ex.name]) byExercise[ex.name] = []
        byExercise[ex.name].push({
          date: new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          maxWeight: ex.weight != null && ex.weight > 0 ? ex.weight : null,
          maxReps: ex.reps,
          rawDate: log.date,
        })
      }
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    return Object.entries(byExercise)
      .map(([name, progression]) => {
        const prEntry = progression.reduce((best, cur) => {
          if (cur.maxWeight != null && (best.maxWeight == null || cur.maxWeight > best.maxWeight)) return cur
          if (cur.maxWeight == null && best.maxWeight == null && cur.maxReps > best.maxReps) return cur
          return best
        }, progression[0])
        const isRecent = prEntry ? new Date(prEntry.rawDate).getTime() > sevenDaysAgo : false
        return { name, pr: prEntry, isRecent, progression, sessionCount: progression.length }
      })
      .filter((e) => e.progression.length > 0)
      .sort((a, b) => {
        if (a.isRecent && !b.isRecent) return -1
        if (!a.isRecent && b.isRecent) return 1
        return a.name.localeCompare(b.name)
      })
  }, [logs])

  // ── UI ───────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "16px 16px 100px" }}>

      {/* Header + tab pills */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.5px", margin: 0 }}>{t.history}</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "4px 0 0" }}>{t.trackJourney}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, background: "var(--surface-2)", borderRadius: 12, padding: 4 }}>
          {(["overview", "chart", "prs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 9, border: "none", fontSize: 12, fontWeight: 800,
                background: view === tab ? "var(--surface)" : "transparent",
                color: view === tab ? "var(--text)" : "var(--text-muted)",
                cursor: "pointer", boxShadow: view === tab ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s",
              }}
            >
              {tab === "overview" ? "Overview" : tab === "chart" ? "Charts" : "PRs"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {view === "overview" && (
        <>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[1,2,3,4].map((i) => <SkeletonCard key={i} height="80px" />)}
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}
              >
                {[
                  { icon: Calendar, label: t.totalWorkouts, value: totalSessions },
                  { icon: Dumbbell, label: t.totalSets, value: totalSets },
                  { icon: TrendingUp, label: t.totalExercises, value: totalExerciseSlots },
                  { icon: Trophy, label: t.thisWeek, value: thisWeekCount },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.04 }}
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px" }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(107,191,184,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                      <stat.icon size={16} color={ACCENT} />
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 3 }}>{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>{t.recentActivity}</div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                {(showAll ? logs : logs.slice(0, 10)).map((log, i) => {
                  const isExpanded = expandedLogId === log.id
                  const isEditingNote = editingNoteId === log.id
                  const noteVal = noteValues[log.id] ?? (log.notes || "")
                  return (
                    <div key={log.id} style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", cursor: "pointer" }}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.workoutName}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" · "}{log.exercises.length} exercises
                            {log.notes && <span style={{ color: ACCENT }}> · 📝</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                              {log.exercises.reduce((s, e) => s + e.sets, 0)} sets
                            </div>
                            {log.exercises.some((e) => e.weight) && (
                              <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, marginTop: 2 }}>
                                {Math.max(...log.exercises.filter((e) => e.weight).map((e) => e.weight!))} kg max
                              </div>
                            )}
                          </div>
                          <ChevronDown
                            size={14}
                            color="var(--text-muted)"
                            style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                          />
                        </div>
                      </motion.div>

                      {/* Expanded detail + notes */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: "hidden", borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}
                          >
                            <div style={{ padding: "12px 16px" }}>
                              {/* Exercise list */}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                                {log.exercises.map((ex, ei) => (
                                  <span key={ei} style={{ fontSize: 11, fontWeight: 700, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 9px", color: "var(--text)" }}>
                                    {ex.name} · {ex.sets}×{ex.reps}{ex.weight ? ` · ${ex.weight}kg` : ""}
                                  </span>
                                ))}
                              </div>

                              {/* Notes section */}
                              {isEditingNote ? (
                                <div>
                                  <textarea
                                    ref={noteInputRef}
                                    value={noteVal}
                                    onChange={(e) => setNoteValues((prev) => ({ ...prev, [log.id]: e.target.value }))}
                                    placeholder="Add a note about this session…"
                                    maxLength={500}
                                    rows={3}
                                    style={{
                                      width: "100%", boxSizing: "border-box",
                                      background: "var(--surface)", border: "1px solid var(--border)",
                                      borderRadius: 10, padding: "10px 12px",
                                      color: "var(--text)", fontSize: 13, fontFamily: "inherit",
                                      resize: "none", outline: "none",
                                    }}
                                  />
                                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <button
                                      onClick={() => { setEditingNoteId(null) }}
                                      style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => saveNote(log.id)}
                                      disabled={savingNoteId === log.id}
                                      style={{ flex: 2, padding: "8px 0", borderRadius: 9, border: "none", background: ACCENT, color: "#0a1412", fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: savingNoteId === log.id ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                                    >
                                      <Check size={12} strokeWidth={2.5} />
                                      {savingNoteId === log.id ? "Saving…" : "Save note"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => {
                                    setNoteValues((prev) => ({ ...prev, [log.id]: log.notes || "" }))
                                    setEditingNoteId(log.id)
                                    setTimeout(() => noteInputRef.current?.focus(), 80)
                                  }}
                                  style={{ cursor: "pointer", padding: "8px 10px", borderRadius: 9, border: "1px dashed var(--border)", color: log.notes ? "var(--text)" : "var(--text-muted)", fontSize: 12, fontWeight: log.notes ? 600 : 500, lineHeight: 1.5 }}
                                >
                                  {log.notes || "Tap to add a note…"}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
                {logs.length === 0 && (
                  <div style={{ padding: "32px 16px", textAlign: "center" }}>
                    <Dumbbell size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                    <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>{t.noWorkouts}</p>
                  </div>
                )}
              </div>
              {logs.length > 10 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  style={{ width: "100%", marginTop: 8, padding: "12px 0", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer" }}
                >
                  {showAll ? t.showLess : t.showAll?.replace("{n}", String(logs.length)) ?? `Show all ${logs.length}`}
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* ── Chart tab ────────────────────────────────────────────────────────── */}
      {view === "chart" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 12px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <BarChart width={0} height={0} data={[]} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Sets per session</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="sets" fill={ACCENT} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "32px 0", margin: 0 }}>No data yet</p>
            )}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <TrendingUp size={14} color={ACCENT} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Exercises per session</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="exercises" stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "32px 0", margin: 0 }}>No data yet</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── PRs tab ──────────────────────────────────────────────────────────── */}
      {view === "prs" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
          {loading ? (
            <SkeletonCard height="120px" />
          ) : personalRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <Trophy size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>Complete workouts with weights to track your PRs</p>
            </div>
          ) : (
            personalRecords.map((pr) => {
              const hasWeight = pr.progression.some((p) => p.maxWeight != null)
              const isExpanded = expandedPr === pr.name
              return (
                <motion.div
                  key={pr.name}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: "var(--surface)", border: `1px solid ${pr.isRecent ? "rgba(107,191,184,0.4)" : "var(--border)"}`, borderRadius: 16, marginBottom: 10, overflow: "hidden" }}
                >
                  <button
                    onClick={() => setExpandedPr(isExpanded ? null : pr.name)}
                    style={{ width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {pr.isRecent && <span style={{ color: ACCENT }}>★ </span>}{pr.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                          {pr.sessionCount} {pr.sessionCount === 1 ? "session" : "sessions"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        {pr.pr?.maxWeight != null ? (
                          <div style={{ fontSize: 17, fontWeight: 900, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>
                            {pr.pr.maxWeight} kg
                          </div>
                        ) : (
                          <div style={{ fontSize: 17, fontWeight: 900, color: ACCENT }}>
                            {pr.pr?.maxReps} reps
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginTop: 1 }}>BEST</div>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && pr.progression.length > 1 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 12px" }}>
                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 10 }}>PROGRESSION</div>
                          <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={pr.progression} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="date" tick={{ fontSize: 8, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 8, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={32} />
                              <Tooltip
                                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                                formatter={(val: number) => hasWeight ? [`${val}kg`, "Weight"] : [`${val}`, "Reps"]}
                              />
                              <Line type="monotone" dataKey={hasWeight ? "maxWeight" : "maxReps"} stroke={ACCENT} strokeWidth={2} dot={{ fill: ACCENT, r: 3 }} activeDot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </motion.div>
      )}
    </div>
  )
}
