"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/LanguageContext"

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

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
}

interface Message {
  role: "user" | "assistant"
  content: string
}

const QUICK_PROMPTS = [
  "When is the best time for me to work out today?",
  "What workout should I do today?",
  "I only have 15 minutes. What can I do?",
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getWeekDates() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay())
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function tryParseWorkout(text: string): { hasWorkout: boolean; workout?: { name: string; exercises: { name: string; sets: number; reps: number }[] } } | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*"hasWorkout"[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.hasWorkout && parsed.workout) return parsed
    }
  } catch {}
  return null
}

export default function AIPage() {
  const { status } = useSession()
  const router = useRouter()
  const { t, language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)
  const [parsedWorkouts, setParsedWorkouts] = useState<Record<number, any>>({})
  const [showDayPicker, setShowDayPicker] = useState<number | null>(null)
  const [addSuccess, setAddSuccess] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<number | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  const load = useCallback(async () => {
    if (loaded.current) return
    try {
      const r = await fetch("/api/chat")
      if (r.ok) {
        const d = await r.json()
        setMessages(d.map((m: any) => ({ role: m.role, content: m.content })))
        loaded.current = true
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (status === "authenticated") load()
  }, [status, load])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput("")
    setLoading(true)
    setMessages(p => [...p, { role: "user", content: msg }])
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: msg }] }),
      })
      const d = await r.json()
      if (d.message) {
        setMessages(p => [...p, { role: "assistant", content: d.message }])
        const parsed = tryParseWorkout(d.message)
        if (parsed) {
          setParsedWorkouts(prev => ({ ...prev, [messages.length + 1]: parsed }))
        }
      }
    } catch {
      setMessages(p => [...p, { role: "assistant", content: t.connectionError }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 4rem)", background: "var(--bg)" }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}
      >
        <motion.div variants={fadeUp}>
            <div style={{ ...cardStyle, borderRadius: 0, borderBottom: "1px solid var(--border)", marginBottom: 0, padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "var(--surface-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="rgba(99,102,241,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: "var(--text)" }}>{t.fitSchedAI}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t.workoutPlanner}</div>
              </div>
            </div>
          </div>
        </motion.div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          <motion.div variants={stagger} initial="hidden" animate="visible">
            {messages.length === 0 && (
              <motion.div variants={fadeUp} style={{ paddingTop: "24px" }}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: "var(--surface)",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                  }}>
                    <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="rgba(99,102,241,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text)", marginBottom: "4px" }}>
                    <motion.span key={language} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      {t.howCanIHelp}
                    </motion.span>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                  {QUICK_PROMPTS.map((p, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => send(p)}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "20px",
                        padding: "10px 18px",
                        color: "var(--text)",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: "easeOut" as const }}
                  style={{ display: "flex", marginBottom: 12, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
                >
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: "var(--surface)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8, marginTop: 4,
                    }}>
                      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="rgba(99,102,241,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "80%", padding: "12px 16px", fontSize: 14, lineHeight: 1.5,
                    background: msg.role === "user" ? "rgba(99,102,241,1)" : "var(--surface)",
                    color: msg.role === "user" ? "var(--text)" : "var(--text)",
                    borderRadius: msg.role === "user" ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                    border: msg.role === "user" ? "none" : "1px solid var(--border)",
                  }}>
                    {msg.role === "assistant" && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(99,102,241,1)", marginBottom: 4 }}>{t.fitSchedAI}</div>}
                    {msg.content}
                    {parsedWorkouts[i] && showDayPicker !== i && (
                      <button onClick={() => { setShowDayPicker(i); setSaveError(null) }} style={{
                        marginTop: "8px",
                        background: "var(--text)",
                        color: "var(--bg)",
                        borderRadius: "12px",
                        padding: "10px 20px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "none",
                        width: "100%",
                      }}>
                        {t.addToSchedule}
                      </button>
                    )}
                    {parsedWorkouts[i] && showDayPicker === i && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                          {getWeekDates().map((date, di) => (
                            <button key={di} disabled={savingIndex === i} onClick={async () => {
                              const dateStr = date.toISOString().split("T")[0]
                              const workout = parsedWorkouts[i]?.workout
                              if (!workout) return
                              setSavingIndex(i)
                              setSaveError(null)
                              try {
                                const res = await fetch("/api/workout-schedule", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ date: dateStr, workoutName: workout.name, exercises: workout.exercises, source: "ai" }),
                                })
                                if (res.ok) {
                                  setAddSuccess(i)
                                  setShowDayPicker(null)
                                  setTimeout(() => setAddSuccess(null), 2000)
                                } else {
                                  setSaveError(i)
                                }
                              } catch {
                                setSaveError(i)
                              }
                              setSavingIndex(null)
                            }} style={{
                              flex: 1,
                              background: savingIndex === i ? "var(--surface)" : "var(--surface-2)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              padding: "6px 8px",
                              color: savingIndex === i ? "var(--text-muted)" : "var(--text)",
                              fontSize: "11px",
                              cursor: savingIndex === i ? "default" : "pointer",
                              textAlign: "center",
                              opacity: savingIndex === i ? 0.5 : 1,
                            }}>
                              {savingIndex === i ? (
                                <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTopColor: "var(--text)", borderRadius: "50%" }} />
                                </div>
                              ) : (
                                <>
                                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{DAY_NAMES[di]}</div>
                                  <div style={{ fontSize: 14, fontWeight: 700 }}>{date.getDate()}</div>
                                </>
                              )}
                            </button>
                          ))}
                        </div>
                        {saveError === i && (
                          <div style={{ fontSize: "11px", color: "#ff6b6b", marginBottom: "6px" }}>
                            {t.saveFailed}
                          </div>
                        )}
                        <button onClick={() => { setShowDayPicker(null); setSaveError(null) }} style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}>{t.cancel}</button>
                      </div>
                    )}
                    {addSuccess === i && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                        {t.addedToSchedule} &#10003;
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: "flex", marginBottom: 12, justifyContent: "flex-start" }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "var(--surface)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8, marginTop: 4,
                  }}>
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="rgba(99,102,241,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div style={{
                    padding: "12px 16px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "18px 18px 18px 6px",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(99,102,241,1)", marginBottom: 6 }}>{t.fitSchedAI}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-muted)" }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={endRef} />
          </motion.div>
        </div>

        <motion.div variants={fadeUp}>
          <div style={{ ...cardStyle, borderRadius: "20px", display: "flex", alignItems: "center", gap: "8px", marginBottom: 0, marginTop: "auto" }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={t.askAnything}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "var(--text)",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--text)",
                opacity: loading || !input.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
