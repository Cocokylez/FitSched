"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Plus, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react"
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
            </div>
          </div>
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
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
              color: "var(--text-muted)", marginBottom: 14,
            }}>
              WEIGHT TREND
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
                  domain={[minW, maxW]}
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
            <div style={{ fontSize: 40, marginBottom: 14 }}>⚖️</div>
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
