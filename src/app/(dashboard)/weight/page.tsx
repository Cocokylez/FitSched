"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Plus, Trash2, TrendingDown, TrendingUp, Minus, Target, X } from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts"
import { ACCENT } from "@/lib/theme"

// ── Types ─────────────────────────────────────────────────────────────────────

type WeightEntry = {
  id: string
  weightKg: number
  notes: string | null
  loggedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeightPage() {
  const { status } = useSession()
  const router = useRouter()

  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [inputKg, setInputKg] = useState("")
  const [inputNotes, setInputNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [goalKg, setGoalKg] = useState<number | null>(null)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalInput, setGoalInput] = useState("")
  const goalInputRef = useRef<HTMLInputElement>(null)

  // Load goal from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fitsched-weight-goal")
      if (raw) { const v = parseFloat(raw); if (isFinite(v)) setGoalKg(v) }
    } catch {}
  }, [])

  const saveGoal = () => {
    const v = parseFloat(goalInput.replace(",", "."))
    if (!isFinite(v) || v < 20 || v > 500) return
    setGoalKg(v)
    try { localStorage.setItem("fitsched-weight-goal", String(v)) } catch {}
    setShowGoalModal(false)
    setGoalInput("")
  }

  const clearGoal = () => {
    setGoalKg(null)
    try { localStorage.removeItem("fitsched-weight-goal") } catch {}
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/register")
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated") return
    fetch("/api/weight")
      .then((r) => r.ok ? r.json() : [])
      .then((d: WeightEntry[]) => { setEntries(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status])

  const latest = entries[entries.length - 1]
  const previous = entries[entries.length - 2]
  const diff = latest && previous ? latest.weightKg - previous.weightKg : null

  // Chart data — last 90 entries max, formatted for recharts
  const chartData = entries.slice(-90).map((e) => ({
    date: fmtDate(e.loggedAt),
    weight: e.weightKg,
  }))

  const minW = entries.length ? Math.min(...entries.map((e) => e.weightKg)) - 2 : 40
  const maxW = entries.length ? Math.max(...entries.map((e) => e.weightKg)) + 2 : 120

  async function handleSave() {
    const kg = parseFloat(inputKg.replace(",", "."))
    if (!isFinite(kg) || kg < 20 || kg > 500) return
    setSaving(true)
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: kg, notes: inputNotes.trim() || null }),
      })
      if (res.ok) {
        const entry: WeightEntry = await res.json()
        setEntries((prev) => [...prev, entry])
        setInputKg("")
        setInputNotes("")
        setShowForm(false)
      }
    } catch {}
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/weight/${id}`, { method: "DELETE" })
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch {}
    setDeletingId(null)
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 100 }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "18px 16px 0" }}>

        {/* Back */}
        <button
          type="button"
          onClick={() => router.push("/profile")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 20px",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.2} />
          Profile
        </button>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text)", letterSpacing: "-0.3px" }}>
              Weight Log
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
              {goalKg != null && (
                <span style={{ marginLeft: 8, color: "#f97316", fontWeight: 700 }}>
                  · Goal: {goalKg} kg
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => { setGoalInput(goalKg != null ? String(goalKg) : ""); setShowGoalModal(true); setTimeout(() => goalInputRef.current?.focus(), 80) }}
              title={goalKg != null ? "Edit goal" : "Set goal weight"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 38, height: 38,
                background: goalKg != null ? "rgba(249,115,22,0.12)" : "var(--surface-2)",
                border: `1px solid ${goalKg != null ? "rgba(249,115,22,0.35)" : "var(--border)"}`,
                borderRadius: 12, color: goalKg != null ? "#f97316" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <Target size={16} strokeWidth={2} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => { setShowForm(true); setTimeout(() => inputRef.current?.focus(), 80) }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: ACCENT, border: "none", borderRadius: 14,
                padding: "10px 16px", color: "#0a1412", fontSize: 13, fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Plus size={15} strokeWidth={2.5} />
              Log weight
            </motion.button>
          </div>
        </div>

        {/* Goal modal */}
        <AnimatePresence>
          {showGoalModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowGoalModal(false) }}
              style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 32px" }}
            >
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 32 }}
                style={{ width: "100%", maxWidth: 480, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 24, padding: "24px 22px 28px", boxShadow: "0 20px 70px rgba(0,0,0,0.45)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: "var(--text)" }}>Set weight goal</div>
                  <button onClick={() => setShowGoalModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                  Set a target weight to track your progress toward your goal.
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    ref={goalInputRef}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="20"
                    max="500"
                    placeholder="e.g. 70.0"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveGoal() }}
                    style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 14px", fontSize: 20, fontWeight: 800, color: "var(--text)", outline: "none", boxSizing: "border-box" as const }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>kg</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {goalKg != null && (
                    <button
                      onClick={() => { clearGoal(); setShowGoalModal(false) }}
                      style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-muted)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      Clear goal
                    </button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={saveGoal}
                    style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: "#f97316", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
                  >
                    Set goal
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add entry form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: "var(--panel)", border: "1px solid var(--border)",
                borderRadius: 18, padding: "18px 18px 16px", marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 14 }}>
                NEW ENTRY
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
                    Weight (kg)
                  </div>
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="20"
                    max="500"
                    placeholder="e.g. 72.5"
                    value={inputKg}
                    onChange={(e) => setInputKg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                    style={{
                      width: "100%", background: "var(--surface-2)",
                      border: "1px solid var(--border)", borderRadius: 12,
                      padding: "12px 14px", fontSize: 18, fontWeight: 800,
                      color: "var(--text)", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      background: ACCENT, border: "none", borderRadius: 12,
                      padding: "12px 18px", fontSize: 14, fontWeight: 800,
                      color: "#0a1412", cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? "…" : "Save"}
                  </motion.button>
                  <button
                    onClick={() => { setShowForm(false); setInputKg(""); setInputNotes("") }}
                    style={{
                      background: "var(--surface-2)", border: "1px solid var(--border)",
                      borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 700,
                      color: "var(--text-muted)", cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Optional notes */}
              <input
                type="text"
                placeholder="Optional note (e.g. post-run)"
                value={inputNotes}
                onChange={(e) => setInputNotes(e.target.value)}
                maxLength={200}
                style={{
                  marginTop: 10, width: "100%",
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "10px 14px", fontSize: 13,
                  color: "var(--text)", outline: "none", boxSizing: "border-box",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Latest + diff card */}
        {!loading && latest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "var(--panel)", border: "1px solid var(--border)",
              borderRadius: 22, padding: "22px 24px", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 20,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 42, fontWeight: 950, color: "var(--text)", letterSpacing: "-1px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {latest.weightKg}
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-muted)", marginLeft: 4 }}>kg</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontWeight: 700 }}>
                Last logged · {fmtDateLong(latest.loggedAt)}
              </div>
            </div>
            {diff !== null && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: diff < 0
                  ? "rgba(74,222,128,0.1)"
                  : diff > 0 ? "rgba(248,113,113,0.1)" : "var(--surface-2)",
                border: `1px solid ${diff < 0 ? "rgba(74,222,128,0.3)" : diff > 0 ? "rgba(248,113,113,0.3)" : "var(--border)"}`,
                borderRadius: 14, padding: "10px 14px",
              }}>
                {diff < 0
                  ? <TrendingDown size={18} color="#4ade80" strokeWidth={2.2} />
                  : diff > 0
                    ? <TrendingUp size={18} color="#f87171" strokeWidth={2.2} />
                    : <Minus size={18} color="var(--text-muted)" strokeWidth={2.2} />
                }
                <div style={{
                  fontSize: 14, fontWeight: 900, fontVariantNumeric: "tabular-nums",
                  color: diff < 0 ? "#4ade80" : diff > 0 ? "#f87171" : "var(--text-muted)",
                }}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em" }}>vs PREV</div>
              </div>
            )}
          </motion.div>
        )}

        {/* Chart */}
        {!loading && chartData.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "var(--panel)", border: "1px solid var(--border)",
              borderRadius: 18, padding: "18px 14px 12px", marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                WEIGHT TREND
              </div>
              {goalKg != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800, color: "#f97316" }}>
                  <div style={{ width: 16, height: 2, background: "#f97316", borderRadius: 1 }} />
                  Goal: {goalKg} kg
                  {latest && (
                    <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                      ({latest.weightKg > goalKg ? `${(latest.weightKg - goalKg).toFixed(1)} to go` : "✓ reached"})
                    </span>
                  )}
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[Math.min(minW, goalKg != null ? goalKg - 2 : minW), Math.max(maxW, goalKg != null ? goalKg + 2 : maxW)]}
                  tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                  axisLine={false} tickLine={false}
                  width={32}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel)", border: "1px solid var(--border)",
                    borderRadius: 10, fontSize: 12, fontWeight: 700,
                  }}
                  formatter={(v: number) => [`${v} kg`, "Weight"]}
                />
                {latest && (
                  <ReferenceLine
                    y={latest.weightKg}
                    stroke={ACCENT}
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                  />
                )}
                {goalKg != null && (
                  <ReferenceLine
                    y={goalKg}
                    stroke="#f97316"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{ value: `Goal`, position: "insideTopRight", fontSize: 9, fill: "#f97316", fontWeight: 800 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: ACCENT, stroke: "var(--panel)", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: ACCENT, stroke: "var(--panel)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: "center", padding: "52px 24px",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
              No entries yet
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55 }}>
              Tap &ldquo;Log weight&rdquo; to start tracking your progress.
            </div>
          </motion.div>
        )}

        {/* History list */}
        {!loading && entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "var(--panel)", border: "1px solid var(--border)",
              borderRadius: 18, overflow: "hidden",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text-muted)", padding: "14px 18px 10px" }}>
              HISTORY
            </div>
            {[...entries].reverse().map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 18px",
                  borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                      {entry.weightKg} kg
                    </span>
                    {entry.notes && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        · {entry.notes}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {fmtDateLong(entry.loggedAt)}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", padding: 6, opacity: deletingId === entry.id ? 0.4 : 0.6,
                    transition: "opacity 0.15s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = deletingId === entry.id ? "0.4" : "0.6" }}
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </motion.div>
        )}

      </div>
    </div>
  )
}
