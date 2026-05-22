"use client"

import "leaflet/dist/leaflet.css"
import type L from "leaflet"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Navigation, Pause, Play, X } from "lucide-react"
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
  const permRef     = useRef<PermissionStatus | null>(null)

  // Mutable refs — read in GPS callback without stale closure issues
  const waypointsRef   = useRef<Waypoint[]>([])
  const distanceRef    = useRef(0)
  const elevGainRef    = useRef(0)
  const startedRef     = useRef(false)
  const pausedRef      = useRef(false)
  const startTimeRef   = useRef(0)
  const pausedMsRef    = useRef(0)
  const pauseStartRef  = useRef(0)

  // "idle"     — waiting for user to tap Enable GPS (no permission requested yet)
  // "acquiring" — permission granted, waiting for first fix
  // "tracking"  — live tracking active
  // "paused"    — tracking paused
  const [status, setStatus]     = useState<"idle" | "acquiring" | "tracking" | "paused">("idle")
  const [distKm, setDistKm]     = useState(0)
  const [elapsed, setElapsed]   = useState(0)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError]       = useState<string | null>(null)

  // GPS callback — shared by getCurrentPosition and watchPosition
  function onPosition(pos: GeolocationPosition) {
    const { latitude: lat, longitude: lng, altitude: alt, accuracy: acc } = pos.coords
    setAccuracy(acc)
    setError(null)

    // First valid fix — centre map and start the clock
    if (!startedRef.current) {
      startedRef.current   = true
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
  }

  function onError(err: GeolocationPositionError) {
    // Clear the stale watchId so startWatching() can create a new one.
    // watchPosition() returns a watchId immediately even when it later
    // calls the error callback, so we must clear it here or "Try again"
    // silently skips due to the `watchRef.current !== null` guard.
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setError(
      err.code === 1
        ? "Location blocked. Tap the lock icon in your browser's address bar → Site permissions → Location → Allow. Then tap \"Try again\"."
        : err.code === 2
        ? "GPS signal not found — move outdoors and try again."
        : "Location request timed out — move to an open area and try again."
    )
    setStatus("idle")
  }

  // Start watchPosition directly — use when permission is already granted.
  function startWatching() {
    if (watchRef.current !== null) return  // already watching
    setError(null)
    setStatus("acquiring")
    watchRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true, timeout: 30000, maximumAge: 0,
    })
  }

  // Called on button tap. Re-queries the live permission state first:
  //   granted → start directly (handles "enabled in settings" case)
  //   prompt/denied → call getCurrentPosition to trigger the OS prompt
  function enableGPS() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.")
      return
    }

    const go = () => {
      setError(null)
      setStatus("acquiring")
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onPosition(pos)
          if (watchRef.current === null) {
            watchRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
              enableHighAccuracy: true, timeout: 30000, maximumAge: 0,
            })
          }
        },
        onError,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    }

    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then(result => {
        if (result.state === "granted") {
          // Permission was enabled in settings — no prompt needed, go directly
          startWatching()
        } else {
          go()
        }
      }).catch(go)
    } else {
      go()
    }
  }

  // Initialise Leaflet map only (no GPS call here)
  useEffect(() => {
    if (!mapDivRef.current) return
    let map: L.Map, poly: L.Polyline, dot: L.CircleMarker

    import("leaflet").then(({ default: Lf }) => {
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

      map.setView([20, 0], 2) // world view until GPS kicks in

      mapRef.current  = map
      polyRef.current = poly
      dotRef.current  = dot
    })

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      map?.remove()
    }
  }, [])

  // Query live permission state. Handles three cases:
  //   granted → skip the idle screen, go straight to acquiring
  //   denied  → show targeted error immediately (no spinner loop)
  //   prompt  → show the "Allow location" button (default idle state)
  //
  // Also wires an onchange listener so if the user enables location in
  // browser settings while this screen is open, tracking starts automatically.
  useEffect(() => {
    if (!navigator.geolocation || !("permissions" in navigator)) return

    let perm: PermissionStatus

    navigator.permissions.query({ name: "geolocation" }).then(result => {
      perm = result
      permRef.current = result

      if (result.state === "granted") {
        startWatching()
      } else if (result.state === "denied") {
        setError(
          "Location is blocked for this site. Tap the lock icon in your browser's address bar → Site permissions → Location → Allow. Then tap \"Try again\"."
        )
      }

      result.onchange = () => {
        if (result.state === "granted" && !startedRef.current) {
          setError(null)
          startWatching()
        } else if (result.state === "denied") {
          setStatus("idle")
          setError(
            "Location is blocked for this site. Tap the lock icon in your browser's address bar → Site permissions → Location → Allow. Then tap \"Try again\"."
          )
        }
      }
    }).catch(() => {
      // Permissions API unavailable — idle state with button is fine
    })

    return () => {
      if (perm) perm.onchange = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const canPause  = status === "tracking" || status === "paused"
  const canFinish = (status === "tracking" || status === "paused") && distanceRef.current >= 0.01

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
            {status === "idle"      ? "Ready"
              : status === "acquiring" ? "Acquiring GPS…"
              : status === "paused"    ? "Paused"
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
        {/* Idle overlay — "Enable GPS" button triggers OS permission prompt */}
        {status === "idle" && !error && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
            gap: 16, padding: 32,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(107,191,184,0.18)", border: `2px solid ${ACCENT}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Navigation size={28} strokeWidth={2} color={ACCENT} />
            </div>
            <div style={{ textAlign: "center", gap: 6, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>Enable GPS</span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>
                Tap below — your browser will ask permission to use your location.
              </span>
            </div>
            <motion.button
              onClick={enableGPS}
              whileTap={{ scale: 0.96 }}
              style={{
                border: "none", borderRadius: 16, padding: "14px 32px",
                background: ACCENT, color: "#0d1f1e",
                fontWeight: 900, fontSize: 15, fontFamily: "inherit",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <Navigation size={16} strokeWidth={2.5} />
              Allow location
            </motion.button>
          </div>
        )}

        {/* Acquiring overlay — waiting for first fix after permission granted */}
        {status === "acquiring" && (
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

        {/* Error overlay — permission denied or signal lost */}
        {error && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.62)", backdropFilter: "blur(6px)", padding: 28, gap: 16,
          }}>
            <span style={{ color: "#f87171", fontWeight: 800, fontSize: 14, textAlign: "center", lineHeight: 1.55 }}>
              {error}
            </span>
            <motion.button
              onClick={enableGPS}
              whileTap={{ scale: 0.96 }}
              style={{
                border: `1px solid ${ACCENT}`, borderRadius: 14, padding: "11px 24px",
                background: "transparent", color: ACCENT,
                fontWeight: 800, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              Try again
            </motion.button>
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
          onClick={canPause ? togglePause : undefined}
          whileTap={canPause ? { scale: 0.95 } : {}}
          style={{
            flex: 1, border: "1px solid var(--border)", borderRadius: 16, padding: "14px",
            background: "var(--surface)", color: "var(--text)",
            cursor: canPause ? "pointer" : "default",
            fontWeight: 900, fontSize: 14, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: canPause ? 1 : 0.38,
            transition: "opacity 0.18s",
          }}
        >
          {status === "paused"
            ? <><Play  size={16} strokeWidth={2.5} /> Resume</>
            : <><Pause size={16} strokeWidth={2.5} /> Pause</>}
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
