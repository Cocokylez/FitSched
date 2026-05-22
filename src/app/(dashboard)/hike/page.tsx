"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity, ArrowUpRight, ExternalLink, Footprints,
  MapPin, Mountain, Navigation, Pencil, Plus, Timer,
  Trash2, TrendingUp, X,
} from "lucide-react"
import { SkeletonCard } from "@/components/Skeleton"
import { HikeTracker, type TrackerResult } from "@/components/HikeTracker"
import { stagger, fadeUp } from "@/lib/animations"
import { playSound } from "@/lib/sound"

const ACCENT = "#6bbfb8"

type HikeLog = {
  id: string
  name: string
  distanceKm: number
  durationMin: number
  elevationM: number | null
  locationName: string | null
  routePoints: unknown
  notes: string | null
  loggedAt: string
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatPace(distanceKm: number, durationMin: number): string {
  if (distanceKm < 0.01) return "--:--"
  const mPerKm = durationMin / distanceKm
  const m = Math.floor(mPerKm)
  const s = Math.round((mPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })
}

function mapsSearchUrl(q: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA")
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.09em", color: "var(--text-muted)",
  textTransform: "uppercase", marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 12, padding: "11px 14px",
  color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none",
}

function MapThumbnail({ location }: { location: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const src = `/api/hike/map?q=${encodeURIComponent(location)}`
  return (
    <div style={{ width: "100%", height: 140, borderRadius: "14px 14px 0 0", overflow: "hidden", background: "var(--surface)", position: "relative" }}>
      {status === "loading" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%)",
          backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite",
        }} />
      )}
      {status !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src} alt={`Map of ${location}`}
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: status === "ok" ? "block" : "none" }}
        />
      )}
      {status === "error" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, color: "var(--text-muted)", fontSize: 12 }}>
          <MapPin size={20} strokeWidth={1.5} />
          <span>{location}</span>
        </div>
      )}
      {status === "ok" && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(transparent, rgba(0,0,0,0.55))", pointerEvents: "none" }} />
      )}
    </div>
  )
}

