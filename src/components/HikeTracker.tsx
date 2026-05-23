"use client"

import "leaflet/dist/leaflet.css"
import type L from "leaflet"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Flag, MapPin, Navigation, Pause, Play, RotateCcw, X } from "lucide-react"
import { playSound } from "@/lib/sound"

const ACCENT   = "#6bbfb8"
const GREEN    = "#4ade80"
const RED      = "#f87171"
const BLUE     = "#60a5fa"

export type Waypoint    = { lat: number; lng: number; alt: number | null; ts: number }
export type TrackerResult = {
  distanceKm:  number
  durationMin: number
  elevationM:  number | null
  routePoints: Waypoint[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

function formatPace(km: number, seconds: number): string {
  if (km < 0.01) return "--:--"
  const mPerKm = seconds / 60 / km
  const m = Math.floor(mPerKm), s = Math.round((mPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function fmtRouteDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function fmtRouteTime(sec: number): string {
  const m = Math.round(sec / 60)
  if (m < 60) return `~${m} min`
  return `~${Math.floor(m / 60)}h ${m % 60}m`
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  onFinish:        (result: TrackerResult) => void
  onClose:         () => void
  disableNavEvent?: boolean
}

export function HikeTracker({ onFinish, onClose, disableNavEvent }: Props) {
  // Leaflet refs
  const mapDivRef    = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const trackPolyRef = useRef<L.Polyline | null>(null)      // teal — live route
  const planPolyRef  = useRef<L.Polyline | null>(null)      // blue — planned route
  const dotRef       = useRef<L.CircleMarker | null>(null)  // current position
  const startPinRef  = useRef<L.CircleMarker | null>(null)  // plan: green start
  const endPinRef    = useRef<L.CircleMarker | null>(null)  // plan: red end

  // GPS refs
  const watchRef       = useRef<number | null>(null)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const permRef        = useRef<PermissionStatus | null>(null)
  const waypointsRef   = useRef<Waypoint[]>([])
  const distanceRef    = useRef(0)
  const elevGainRef    = useRef(0)
  const startedRef     = useRef(false)
  const pausedRef      = useRef(false)
  const startTimeRef   = useRef(0)
  const pausedMsRef    = useRef(0)
  const pauseStartRef  = useRef(0)

  // Plan mode refs (read inside Leaflet click handler)
  const modeRef           = useRef<"track" | "plan">("track")
  const planStepRef       = useRef<"start" | "end">("start")
  const planStartRef      = useRef<{ lat: number; lng: number } | null>(null)

  // Stable ref to onClose so Leaflet zoom handler always calls the latest version
  const onCloseRef        = useRef(onClose)
  onCloseRef.current      = onClose
  // Set to true once GPS tracking starts — enables zoom-out-to-globe
  const zoomBackRef       = useRef(false)

  // ── React state ─────────────────────────────────────────────────────────────
  const [mode, setModeState]     = useState<"track" | "plan">("track")
  const [trackStatus, setTrackStatus] = useState<"idle" | "acquiring" | "tracking" | "paused">("idle")
  const [planStep, setPlanStep]  = useState<"start" | "end" | "loading" | "ready">("start")
  const [routeInfo, setRouteInfo] = useState<{ distM: number; durSec: number } | null>(null)
  const [distKm, setDistKm]      = useState(0)
  const [elapsed, setElapsed]    = useState(0)
  const [accuracy, setAccuracy]  = useState<number | null>(null)
  const [error, setError]        = useState<string | null>(null)
  const [isStraightLine, setIsStraightLine] = useState(false)

  function setMode(m: "track" | "plan") {
    modeRef.current = m
    setModeState(m)
    if (m === "plan") {
      // Reset plan step when entering plan mode
      planStepRef.current  = "start"
      planStartRef.current = null
      setPlanStep("start")
      setRouteInfo(null)
    }
  }

  // ── GPS callbacks ────────────────────────────────────────────────────────────

  function onPosition(pos: GeolocationPosition) {
    const { latitude: lat, longitude: lng, altitude: alt, accuracy: acc } = pos.coords
    setAccuracy(acc)
    setError(null)

    if (!startedRef.current) {
      startedRef.current   = true
      startTimeRef.current = Date.now()
      zoomBackRef.current  = true
      setTrackStatus("tracking")
      mapRef.current?.setView([lat, lng], 16)

      timerRef.current = setInterval(() => {
        if (pausedRef.current) return
        const s = Math.floor((Date.now() - startTimeRef.current - pausedMsRef.current) / 1000)
        setElapsed(s)
        setDistKm(Math.round(distanceRef.current * 1000) / 1000)
      }, 1000)
    }

    if (pausedRef.current) return

    const wp: Waypoint = { lat, lng, alt, ts: Date.now() }
    const prev = waypointsRef.current

    if (prev.length > 0) {
      const last = prev[prev.length - 1]
      const d = haversine(last.lat, last.lng, lat, lng)
      if (d < 0.003) return
      distanceRef.current += d
      if (alt !== null && last.alt !== null && alt > last.alt) {
        elevGainRef.current += alt - last.alt
      }
    }

    waypointsRef.current = [...prev, wp]

    const lls = waypointsRef.current.map(w => [w.lat, w.lng] as [number, number])
    trackPolyRef.current?.setLatLngs(lls)
    dotRef.current?.setLatLng([lat, lng])
    mapRef.current?.panTo([lat, lng], { animate: true, duration: 0.8 })
  }

  function onError(err: GeolocationPositionError) {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setError(
      err.code === 1
        ? "Location blocked. Tap the lock icon in the address bar → Site permissions → Location → Allow."
        : err.code === 2
        ? "GPS signal not found — move outdoors and try again."
        : "Location request timed out — try again."
    )
    setTrackStatus("idle")
  }

  function startWatching() {
    if (watchRef.current !== null) return
    setError(null)
    setTrackStatus("acquiring")
    watchRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true, timeout: 30000, maximumAge: 0,
    })
  }

  function enableGPS() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.")
      return
    }
    const go = () => {
      setError(null)
      setTrackStatus("acquiring")
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
      navigator.permissions.query({ name: "geolocation" }).then(r => {
        r.state === "granted" ? startWatching() : go()
      }).catch(go)
    } else {
      go()
    }
  }

  // ── Plan mode: fetch walking route from OSRM (proxied) ───────────────────────

  async function fetchRoute(
    start: { lat: number; lng: number },
    end:   { lat: number; lng: number }
  ) {
    setPlanStep("loading")
    setIsStraightLine(false)
    try {
      const res = await fetch(
        `/api/hike/route?slat=${start.lat}&slng=${start.lng}&elat=${end.lat}&elng=${end.lng}`
      )
      if (!res.ok) throw new Error("Route fetch failed")
      const data = await res.json()
      if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("No route")

      const route     = data.routes[0]
      const coords    = route.geometry.coordinates as [number, number][]
      const latlngs   = coords.map(([lng, lat]) => [lat, lng] as [number, number])

      // Draw planned route as blue dashed line
      if (planPolyRef.current && mapRef.current) {
        planPolyRef.current.setLatLngs(latlngs)
        mapRef.current.fitBounds(planPolyRef.current.getBounds(), { padding: [40, 40] })
      }

      setRouteInfo({ distM: route.distance, durSec: route.duration })
      setPlanStep("ready")
    } catch {
      // No trail data in OSM — fall back to straight-line between the two points
      const distKmStraight = haversine(start.lat, start.lng, end.lat, end.lng)
      const distM  = distKmStraight * 1000
      const durSec = (distKmStraight / 4) * 3600 // estimate at 4 km/h hiking pace

      if (planPolyRef.current && mapRef.current) {
        planPolyRef.current.setLatLngs([
          [start.lat, start.lng],
          [end.lat,   end.lng],
        ])
        mapRef.current.fitBounds(planPolyRef.current.getBounds(), { padding: [60, 60] })
      }

      setIsStraightLine(true)
      setRouteInfo({ distM, durSec })
      setPlanStep("ready")
    }
  }

  function resetPlan() {
    planStepRef.current  = "start"
    planStartRef.current = null
    setPlanStep("start")
    setRouteInfo(null)
    setError(null)
    setIsStraightLine(false)

    if (startPinRef.current) { startPinRef.current.remove(); startPinRef.current = null }
    if (endPinRef.current)   { endPinRef.current.remove();   endPinRef.current   = null }
    planPolyRef.current?.setLatLngs([])
  }

  // ── Leaflet init ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapDivRef.current) return
    let map: L.Map

    import("leaflet").then(({ default: Lf }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Lf.Icon.Default.prototype as any)._getIconUrl

      map = Lf.map(mapDivRef.current!, { zoomControl: false, attributionControl: false })
      Lf.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17 }).addTo(map)

      // Planned route (blue dashed) — drawn before track poly so track sits on top
      const planPoly = Lf.polyline([], {
        color: BLUE, weight: 4, opacity: 0.75, dashArray: "10 6",
      }).addTo(map)

      // Live tracking route (teal solid)
      const trackPoly = Lf.polyline([], { color: ACCENT, weight: 5, opacity: 0.95 }).addTo(map)

      // Current position dot
      const dot = Lf.circleMarker([0, 0], {
        radius: 10, fillColor: ACCENT, color: "#fff", weight: 3, fillOpacity: 1,
      }).addTo(map)

      map.setView([20, 0], 2)

      mapRef.current       = map
      trackPolyRef.current = trackPoly
      planPolyRef.current  = planPoly
      dotRef.current       = dot

      // Zoom out past level 10 while tracking → go back to globe
      map.on("zoomend", () => {
        if (zoomBackRef.current && map.getZoom() <= 10) {
          zoomBackRef.current = false
          onCloseRef.current()
        }
      })

      // Map click — only active in plan mode
      map.on("click", async (e: L.LeafletMouseEvent) => {
        if (modeRef.current !== "plan") return

        const { lat, lng } = e.latlng

        if (planStepRef.current === "start") {
          // Place green start pin
          if (startPinRef.current) startPinRef.current.remove()
          startPinRef.current = Lf.circleMarker([lat, lng], {
            radius: 11, fillColor: GREEN, color: "#fff", weight: 3, fillOpacity: 1,
          }).addTo(map)
          planStartRef.current = { lat, lng }
          planStepRef.current  = "end"
          setPlanStep("end")

        } else if (planStepRef.current === "end") {
          // Place red end pin and fetch route
          if (endPinRef.current) endPinRef.current.remove()
          endPinRef.current = Lf.circleMarker([lat, lng], {
            radius: 11, fillColor: RED, color: "#fff", weight: 3, fillOpacity: 1,
          }).addTo(map)
          planStepRef.current = "start" // reset for next time
          const start = planStartRef.current!
          await fetchRoute(start, { lat, lng })
        }
      })
    })

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      map?.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Permission query on mount ────────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation || !("permissions" in navigator)) return
    let perm: PermissionStatus
    navigator.permissions.query({ name: "geolocation" }).then(result => {
      perm = result
      permRef.current = result
      if (result.state === "granted") startWatching()
      result.onchange = () => {
        if (result.state === "granted" && !startedRef.current) {
          setError(null)
          startWatching()
        }
      }
    }).catch(() => {})
    return () => { if (perm) perm.onchange = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Hide dashboard nav while tracker is open ─────────────────────────────────

  useEffect(() => {
    if (disableNavEvent) return
    window.dispatchEvent(new CustomEvent("hike-tracker-change", { detail: { open: true } }))
    return () => {
      window.dispatchEvent(new CustomEvent("hike-tracker-change", { detail: { open: false } }))
    }
  }, [disableNavEvent])

  // ── Track mode controls ──────────────────────────────────────────────────────

  function togglePause() {
    if (trackStatus === "tracking") {
      pausedRef.current    = true
      pauseStartRef.current = Date.now()
      setTrackStatus("paused")
    } else if (trackStatus === "paused") {
      pausedMsRef.current += Date.now() - pauseStartRef.current
      pausedRef.current    = false
      setTrackStatus("tracking")
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

  const canPause  = trackStatus === "tracking" || trackStatus === "paused"
  const canFinish = (trackStatus === "tracking" || trackStatus === "paused") && distanceRef.current >= 0.01

  // ── Render ───────────────────────────────────────────────────────────────────

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
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "10px 12px", flexShrink: 0,
        background: "var(--panel)", borderBottom: "1px solid var(--border)",
      }}>
        {/* Mode toggle — centered */}
        <div style={{
          flex: 1, display: "flex",
          background: "var(--surface)", borderRadius: 10, padding: 3, gap: 2,
        }}>
          {(["track", "plan"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, border: "none", borderRadius: 8, padding: "7px 0",
                background: mode === m ? "var(--panel)" : "transparent",
                color: mode === m ? "var(--text)" : "var(--text-muted)",
                fontWeight: 800, fontSize: 12, fontFamily: "inherit",
                cursor: "pointer", transition: "background 0.15s, color 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}
            >
              {m === "track"
                ? <><Navigation size={12} strokeWidth={2.5} /> Track GPS</>
                : <><MapPin     size={12} strokeWidth={2.5} /> Plan route</>}
            </button>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", flexShrink: 0, marginLeft: 8 }}
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* ── Map (full height) ───────────────────────────────────────────── */}
      <div ref={mapDivRef} style={{ flex: 1, minHeight: 0, position: "relative" }}>

        {/* TRACK: enable GPS prompt */}
        {mode === "track" && trackStatus === "idle" && !error && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)", gap: 16, padding: 32,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(107,191,184,0.18)", border: `2px solid ${ACCENT}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Navigation size={28} strokeWidth={2} color={ACCENT} />
            </div>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>Enable GPS</span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.5, maxWidth: 260 }}>
                Your browser will ask for location permission.
              </span>
            </div>
            <motion.button
              onClick={enableGPS} whileTap={{ scale: 0.96 }}
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

        {/* TRACK: acquiring */}
        {mode === "track" && trackStatus === "acquiring" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.38)", backdropFilter: "blur(6px)", gap: 14,
          }}>
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: 52, height: 52, borderRadius: "50%", border: `3px solid ${ACCENT}` }}
            />
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Acquiring GPS…</span>
          </div>
        )}

        {/* TRACK: floating timer pill */}
        <AnimatePresence>
          {mode === "track" && (trackStatus === "tracking" || trackStatus === "paused") && (
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              style={{
                position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
                zIndex: 999, pointerEvents: "none",
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(10,20,18,0.72)", backdropFilter: "blur(14px)",
                borderRadius: 999, padding: "9px 20px",
                border: "1px solid rgba(107,191,184,0.22)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
              }}
            >
              {/* status dot */}
              <motion.span
                animate={trackStatus === "tracking" ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: trackStatus === "paused" ? "#facc15" : GREEN,
                }}
              />
              {/* timer */}
              <span style={{
                fontSize: 22, fontWeight: 900, color: "#fff",
                fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
              }}>
                {formatTime(elapsed)}
              </span>
              {/* divider */}
              <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
              {/* distance */}
              <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>
                {distKm.toFixed(2)}<span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginLeft: 2 }}>km</span>
              </span>
              {/* divider */}
              <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
              {/* pace */}
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>
                {formatPace(distKm, elapsed)}<span style={{ fontSize: 10, marginLeft: 2 }}>/km</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TRACK: floating controls */}
        <AnimatePresence>
          {mode === "track" && (trackStatus === "tracking" || trackStatus === "paused") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                zIndex: 999, display: "flex", gap: 10,
                padding: "14px 18px",
                paddingBottom: "max(18px, env(safe-area-inset-bottom))",
              }}
            >
              <motion.button
                onClick={canFinish ? finish : undefined}
                whileTap={canFinish ? { scale: 0.95 } : {}}
                style={{
                  flex: 1, border: "none", borderRadius: 18, padding: "15px",
                  background: canFinish ? ACCENT : "rgba(107,191,184,0.18)",
                  color: canFinish ? "#0d1f1e" : "rgba(107,191,184,0.4)",
                  cursor: canFinish ? "pointer" : "default",
                  fontWeight: 900, fontSize: 14, fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.2s, color 0.2s",
                  boxShadow: canFinish ? "0 0 28px rgba(107,191,184,0.35)" : "none",
                }}
              >
                <CheckCircle size={16} strokeWidth={2.5} />
                Finish hike
              </motion.button>

              <motion.button
                onClick={canPause ? togglePause : undefined}
                whileTap={canPause ? { scale: 0.88 } : {}}
                style={{
                  width: 52, height: 52, flexShrink: 0,
                  border: "1px solid rgba(255,255,255,0.18)", borderRadius: "50%", padding: 0,
                  background: "rgba(10,20,18,0.68)", backdropFilter: "blur(14px)",
                  color: "#fff", cursor: canPause ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: canPause ? 1 : 0.38,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
              >
                {trackStatus === "paused"
                  ? <Play  size={18} strokeWidth={2.5} />
                  : <Pause size={18} strokeWidth={2.5} />}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PLAN: instruction pill */}
        {mode === "plan" && planStep !== "ready" && planStep !== "loading" && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 999, pointerEvents: "none" }}>
            <motion.div
              key={planStep} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
                borderRadius: 999, padding: "9px 18px",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
              }}
            >
              {planStep === "start"
                ? <><MapPin size={14} color={GREEN} strokeWidth={2.5} /><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Tap to set start point</span></>
                : <><Flag   size={14} color={RED}   strokeWidth={2.5} /><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Tap to set finish point</span></>}
            </motion.div>
          </div>
        )}

        {/* PLAN: loading */}
        {mode === "plan" && planStep === "loading" && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 999, pointerEvents: "none" }}>
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity }}
              style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)", borderRadius: 999, padding: "9px 18px", display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ color: BLUE, fontWeight: 700, fontSize: 13 }}>Finding route…</span>
            </motion.div>
          </div>
        )}

        {/* PLAN: route info floating panel */}
        <AnimatePresence>
          {mode === "plan" && planStep === "ready" && routeInfo && (
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 999,
                background: "rgba(10,20,18,0.82)", backdropFilter: "blur(18px)",
                borderTop: "1px solid rgba(107,191,184,0.18)",
                padding: "16px 18px",
                paddingBottom: "max(18px, env(safe-area-inset-bottom))",
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              {isStraightLine && (
                <div style={{
                  background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.25)",
                  borderRadius: 10, padding: "8px 12px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, lineHeight: 1.4 }}>
                    No trail data found for this area — showing straight-line estimate
                  </span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{fmtRouteDist(routeInfo.distM)}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 3 }}>Distance</div>
                </div>
                <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)" }} />
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{fmtRouteTime(routeInfo.durSec)}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 3 }}>Est. walking time</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 18, height: 3, background: BLUE, borderRadius: 2, opacity: isStraightLine ? 0.5 : 1 }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{isStraightLine ? "Straight" : "Route"}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <motion.button onClick={resetPlan} whileTap={{ scale: 0.95 }} style={{ flex: 1, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "12px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", fontWeight: 800, fontSize: 13, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <RotateCcw size={14} strokeWidth={2.5} /> Reset
                </motion.button>
                <motion.button onClick={() => { setMode("track"); enableGPS() }} whileTap={{ scale: 0.95 }} style={{ flex: 2, border: "none", borderRadius: 14, padding: "12px", background: ACCENT, color: "#0d1f1e", fontWeight: 900, fontSize: 13, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 0 20px rgba(107,191,184,0.3)" }}>
                  <Navigation size={14} strokeWidth={2.5} /> Begin hike
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error overlay */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: 0, zIndex: 1000,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.62)", backdropFilter: "blur(6px)", padding: 28, gap: 16,
              }}
            >
              <span style={{ color: "#f87171", fontWeight: 800, fontSize: 14, textAlign: "center", lineHeight: 1.55 }}>
                {error}
              </span>
              <motion.button
                onClick={() => { setError(null); if (mode === "track") enableGPS() }}
                whileTap={{ scale: 0.96 }}
                style={{ border: `1px solid ${ACCENT}`, borderRadius: 14, padding: "11px 24px", background: "transparent", color: ACCENT, fontWeight: 800, fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}
              >
                {mode === "track" ? "Try again" : "Dismiss"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
