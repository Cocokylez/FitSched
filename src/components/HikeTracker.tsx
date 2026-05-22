"use client"

import "leaflet/dist/leaflet.css"
import type L from "leaflet"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Pause, Play, X } from "lucide-react"
import { playSound } from "@/lib/sound"

const ACCENT = "#6bbfb8"

export type Waypoint = { lat: number; lng: number; alt: number | null; ts: number }

export type TrackerResult = {
  distanceKm: number
  durationMin: number
  elevationM: number | null
  routePoints: Waypoint[]
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

function formatPace(km: number, seconds: number): string {
  if (km < 0.01) return "--:--"
  const mPerKm = seconds / 60 / km
  const m = Math.floor(mPerKm)
  const s = Math.round((mPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

type Props = {
  onFinish: (result: TrackerResult) => void
  onClose: () => void
}

export function HikeTracker({ onFinish, onClose }: Props) {
  const mapDivRef   = useRef<HTMLDivElement>(null)
  const mapRef      = useRef<L.Map | null>(null)
  const polyRef     = useRef<L.Polyline | null>(null)
  const dotRef      = useRef<L.CircleMarker | null>(null)
  const watchRef    = useRef<number | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mutable refs — read in GPS callback without stale closure issues
  const waypointsRef   = useRef<Waypoint[]>([])
  const distanceRef    = useRef(0)
  const elevGainRef    = useRef(0)
  const startedRef     = useRef(false)
  const pausedRef      = useRef(false)
  const startTimeRef   = useRef(0)
  const pausedMsRef    = useRef(0)
  const pauseStartRef  = useRef(0)

  const [status, setStatus]     = useState<"acquiring" | "tracking" | "paused">("acquiring")
  const [distKm, setDistKm]     = useState(0)
  const [elapsed, setElapsed]   = useState(0)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError]       = useState<string | null>(null)

  // Initialise Leaflet map (dynamic import keeps L off the SSR path)
  useEffect(() => {
    if (!mapDivRef.current) return
    let map: L.Map, poly: L.Polyline, dot: L.CircleMarker

    import("leaflet").then(({ default: Lf }) => {
      // Suppress the missing-icon warning that webpack bundlers trigger
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Lf.Icon.Default.prototype as any)._getIconUrl

      map = Lf.map(mapDivRef.current!, { zoomControl: false, attributionControl: false })

      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map)

      poly = Lf.polyline([], { color: ACCENT, weight: 5, opacity: 0.95 }).addTo(map)

      dot = Lf.circleMarker([0, 0], {
        radius: 10, fillColor: ACCENT, color: "#fff", weight: 3, fillOpacity: 1,
      }).addTo(map)

      // Default view until GPS kicks in
      map.setView([0, 0], 2)

      mapRef.current  = map
      polyRef.current = poly
      dotRef.current  = dot
    })

    return () => { map?.remove() }
  }, [])

  // GPS watchPosition
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.")
      return
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, altitude: alt, accuracy: acc } = pos.coords
        setAccuracy(acc)
        setError(null)

        // First valid fix — centre map and start the clock
        if (!startedRef.current) {
          startedRef.current = true
          startTimeRef.current = Date.now()
          setStatus("tracking")
          mapRef.current?.setView([lat, lng], 16)

          timerRef.current = setInterval(() => {
            if (pausedRef.current) return
            const s = Math.floor((Date.now() - startTimeRef.current - pausedMsRef.current) / 1000)
            setElapsed(s)
            setDistKm(Math.round(distanceRef.current * 1000) / 1000)
          }, 1000)
        }

        if (pausedRef.current) return

        // Build waypoint; skip GPS jitter < 3 m
        const wp: Waypoint = { lat, lng, alt, ts: Date.now() }
        const prev = waypointsRef.current

        if (prev.length > 0) {
          const last = prev[prev.length - 1]
          const d = haversine(last.lat, last.lng, lat, lng)
          if (d < 0.003) return   // < 3 m → noise, skip
          distanceRef.current += d
          if (alt !== null && last.alt !== null && alt > last.alt) {
            elevGainRef.current += alt - last.alt
          }
        }

        waypointsRef.current = [...prev, wp]

        // Update Leaflet map
        const lls = waypointsRef.current.map(w => [w.lat, w.lng] as [number, number])
        polyRef.current?.setLatLngs(lls)
        dotRef.current?.setLatLng([lat, lng])
        mapRef.current?.panTo([lat, lng], { animate: true, duration: 0.8 })
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location access denied. Enable GPS in your browser settings."
            : "Unable to get GPS signal — move to an open area."
        )
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function togglePause() {
    if (status === "tracking") {
      pausedRef.current    = true
      pauseStartRef.current = Date.now()
      setStatus("paused")
    } else if (status === "paused") {
      pausedMsRef.current += Date.now() - pauseStartRef.current
      pausedRef.current    = false
      setStatus("tracking")
    }
  }

  function finish() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    playSound("confirmation_001.ogg", 0.65)
    onFinish({
      distanceKm: Math.round(distanceRef.current * 100) / 100,
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      elevationM:  elevGainRef.current > 1 ? Math.round(elevGainRef.current) : null,
      routePoints: waypointsRef.current,
    })
  }

  const canFinish = status !== "acquiring" && distanceRef.current >= 0.01

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "var(--bg)", display: "flex", flexDirection: "column",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", flexShrink: 0,
        background: "var(--panel)", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.span
            animate={status === "tracking" ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              display: "inline-block", width: 9, height: 9, borderRadius: "50%",
              background:
                status === "tracking" ? "#4ade80"
                : status === "paused"   ? "#facc15"
                : ACCENT,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
            {status === "acquiring" ? "Acquiring GPS…"
              : status === "paused" ? "Paused"
              : "Tracking"}
          </span>
          {accuracy !== null && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.55 }}>
              ±{Math.round(accuracy)} m
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6, display: "flex" }}
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* ── Map ─────────────────────────────────────────────── */}
      <div ref={mapDivRef} style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {/* Acquiring overlay */}
        {status === "acquiring" && !error && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.42)", backdropFilter: "blur(6px)", gap: 14, padding: 24,
          }}>
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 52, height: 52, borderRadius: "50%", border: `3px solid ${ACCENT}` }}
            />
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Acquiring GPS signal…</span>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "center" }}>
              Move outdoors for the best accuracy
            </span>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", padding: 28, gap: 10,
          }}>
            <span style={{ color: "#f87171", fontWeight: 800, fontSize: 14, textAlign: "center", lineHeight: 1.5 }}>
              {error}
            </span>
          </div>
        )}
      </div>

      {/* ── Live stats ──────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        background: "var(--panel)", borderTop: "1px solid var(--border)", flexShrink: 0,
      }}>
        {([
          { label: "Distance", value: distKm.toFixed(2), unit: "km" },
          { label: "Time",     value: formatTime(elapsed), unit: "" },
          { label: "Pace",     value: formatPace(distKm, elapsed), unit: "/km" },
        ] as const).map(({ label, value, unit }, i) => (
          <div key={label} style={{
            padding: "15px 8px", textAlign: "center",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{
              fontSize: 22, fontWeight: 900, lineHeight: 1,
              color: "var(--text)", fontVariantNumeric: "tabular-nums",
            }}>
              {value}
              {unit && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginLeft: 2 }}>
                  {unit}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.11em",
              color: "var(--text-muted)", textTransform: "uppercase", marginTop: 4,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls ────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 10, padding: "12px 18px",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        background: "var(--panel)", borderTop: "1px solid var(--border)", flexShrink: 0,
      }}>
        <motion.button
          onClick={status !== "acquiring" ? togglePause : undefined}
          whileTap={status !== "acquiring" ? { scale: 0.95 } : {}}
          style={{
            flex: 1, border: "1px solid var(--border)", borderRadius: 16, padding: "14px",
            background: "var(--surface)", color: "var(--text)",
            cursor: status !== "acquiring" ? "pointer" : "default",
            fontWeight: 900, fontSize: 14, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: status === "acquiring" ? 0.38 : 1,
            transition: "opacity 0.18s",
          }}
        >
          {status === "paused"
            ? <><Play    size={16} strokeWidth={2.5} /> Resume</>
            : <><Pause   size={16} strokeWidth={2.5} /> Pause</>}
        </motion.button>

        <motion.button
          onClick={canFinish ? finish : undefined}
          whileTap={canFinish ? { scale: 0.95 } : {}}
          style={{
            flex: 2, border: "none", borderRadius: 16, padding: "14px",
            background: canFinish ? ACCENT : "var(--surface)",
            color: canFinish ? "#0d1f1e" : "var(--text-muted)",
            cursor: canFinish ? "pointer" : "default",
            fontWeight: 900, fontSize: 14, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: canFinish ? 1 : 0.38,
            transition: "background 0.2s, color 0.2s, opacity 0.18s",
          }}
        >
          <CheckCircle size={16} strokeWidth={2.5} />
          Finish hike
        </motion.button>
      </div>
    </motion.div>
  )
}