export default function HikePage() {
  const [logs, setLogs]               = useState<HikeLog[]>([])
  const [loading, setLoading]         = useState(true)
  const [showTracker, setShowTracker] = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  // Tracker pre-fill — set after GPS session finishes
  const [prefill, setPrefill]         = useState<TrackerResult | null>(null)

  // Form fields
  const [name, setName]               = useState("")
  const [locationName, setLocationName] = useState("")
  const [distanceKm, setDistanceKm]   = useState("")
  const [durationH, setDurationH]     = useState("")
  const [durationM, setDurationM]     = useState("")
  const [elevationM, setElevationM]   = useState("")
  const [notes, setNotes]             = useState("")
  const [loggedAt, setLoggedAt]       = useState(todayStr)

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    try {
      const res = await fetch("/api/hike")
      if (res.ok) setLogs(await res.json())
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName("")
    setLocationName("")
    setDistanceKm("")
    setDurationH("")
    setDurationM("")
    setElevationM("")
    setNotes("")
    setLoggedAt(todayStr())
    setPrefill(null)
  }

  function openManualForm() {
    resetForm()
    setShowForm(true)
  }

  function handleTrackerFinish(result: TrackerResult) {
    setShowTracker(false)
    setPrefill(result)
    // Pre-fill form with tracked values
    setDistanceKm(String(result.distanceKm))
    const h = Math.floor(result.durationMin / 60)
    const m = result.durationMin % 60
    setDurationH(h > 0 ? String(h) : "")
    setDurationM(m > 0 ? String(m) : "0")
    if (result.elevationM) setElevationM(String(result.elevationM))
    setLoggedAt(todayStr())
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const totalMin = (Number(durationH) || 0) * 60 + (Number(durationM) || 0)
    if (!distanceKm || totalMin <= 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/hike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          locationName,
          distanceKm: Number(distanceKm),
          durationMin: totalMin,
          elevationM: elevationM ? Number(elevationM) : null,
          routePoints: prefill?.routePoints ?? null,
          notes,
          loggedAt: loggedAt ? new Date(loggedAt).toISOString() : new Date().toISOString(),
        }),
      })
      if (res.ok) {
        const newLog: HikeLog = await res.json()
        setLogs(prev =>
          [newLog, ...prev].sort(
            (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
          )
        )
        playSound("confirmation_001.ogg", 0.62)
        resetForm()
        setShowForm(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/hike/${id}`, { method: "DELETE" })
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== id))
        playSound("close_001.ogg", 0.45)
      }
    } finally {
      setDeleting(null)
    }
  }

  const stats = useMemo(() => {
    const totalKm        = logs.reduce((s, l) => s + l.distanceKm, 0)
    const totalElevation = logs.reduce((s, l) => s + (l.elevationM ?? 0), 0)
    const bestKm         = logs.length ? Math.max(...logs.map(l => l.distanceKm)) : 0
    return {
      count:          logs.length,
      totalKm:        Math.round(totalKm * 10) / 10,
      totalElevation,
      bestKm:         Math.round(bestKm * 10) / 10,
    }
  }, [logs])

  const canSubmit =
    !!distanceKm && Number(distanceKm) > 0 &&
    ((Number(durationH) || 0) * 60 + (Number(durationM) || 0)) > 0

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div
        data-dashboard-scroll
        style={{ minHeight: "100dvh", background: "var(--bg)", padding: "22px 16px 120px", overflowY: "auto" }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <motion.div variants={stagger} initial="hidden" animate="visible">

            {/* ── Header ────────────────────────────────────── */}
            <motion.div variants={fadeUp} style={{ marginBottom: 22 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                border: "1px solid rgba(107,191,184,0.3)", background: "rgba(107,191,184,0.1)",
                color: ACCENT, borderRadius: 999, padding: "7px 12px",
                fontSize: 11, fontWeight: 900, letterSpacing: "0.08em",
                textTransform: "uppercase", marginBottom: 14,
              }}>
                <Footprints size={14} strokeWidth={1.9} />
                Hike
              </div>
              <h1 style={{ color: "var(--text)", fontSize: 32, lineHeight: 1.05, fontWeight: 950, margin: "0 0 8px" }}>
                Trail log
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.55, margin: 0, maxWidth: 400 }}>
                Track live with GPS or log a completed hike manually.
              </p>
            </motion.div>

            {/* ── Stats 2×2 ─────────────────────────────────── */}
            <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
              {loading ? (
                <SkeletonCard />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    { label: "Hikes",     value: stats.count,                          unit: "",   Icon: Footprints },
                    { label: "Distance",  value: stats.totalKm,                        unit: "km", Icon: Activity   },
                    { label: "Elevation", value: stats.totalElevation.toLocaleString(), unit: "m",  Icon: TrendingUp },
                    { label: "Best hike", value: stats.bestKm,                         unit: "km", Icon: Mountain   },
                  ] as const).map(({ label, value, unit, Icon }) => (
                    <div key={label} style={{
                      background: "var(--panel)", border: "1px solid var(--border)",
                      borderRadius: 18, padding: "16px 18px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <Icon size={13} strokeWidth={2} color={ACCENT} />
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          {label}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
                          {value}
                        </span>
                        {unit && (
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{unit}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ── CTA pair ──────────────────────────────────── */}
            <motion.div variants={fadeUp} style={{ marginBottom: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {/* GPS track */}
              <motion.button
                onClick={() => setShowTracker(true)}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                style={{
                  border: "none", borderRadius: 18, padding: "16px 14px",
                  background: ACCENT, color: "#0d1f1e", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                }}
              >
                <Navigation size={20} strokeWidth={2.2} />
                <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.1 }}>Track with GPS</span>
                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.65, lineHeight: 1.3 }}>Live distance & pace</span>
              </motion.button>

              {/* Manual log */}
              <motion.button
                onClick={openManualForm}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                style={{
                  border: "1px solid var(--border)", borderRadius: 18, padding: "16px 14px",
                  background: "var(--panel)", color: "var(--text)", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                }}
              >
                <Pencil size={20} strokeWidth={2} />
                <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.1 }}>Log manually</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.3 }}>Enter your own numbers</span>
              </motion.button>
            </motion.div>

            {/* ── History ───────────────────────────────────── */}
            <motion.div variants={fadeUp}>
              {loading ? (
                <>
                  <SkeletonCard />
                  <div style={{ height: 10 }} />
                  <SkeletonCard />
                </>
              ) : logs.length === 0 ? (
                <div style={{
                  background: "var(--panel)", border: "1px solid var(--border)",
                  borderRadius: 22, padding: "48px 24px", textAlign: "center",
                }}>
                  <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}>
                    <Mountain size={40} strokeWidth={1.4} color={ACCENT} style={{ opacity: 0.65 }} />
                  </div>
                  <div style={{ color: "var(--text)", fontWeight: 800, fontSize: 16, marginBottom: 7 }}>No hikes yet</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Hit one of the buttons above to start.</div>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {logs.map(log => (
                      <motion.div
                        key={log.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}
                      >
                        {/* Map thumbnail (location-based) */}
                        {!!log.locationName && <MapThumbnail location={log.locationName} />}

                        {/* GPS route badge */}
                        {!!log.routePoints && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 14px 0", fontSize: 11, fontWeight: 700,
                            color: ACCENT,
                          }}>
                            <Navigation size={11} strokeWidth={2.5} />
                            GPS tracked
                          </div>
                        )}

                        {/* Card body */}
                        <div style={{ padding: (!!log.routePoints || !!log.locationName) ? "10px 16px 14px" : "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                <MapPin size={13} strokeWidth={2} color={ACCENT} style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {log.name}
                                </span>
                              </div>

                              {/* Location chip */}
                              {log.locationName && (
                                <a
                                  href={mapsSearchUrl(log.locationName)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: 5,
                                    background: "rgba(107,191,184,0.1)", border: "1px solid rgba(107,191,184,0.25)",
                                    borderRadius: 999, padding: "3px 9px",
                                    color: ACCENT, fontSize: 11, fontWeight: 700,
                                    textDecoration: "none", marginBottom: 8,
                                    maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}
                                >
                                  <ExternalLink size={10} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                  {log.locationName}
                                </a>
                              )}

                              {/* Stats */}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Activity size={11} strokeWidth={2} />{log.distanceKm} km
                                </span>
                                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Timer size={11} strokeWidth={2} />{formatDuration(log.durationMin)}
                                </span>
                                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                  <ArrowUpRight size={11} strokeWidth={2} />{formatPace(log.distanceKm, log.durationMin)}
                                </span>
                                {log.elevationM != null && log.elevationM > 0 && (
                                  <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                    <TrendingUp size={11} strokeWidth={2} />{log.elevationM.toLocaleString()} m
                                  </span>
                                )}
                              </div>

                              {log.notes && (
                                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {log.notes}
                                </p>
                              )}
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {formatDate(log.loggedAt)}
                              </span>
                              <motion.button
                                onClick={() => handleDelete(log.id)}
                                disabled={deleting === log.id}
                                whileTap={{ scale: 0.88 }}
                                style={{
                                  background: "transparent", border: "1px solid var(--border)",
                                  borderRadius: 8, padding: "5px 7px", cursor: "pointer",
                                  color: "var(--text-muted)", display: "flex", alignItems: "center",
                                  opacity: deleting === log.id ? 0.35 : 1, transition: "opacity 0.15s",
                                }}
                              >
                                <Trash2 size={13} strokeWidth={2} />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </motion.div>

          </motion.div>
        </div>

        {/* ── Log form (bottom sheet) ───────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              key="hike-form-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,0.58)", backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                display: "flex", alignItems: "flex-end",
              }}
            >
              <motion.div
                key="hike-form-sheet"
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 290, damping: 30 }}
                style={{
                  width: "100%", maxWidth: 560, margin: "0 auto",
                  background: "var(--panel)", border: "1px solid var(--border)",
                  borderRadius: "24px 24px 0 0", padding: "24px 20px 48px",
                  maxHeight: "90dvh", overflowY: "auto",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 17, color: "var(--text)" }}>
                      {prefill ? "Save tracked hike" : "Log a hike"}
                    </div>
                    {prefill && (
                      <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                        <Navigation size={11} strokeWidth={2.5} />
                        GPS session — {prefill.distanceKm} km · {prefill.durationMin} min
                      </div>
                    )}
                  </div>
                  <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex" }}>
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  <div>
                    <label style={labelStyle}>Trail name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bukit Timah Hill" style={inputStyle} />
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Location</label>
                      {locationName.trim() && (
                        <a href={mapsSearchUrl(locationName)} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
                          <ExternalLink size={11} strokeWidth={2.5} />
                          View on Maps
                        </a>
                      )}
                    </div>
                    <input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Bukit Timah Nature Reserve, Singapore" style={inputStyle} />
                    <div style={{ marginTop: 5, fontSize: 11, color: "var(--text-muted)" }}>
                      A terrain map preview will appear on the card.
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Distance (km) <span style={{ color: ACCENT }}>*</span>
                      {prefill && <span style={{ color: "var(--text-muted)", fontWeight: 600, marginLeft: 6 }}>— GPS measured</span>}
                    </label>
                    <input type="number" min="0.1" step="0.1" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} placeholder="e.g. 4.5" required style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Duration <span style={{ color: ACCENT }}>*</span>
                      {prefill && <span style={{ color: "var(--text-muted)", fontWeight: 600, marginLeft: 6 }}>— GPS measured</span>}
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <input type="number" min="0" step="1" value={durationH} onChange={e => setDurationH(e.target.value)} placeholder="Hours" style={inputStyle} />
                      <input type="number" min="0" max="59" step="1" value={durationM} onChange={e => setDurationM(e.target.value)} placeholder="Minutes" style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Elevation gain (m)
                      {prefill?.elevationM && <span style={{ color: "var(--text-muted)", fontWeight: 600, marginLeft: 6 }}>— GPS measured</span>}
                    </label>
                    <input type="number" min="0" step="1" value={elevationM} onChange={e => setElevationM(e.target.value)} placeholder="e.g. 420" style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={loggedAt} onChange={e => setLoggedAt(e.target.value)} style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How was the trail? Any highlights?" rows={3} style={{ ...inputStyle, resize: "none" }} />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    whileTap={canSubmit && !submitting ? { scale: 0.97 } : {}}
                    style={{
                      border: "none", borderRadius: 16, padding: "14px",
                      background: ACCENT, color: "#0d1f1e",
                      fontWeight: 900, fontSize: 14, fontFamily: "inherit",
                      cursor: canSubmit && !submitting ? "pointer" : "default",
                      opacity: canSubmit && !submitting ? 1 : 0.5,
                      transition: "opacity 0.18s", marginTop: 4,
                    }}
                  >
                    {submitting ? "Saving…" : "Save hike"}
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── GPS Tracker (full-screen) ─────────────────────────── */}
      <AnimatePresence>
        {showTracker && (
          <HikeTracker
            onFinish={handleTrackerFinish}
            onClose={() => setShowTracker(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
