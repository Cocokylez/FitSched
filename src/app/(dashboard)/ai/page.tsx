"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ACCENT } from "@/lib/theme"
import { useTheme } from "@/context/ThemeContext"

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant" | "system"
type Message = { id: string; role: Role; content: string; toolsUsed?: string[] }

// ── Constants ─────────────────────────────────────────────────────────────────

const STARTERS = [
  { emoji: "📋", label: "Plan today's workout", prompt: "Plan a workout for me today based on my fitness profile and history." },
  { emoji: "📊", label: "Review my progress", prompt: "How has my training been going? Give me a quick summary of my recent workouts." },
  { emoji: "💪", label: "Build a push day", prompt: "Build me a push day workout (chest, shoulders, triceps) with 5 exercises." },
  { emoji: "🔥", label: "High-intensity session", prompt: "Give me a high-intensity full-body workout I can do in 30 minutes." },
]

const TOOL_LABELS: Record<string, string> = {
  get_workout_history: "Checking workout history…",
  get_fitness_profile: "Reading your profile…",
  schedule_workout: "Scheduling workout…",
  get_streak_info: "Checking streak…",
}

// ── Markdown lite renderer ────────────────────────────────────────────────────

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:rgba(107,191,184,0.12);border-radius:4px;padding:1px 5px;font-size:0.9em">$1</code>')
    .replace(/^### (.+)$/gm, '<div style="font-size:13px;font-weight:900;margin:10px 0 4px;color:var(--text)">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:14px;font-weight:900;margin:12px 0 5px;color:var(--text)">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-size:15px;font-weight:900;margin:12px 0 6px;color:var(--text)">$1</div>')
    .replace(/^• (.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span>•</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span>•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, (_, p1, offset, str) => {
      const n = str.slice(0, offset).split("\n").filter((l: string) => /^\d+\./.test(l)).length + 1
      return `<div style="display:flex;gap:6px;margin:3px 0"><span style="min-width:16px;font-weight:700">${n}.</span><span>${p1}</span></div>`
    })
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, "<br/>")
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AIPage() {
  const { status } = useSession()
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [toolActivity, setToolActivity] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, toolActivity])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }, [input])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setError(null)
    setLoading(true)
    setToolActivity(null)

    // Build conversation history for the API (exclude system messages)
    const history = nextMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Failed to get response")
      }

      const data = await res.json()

      // Show tool activity hints while streaming (simulate with the toolsUsed list)
      if (data.toolsUsed?.length) {
        for (const tool of data.toolsUsed) {
          setToolActivity(TOOL_LABELS[tool] || tool)
          await new Promise((r) => setTimeout(r, 600))
        }
        setToolActivity(null)
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content || "I couldn't generate a response. Please try again.",
        toolsUsed: data.toolsUsed,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
      setToolActivity(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(107,191,184,0.14)", border: "1px solid rgba(107,191,184,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/>
            <path d="M2 22s1-4 10-4 10 4 10 4"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.2px" }}>FitAI</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Your personal fitness coach</div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{ marginLeft: "auto", border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", cursor: "pointer" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div data-dashboard-scroll style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>

        {/* Empty state — starter prompts */}
        {isEmpty && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ textAlign: "center", padding: "32px 16px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>
                🤖
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.3px" }}>Ask me anything</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, maxWidth: 280, margin: "0 auto" }}>
                I can plan workouts, review your progress, schedule sessions, and give training advice.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {STARTERS.map((s) => (
                <motion.button
                  key={s.prompt}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => sendMessage(s.prompt)}
                  style={{
                    border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 16, padding: "14px 12px",
                    textAlign: "left", cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 7 }}>{s.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", lineHeight: 1.35 }}>{s.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message bubbles */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: 10,
                marginBottom: 14,
                alignItems: "flex-end",
              }}
            >
              {msg.role === "assistant" && (
                <div style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(107,191,184,0.16)", border: "1px solid rgba(107,191,184,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12 }}>
                  🤖
                </div>
              )}
              <div
                style={{
                  maxWidth: "80%",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "11px 14px",
                  background: msg.role === "user"
                    ? (isDark ? "rgba(107,191,184,0.22)" : "rgba(107,191,184,0.16)")
                    : "var(--surface)",
                  border: msg.role === "user"
                    ? "1px solid rgba(107,191,184,0.35)"
                    : "1px solid var(--border)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--text)",
                  fontWeight: 500,
                }}
              >
                {msg.role === "user" ? (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                )}
                {/* Tool use indicators */}
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {msg.toolsUsed.map((tool) => (
                      <span key={tool} style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.08em", color: ACCENT, background: "rgba(107,191,184,0.1)", border: "1px solid rgba(107,191,184,0.2)", borderRadius: 999, padding: "2px 6px" }}>
                        {tool.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Tool activity indicator */}
        <AnimatePresence>
          {toolActivity && (
            <motion.div
              key="tool-activity"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 14px", background: "rgba(107,191,184,0.08)", border: "1px solid rgba(107,191,184,0.22)", borderRadius: 14 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${ACCENT}`, borderTopColor: "transparent", flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{toolActivity}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading dots */}
        <AnimatePresence>
          {loading && !toolActivity && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(107,191,184,0.16)", border: "1px solid rgba(107,191,184,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12 }}>
                🤖
              </div>
              <div style={{ display: "flex", gap: 5, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px 18px 18px 4px" }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)" }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.3)", borderRadius: 14, fontSize: 12, fontWeight: 700, color: "#fc8181" }}
          >
            {error}
            {error.includes("OPENAI_API_KEY") && (
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 500, color: "rgba(252,129,129,0.8)" }}>
                Add <code style={{ fontFamily: "monospace" }}>OPENAI_API_KEY</code> to your <code style={{ fontFamily: "monospace" }}>.env.local</code> file to enable AI chat.
              </div>
            )}
          </motion.div>
        )}

        <div ref={bottomRef} style={{ height: 140 }} />
      </div>

      {/* Input bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "10px 14px", paddingBottom: "max(10px, env(safe-area-inset-bottom))", background: isDark ? "rgba(var(--bg-rgb,19,23,22),0.92)" : "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 700, margin: "0 auto" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask FitAI anything…"
            rows={1}
            disabled={loading}
            style={{
              flex: 1,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "11px 14px",
              fontSize: 14,
              color: "var(--text)",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.5,
              overflowY: "hidden",
              minHeight: 44,
              maxHeight: 140,
              opacity: loading ? 0.7 : 1,
            }}
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: 14,
              border: "none",
              background: input.trim() && !loading ? ACCENT : "var(--surface-2)",
              color: input.trim() && !loading ? "#0b1715" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </motion.button>
        </div>
        <div style={{ textAlign: "center", marginTop: 6, fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}
