"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { CloudOff, History, RefreshCw, Trash2, X } from "lucide-react"
import { HikeTracker } from "@/components/HikeTracker"
import type { TrackerResult } from "@/components/HikeTracker"
import { HikeRouteDetail } from "@/components/HikeRouteDetail"
import type { HikeDetail } from "@/components/HikeRouteDetail"
import { getPendingHikeCount, queueHike, requestSync } from "@/lib/hikeOfflineQueue"
import { playSound } from "@/lib/sound"
import { ACCENT } from "@/lib/theme"
import { fmtDuration } from "@/lib/hikeUtils"

// ── Types ─────────────────────────────────────────────────────────────────────

type HikeLog = {
  id: string
  name: string
  distanceKm: number
  durationMin: number
  elevationM: number | null
  locationName: string | null
  loggedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HikePage() {
  const router = useRouter()
  // Increment to remount/reset the tracker after saving or discarding
  const [trackerKey, setTrackerKey] = useState(0)

  // Save form
  const [showSave, setShowSave]   = useState(false)
  const [saveName, setSaveName]   = useState("")
  const [saveLoc, setSaveLoc]     = useState("")
  const [saveNotes, setSaveNotes] = useState("")
  const [saving, setSaving]       = useState(false)
  const pendingResultRef          = useRef<TrackerResult | null>(null)

  // Logs modal
  const [showLogs, setShowLogs]       = useState(false)
  const [logs, setLogs]               = useState<HikeLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  // Route detail
  const [selectedHike, setSelectedHike] = useState<HikeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState<string | null>(null)

  // Offline save feedback
  const [savedOffline, setSavedOffline] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // FitToken reward toast
  const [tokenReward, setTokenReward] = useState<{
    amount: number
    rewardKm: number
    totalKm: number
    excluded: boolean
  } | null>(null)

  // ── Hide nav bar ──────────────────────────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hike-tracker-change", { detail: { open: true } }))
    return () => { window.dispatchEvent(new CustomEvent("hike-tracker-change", { detail: { open: false } })) }
  }, [])

  // ── Offline queue bookkeeping ─────────────────────────────────────────────────

  useEffect(() => {
    getPendingHikeCount().then(setPendingCount).catch(() => {})

    // When SW flushes the queue, refresh pending count + logs list
    const onSynced = () => {
      getPendingHikeCount().then(setPendingCount).catch(() => {})
    }
    window.addEventListener("hike-synced", onSynced)
    return () => window.removeEventListener("hike-synced", onSynced)
  }, [])

  // ── Tracker callbacks ─────────────────────────────────────────────────────────

  function handleTrackerFinish(result: TrackerResult) {
    playSound("confirmation_001.ogg", 0.65)
    pendingResultRef.current = result
    setShowSave(true)
  }

  // ── Save hike ─────────────────────────────────────────────────────────────────

  async function saveHike() {
    const r = pendingResultRef.current
    if (!r) return
    setSaving(true)

    const hikeData = {
      name:         saveName.trim() || "Hike",
      locationName: saveLoc.trim()  || null,
      distanceKm:   r.distanceKm,
      durationMin:  r.durationMin,
      elevationM:   r.elevationM,
      routePoints:  r.routePoints,
      notes:        saveNotes.trim() || null,
      loggedAt:     new Date().toISOString(),
    }

    try {
      const res = await fetch("/api/hike", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(hikeData),
      })

      if (res.ok) {
        playSound("confirmation_002.ogg", 0.6)
        const data = await res.json().catch(() => null)
        if (data?.fitTokenReward?.awarded && data.fitTokenReward.amount > 0) {
          const rewardKm  = data.verification?.rewardKm  ?? r.distanceKm
          const totalKm   = data.verification?.totalKm   ?? r.distanceKm
          const excluded  = (data.verification?.excludedRatio ?? 0) > 0.05
          setTokenReward({ amount: data.fitTokenReward.amount, rewardKm, totalKm, excluded })
          setTimeout(() => setTokenReward(null), 6000)
        }
        setShowSave(false)
        setSaveName(""); setSaveLoc(""); setSaveNotes("")
        pendingResultRef.current = null
        setTrackerKey(k => k + 1)
        return
      }
    } catch {
      // Network unavailable — fall through to offline queue
    }

    // ── Offline path ──────────────────────────────────────────────────────────
    try {
      await queueHike(hikeData)
      await requestSync()
      const newCount = await getPendingHikeCount()
      setPendingCount(newCount)
    } catch { /* IndexedDB unavailable */ }

    playSound("confirmation_002.ogg", 0.5)
    setSavedOffline(true)
    setTimeout(() => setSavedOffline(false), 4000)
    setShowSave(false)
    setSaveName(""); setSaveLoc(""); setSaveNotes("")
    pendingResultRef.current = null
    setTrackerKey(k => k + 1)
    setSaving(false)
  }

  function discardHike() {
    setShowSave(false)
    pendingResultRef.current = null
    setTrackerKey(k => k + 1)
  }

  // ── Logs ─────────────────────────────────────────────────────────────────────

  async function fetchLogs() {
    setLogsLoading(true)
    try {
      const res = await fetch("/api/hike")
      if (res.ok) setLogs(await res.json())
    } finally { setLogsLoading(false) }
  }

  async function deleteLog(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/hike/${id}`, { method: "DELETE" })
      setLogs(prev => prev.filter(l => l.id !== id))
      playSound("close_001.ogg", 0.4)
    } finally { setDeletingId(null) }
  }

  async function openHikeDetail(id: string) {
    setDetailLoading(id)
    try {
      const res = await fetch(`/api/hike/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedHike(data)
        setShowLogs(false)
      }
    } finally { setDetailLoading(null) }
  }

  // ── Input style ───────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "var(--surface-2, rgba(128,128,128,0.08))", border: "1px solid var(--border)",
    borderRadius: 12, padding: "11px 14px",
    color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none",
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0 }}>

      {/* ── 2D tracker map (always visible) ────────────────────────────────── */}
      <HikeTracker
        key={trackerKey}
        onFinish={handleTrackerFinish}
        onClose={() => router.back()}
        disableNavEvent
      />

      {/* ── Logs button ────────────────────────────────────────────────────── */}
      {!showSave && !showLogs && (
        <div style={{ position: "fixed", bottom: 110, left: 16, zIndex: 400, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => { setShowLogs(true); fetchLogs() }}
            style={{
              background: "var(--panel)", border: "1px solid var(--border)",
              borderRadius: 999, padding: "8px 14px", color: "var(--text)",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              backdropFilter: "blur(12px)", position: "relative",
            }}
          >
            <History size={14} strokeWidth={2} />
            Logs
            {/* Pending sync badge */}
            {pendingCount > 0 && (
              <span style={{
                position: "absolute", top: -5, right: -5,
                background: "#facc15", color: "#000",
                borderRadius: "50%", width: 16, height: 16,
                fontSize: 9, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {pendingCount}
              </span>
            )}
          </motion.button>

          {/* Pending sync pill */}
          <AnimatePresence>
            {pendingCount > 0 && (
              <motion.button
                initial={{ opacity: 0, y: -6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.92 }}
                onClick={async () => { await requestSync(); getPendingHikeCount().then(setPendingCount).catch(() => {}) }}
                style={{
                  background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.4)",
                  borderRadius: 999, padding: "6px 11px",
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  color: "#facc15", backdropFilter: "blur(12px)",
                }}
              >
                <RefreshCw size={11} strokeWidth={2.5} />
                {pendingCount} hike{pendingCount > 1 ? "s" : ""} pending sync
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Offline save toast ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {savedOffline && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
              zIndex: 500, display: "flex", alignItems: "center", gap: 9,
              background: "rgba(10,20,18,0.88)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(250,204,21,0.35)",
              borderRadius: 999, padding: "11px 18px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)", whiteSpace: "nowrap",
            }}
          >
            <CloudOff size={14} color="#facc15" strokeWidth={2.5} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              Saved offline — will sync when connected
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FitToken reward toast ───────────────────────────────────────────── */}
      <AnimatePresence>
        {tokenReward && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            style={{
              position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
              zIndex: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              background: "rgba(10,26,24,0.94)", backdropFilter: "blur(18px)",
              border: `1px solid ${ACCENT}40`,
              borderRadius: 20, padding: "14px 22px",
              boxShadow: `0 4px 28px rgba(107,191,184,0.22)`,
              minWidth: 220, maxWidth: 310,
            }}
          >
            {/* Main reward row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: `linear-gradient(135deg, ${ACCENT} 0%, #3d9b94 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg viewBox="0 0 18 18" width="14" height="14" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.65)" strokeWidth="1.4"/>
                  <text x="9" y="13" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="white" fontFamily="sans-serif">FT</text>
                </svg>
              </div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 900, color: ACCENT }}>
                  +{tokenReward.amount.toFixed(2)} FT earned
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginLeft: 8 }}>
                  {tokenReward.rewardKm.toFixed(2)} km × 0.5
                </span>
              </div>
            </div>

            {/* Exclusion note — only shown when speed analysis filtered some km */}
            {tokenReward.excluded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.2)",
                  borderRadius: 10, padding: "6px 10px", width: "100%",
                }}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
                </svg>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                  {(tokenReward.totalKm - tokenReward.rewardKm).toFixed(2)} km excluded — speed too high for walking
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save hike modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSave && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 500,
              background: "rgba(0,0,0,0.8)", backdropFilter: "blur(14px)",
              display: "flex", alignItems: "flex-end",
            }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 290, damping: 30 }}
              style={{
                width: "100%", maxWidth: 560, margin: "0 auto",
                background: "var(--panel)", border: "1px solid var(--border)",
                borderRadius: "24px 24px 0 0", padding: "24px 20px",
                paddingBottom: "max(32px, env(safe-area-inset-bottom))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17, color: "var(--text)" }}>Save your hike</div>
                  {pendingResultRef.current && (
                    <div style={{ fontSize: 12, color: ACCENT, marginTop: 3, fontWeight: 700 }}>
                      {pendingResultRef.current.distanceKm} km · {fmtDuration(pendingResultRef.current.durationMin)}
                      {pendingResultRef.current.elevationM ? ` · ↑${pendingResultRef.current.elevationM}m` : ""}
                    </div>
                  )}
                </div>
                <button onClick={discardHike} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex" }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Trail name</label>
                  <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. Bukit Timah Hill" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Location</label>
                  <input value={saveLoc} onChange={e => setSaveLoc(e.target.value)} placeholder="e.g. Bukit Timah Nature Reserve" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Notes</label>
                  <textarea value={saveNotes} onChange={e => setSaveNotes(e.target.value)} placeholder="How was it?" rows={2} style={{ ...inp, resize: "none" }} />
                </div>
                <motion.button
                  onClick={saveHike} disabled={saving}
                  whileTap={!saving ? { scale: 0.97 } : {}}
                  style={{
                    border: "none", borderRadius: 16, padding: "14px",
                    background: saving ? "rgba(107,191,184,0.5)" : ACCENT,
                    color: "#0d1f1e", fontWeight: 900, fontSize: 14,
                    fontFamily: "inherit", cursor: saving ? "default" : "pointer",
                    boxShadow: saving ? "none" : `0 0 20px rgba(107,191,184,0.3)`,
                  }}
                >
                  {saving ? "Saving…" : "Save hike"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Logs modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowLogs(false) }}
            style={{
              position: "fixed", inset: 0, zIndex: 500,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
              display: "flex", alignItems: "flex-end",
            }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 290, damping: 30 }}
              style={{
                width: "100%", maxWidth: 560, margin: "0 auto",
                background: "var(--panel)", border: "1px solid var(--border)",
                borderRadius: "24px 24px 0 0", padding: "20px 18px",
                paddingBottom: "max(24px, env(safe-area-inset-bottom))",
                maxHeight: "80dvh", overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontWeight: 900, fontSize: 17, color: "var(--text)" }}>Hike logs</div>
                <button onClick={() => setShowLogs(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex" }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              {/* ── Aggregate stats ──────────────────────────────────────────── */}
              {!logsLoading && logs.length > 0 && (() => {
                const totalKm   = logs.reduce((s, l) => s + l.distanceKm, 0)
                const totalMin  = logs.reduce((s, l) => s + l.durationMin, 0)
                const totalElev = logs.reduce((s, l) => s + (l.elevationM ?? 0), 0)
                const totalHrs  = (totalMin / 60).toFixed(1)
                const chips = [
                  { label: "Hikes",     value: String(logs.length) },
                  { label: "Distance",  value: `${totalKm.toFixed(1)} km` },
                  { label: "Elevation", value: `↑${totalElev.toLocaleString()} m` },
                  { label: "Time",      value: `${totalHrs} h` },
                ]
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, marginBottom: 16 }}>
                    {chips.map(chip => (
                      <div key={chip.label} style={{
                        background: "rgba(107,191,184,0.07)", border: "1px solid rgba(107,191,184,0.18)",
                        borderRadius: 12, padding: "9px 8px", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text)", lineHeight: 1.1 }}>{chip.value}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, fontWeight: 700, letterSpacing: "0.05em" }}>{chip.label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {logsLoading ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>Loading…</div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0", fontSize: 13 }}>No hikes logged yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {logs.map(log => (
                    <motion.div
                      key={log.id}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => openHikeDetail(log.id)}
                      style={{
                        background: "var(--surface-2, rgba(128,128,128,0.06))", border: "1px solid var(--border)",
                        borderRadius: 16, padding: "13px 15px",
                        display: "flex", alignItems: "center", gap: 12,
                        cursor: "pointer",
                        opacity: detailLoading === log.id ? 0.55 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {/* Route icon */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: "rgba(107,191,184,0.12)", border: "1px solid rgba(107,191,184,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {detailLoading === log.id
                          ? <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                              style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${ACCENT}`, borderTopColor: "transparent" }}
                            />
                          : <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <path d="M3 14 C5 10, 8 8, 10 6 S14 3, 15 4" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                              <circle cx="3" cy="14" r="2" fill="#4ade80"/>
                              <circle cx="15" cy="4"  r="2" fill="#f87171"/>
                            </svg>
                        }
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.name}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{log.distanceKm} km</span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmtDuration(log.durationMin)}</span>
                          {log.elevationM && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>↑{log.elevationM}m</span>}
                          <span style={{ fontSize: 12, color: "var(--text-muted)", opacity: 0.6 }}>{fmtDate(log.loggedAt)}</span>
                        </div>
                      </div>
                      <motion.button
                        onClick={e => { e.stopPropagation(); deleteLog(log.id) }}
                        disabled={deletingId === log.id}
                        whileTap={{ scale: 0.88 }}
                        style={{
                          background: "transparent", border: "1px solid var(--border)",
                          borderRadius: 8, padding: "5px 7px", cursor: "pointer",
                          color: "var(--text-muted)", display: "flex", flexShrink: 0,
                          opacity: deletingId === log.id ? 0.3 : 1, transition: "opacity 0.15s",
                        }}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Route detail overlay ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedHike && (
          <HikeRouteDetail
            hike={selectedHike}
            onClose={() => setSelectedHike(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
