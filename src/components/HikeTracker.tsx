"use client"

import "leaflet/dist/leaflet.css"
import type L from "leaflet"
import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Flag, Locate, MapPin, Navigation, Pause, Play, RotateCcw, X } from "lucide-react"
import { ACCENT, GREEN, RED, BLUE, YELLOW } from "@/lib/theme"
import { haversineKm } from "@/lib/hikeUtils"

// ── Tile pre-fetch (warms the offline cache around the starting position) ─────

function prefetchTilesAround(lat: number, lng: number) {
  const toTileXY = (la: number, lo: number, z: number) => {
    const x = Math.floor(((lo + 180) / 360) * Math.pow(2, z))
    const y = Math.floor(
      ((1 - Math.log(Math.tan((la * Math.PI) / 180) + 1 / Math.cos((la * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, z)
    )
    return { x, y }
  }

  // Fetch a grid at zoom 14 (3×3 = 9 tiles ≈ 10 km radius),
  //  zoom 15 (5×5 = 25 tiles ≈ 5 km), and zoom 16 (7×7 = 49 tiles ≈ 2 km)
  const plan: Array<{ z: number; r: number }> = [
    { z: 14, r: 1 },
    { z: 15, r: 2 },
    { z: 16, r: 3 },
  ]

  const imgs: HTMLImageElement[] = []

  plan.forEach(({ z, r }) => {
    const { x, y } = toTileXY(lat, lng, z)
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const img = new Image()
        // Using subdomain "a" only — enough to warm the cache without hammering
        img.src = `https://a.tile.opentopomap.org/${z}/${x + dx}/${y + dy}.png`
        imgs.push(img)  // hold reference so GC doesn't drop them mid-load
      }
    }
  })

  // Release after a generous timeout
  setTimeout(() => imgs.length = 0, 30_000)
}

export type Waypoint    = { lat: number; lng: number; alt: number | null; ts: number }
export type TrackerResult = {
  distanceKm:  number
  durationMin: number
  elevationM:  number | null
  routePoints: Waypoint[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  // Whether the map should auto-follow the GPS dot; disabled when user manually drags
  const followRef         = useRef(true)

  // ── React state ─────────────────────────────────────────────────────────────
  const [mode, setModeState]     = useState<"track" | "plan">("track")
  const [trackStatus, setTrackStatus] = useState<"idle" | "acquiring" | "tracking" | "paused">("idle")
  const [planStep, setPlanStep]  = useState<"start" | "end" | "loading" | "ready">("start")
  const [routeInfo, setRouteInfo] = useState<{ distM: number; durSec: number } | null>(null)
  const [distKm, setDistKm]      = useState(0)
  const [elapsed, setElapsed]    = useState(0)
  const [following, setFollowing] = useState(true)
  const [error, setError]        = useState<string | null>(null)
  const [isStraightLine, setIsStraightLine]       = useState(false)
  const [isOsmTrace, setIsOsmTrace]               = useState(false)
  const [showLegend, setShowLegend]               = useState(false)
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const [isOnline, setIsOnline]                   = useState(typeof navigator !== "undefined" ? navigator.onLine : true)

  // "lobby" = pre-hike screen (Begin Hike / Plan Mode choice)
  // "active" = user has pressed a button; full tracker UI shown
  const [phase, setPhaseState]  = useState<"lobby" | "active">("lobby")
  const phaseRef                = useRef<"lobby" | "active">("lobby")
  const beginPressedRef         = useRef(false)   // gates GPS auto-start on permission change

  function setPhase(p: "lobby" | "active") {
    phaseRef.current = p
    setPhaseState(p)
  }

  function setMode(m: "track" | "plan") {
    modeRef.current = m
    setModeState(m)
    if (m === "track") {
      followRef.current = true
      setFollowing(true)
      // Auto-start GPS when switching back to track mode in active phase
      if (phaseRef.current === "active" && watchRef.current === null) {
        enableGPS()
      }
    }
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
    const { latitude: lat, longitude: lng, altitude: alt } = pos.coords
    setError(null)

    if (!startedRef.current) {
      startedRef.current   = true
      startTimeRef.current = Date.now()
      setTrackStatus("tracking")
      mapRef.current?.setView([lat, lng], 16)

      // Pre-fetch tiles around starting position to warm the offline cache
      prefetchTilesAround(lat, lng)

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
      const d = haversineKm(last.lat, last.lng, lat, lng)
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
    if (followRef.current) {
      mapRef.current?.panTo([lat, lng], { animate: true, duration: 0.8 })
    }
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
    setIsOsmTrace(false)
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

      if (planPolyRef.current && mapRef.current) {
        planPolyRef.current.setLatLngs(latlngs)
        mapRef.current.fitBounds(planPolyRef.current.getBounds(), { padding: [40, 40] })
      }

      if (data.source === "osm_trace") setIsOsmTrace(true)
      setRouteInfo({ distM: route.distance, durSec: route.duration })
      setPlanStep("ready")
    } catch {
      // No trail data in OSM — fall back to straight-line between the two points
      const distKmStraight = haversineKm(start.lat, start.lng, end.lat, end.lng)
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
    setIsOsmTrace(false)
    setSafetyAcknowledged(false)

    if (startPinRef.current) { startPinRef.current.remove(); startPinRef.current = null }
    if (endPinRef.current)   { endPinRef.current.remove();   endPinRef.current   = null }
    planPolyRef.current?.setLatLngs([])
  }

  // ── Leaflet init ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapDivRef.current) return
    let map: L.Map

    import("leaflet").then(({ default: Lf }) => {
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

      // User manually dragging/zooming → stop auto-following GPS dot
      map.on("dragstart", () => {
        followRef.current = false
        setFollowing(false)
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
  }, [])

  // ── Permission query on mount ────────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation || !("permissions" in navigator)) return
    let perm: PermissionStatus
    navigator.permissions.query({ name: "geolocation" }).then(result => {
      perm = result
      permRef.current = result
      // Don't auto-start GPS — wait for user to press Begin Hike
      result.onchange = () => {
        if (result.state === "granted" && beginPressedRef.current && !startedRef.current) {
          setError(null)
          startWatching()
        }
      }
    }).catch(() => {})
    return () => { if (perm) perm.onchange = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Online / offline indicator ───────────────────────────────────────────────

  useEffect(() => {
    const onOnline  = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener("online",  onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online",  onOnline)
      window.removeEventListener("offline", onOffline)
    }
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

    // Subsample to ≤ 400 waypoints so the JSON body stays under the server's
    // 100 KB limit. 400 evenly-spaced points are more than enough for anti-cheat
    // speed analysis and route drawing.
    const MAX_WP = 400
    const raw    = waypointsRef.current
    let routePoints: Waypoint[]
    if (raw.length <= MAX_WP) {
      routePoints = raw
    } else {
      routePoints = [raw[0]]
      const step  = (raw.length - 1) / (MAX_WP - 1)
      for (let i = 1; i < MAX_WP - 1; i++) routePoints.push(raw[Math.round(i * step)])
      routePoints.push(raw[raw.length - 1])
    }

    onFinish({
      distanceKm: Math.round(distanceRef.current * 100) / 100,
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      elevationM:  elevGainRef.current > 1 ? Math.round(elevGainRef.current) : null,
      routePoints,
    })
  }

  const canPause  = trackStatus === "tracking" || trackStatus === "paused"
  const canFinish = trackStatus === "tracking" || trackStatus === "paused"

  // ── Lobby handlers ──────────────────────────────────────────────────────────

  function handleBeginHike() {
    beginPressedRef.current = true
    setTrackStatus("acquiring")   // instant feedback — no blank gap while permission promise resolves
    setPhase("active")
    enableGPS()
  }

  function handlePlanMode() {
    setPhase("active")
    setMode("plan")
  }

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
        {/* Mode toggle — only visible in active phase */}
        {phase === "active" ? (
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
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", paddingLeft: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Hike</span>
          </div>
        )}

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

        {/* LOBBY: pre-hike choice screen */}
        {phase === "lobby" && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
            padding: "0 20px",
          }}>
            <div style={{
              display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 400,
              paddingBottom: "max(28px, env(safe-area-inset-bottom))",
            }}>
              <motion.button
                onClick={handleBeginHike}
                whileTap={{ scale: 0.96 }}
                style={{
                  border: "none", borderRadius: 18, padding: "16px",
                  background: ACCENT, color: "#0d1f1e",
                  fontWeight: 900, fontSize: 16, fontFamily: "inherit",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 0 32px rgba(107,191,184,0.4)",
                }}
              >
                <Navigation size={18} strokeWidth={2.5} />
                Begin Hike
              </motion.button>
              <motion.button
                onClick={handlePlanMode}
                whileTap={{ scale: 0.96 }}
                style={{
                  border: "1px solid rgba(255,255,255,0.22)", borderRadius: 18, padding: "14px",
                  background: "rgba(10,20,18,0.62)", backdropFilter: "blur(12px)",
                  color: "#fff",
                  fontWeight: 800, fontSize: 15, fontFamily: "inherit",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <MapPin size={16} strokeWidth={2.5} />
                Plan Mode
              </motion.button>
            </div>
          </div>
        )}

        {/* TRACK: acquiring */}
        {mode === "track" && trackStatus === "acquiring" && phase === "active" && (
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

        {/* TRACK: offline indicator pill ─────────────────────────────────── */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{
                position: "absolute", top: 14, left: 14, zIndex: 999,
                display: "flex", alignItems: "center", gap: 7,
                background: "rgba(10,20,18,0.82)", backdropFilter: "blur(12px)",
                border: `1px solid rgba(250,204,21,0.45)`,
                borderRadius: 999, padding: "7px 13px",
                pointerEvents: "none",
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: YELLOW, flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: YELLOW }}>
                Offline — cached tiles only
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TRACK: recenter button — appears when user has panned away */}
        <AnimatePresence>
          {mode === "track" && (trackStatus === "tracking" || trackStatus === "paused") && !following && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                followRef.current = true
                setFollowing(true)
                const last = waypointsRef.current[waypointsRef.current.length - 1]
                if (last) mapRef.current?.setView([last.lat, last.lng], 16, { animate: true })
              }}
              style={{
                position: "absolute", bottom: 100, right: 16, zIndex: 999,
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(10,20,18,0.82)", backdropFilter: "blur(14px)",
                border: `1.5px solid ${ACCENT}`, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 16px rgba(107,191,184,0.3)`,
              }}
            >
              <Locate size={18} color={ACCENT} strokeWidth={2.5} />
            </motion.button>
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

        {/* PLAN: map legend toggle */}
        {mode === "plan" && (
          <div style={{ position: "absolute", bottom: 16, left: 12, zIndex: 999 }}>
            <motion.button
              onClick={() => setShowLegend(v => !v)}
              whileTap={{ scale: 0.93 }}
              style={{
                background: "rgba(10,20,18,0.78)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999,
                padding: "6px 12px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
              }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg> Map legend
            </motion.button>

            <AnimatePresence>
              {showLegend && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: 0,
                    background: "rgba(10,20,18,0.92)", backdropFilter: "blur(18px)",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14,
                    padding: "12px 14px", minWidth: 220,
                    display: "flex", flexDirection: "column", gap: 9,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 2 }}>
                    OpenTopoMap legend
                  </div>

                  {[
                    { line: { width: 2, color: "#8b5e3c", dash: "3 3" },    label: "Trail / footpath",   sub: "Routable" },
                    { line: { width: 3, color: "#7a5230", dash: "6 3" },    label: "Dirt track",         sub: "Routable" },
                    { line: { width: 2, color: "#c0875a", dash: "1 2" },    label: "Mountain path",      sub: "Routable" },
                    { line: { width: 2, color: "#e07b6b", dash: "8 4" },    label: "Park / nature boundary", sub: "Not a trail" },
                    { line: { width: 1, color: "#b5854a", dash: "none" },   label: "Contour line",       sub: "Elevation only" },
                  ].map(({ line, label, sub }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <svg width="32" height="12" style={{ flexShrink: 0 }}>
                        <line
                          x1="0" y1="6" x2="32" y2="6"
                          stroke={line.color}
                          strokeWidth={line.width}
                          strokeDasharray={line.dash === "none" ? undefined : line.dash}
                        />
                      </svg>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{label}</div>
                        <div style={{ fontSize: 10, color: sub === "Not a trail" ? "#f87171" : sub === "Elevation only" ? "rgba(255,255,255,0.35)" : "#4ade80", fontWeight: 600 }}>
                          {sub}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 2, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
                    Tap two points to plan a route along routable lines.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

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
              {isStraightLine && safetyAcknowledged && (
                <div style={{
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 10, padding: "8px 12px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f87171" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  <span style={{ fontSize: 11, color: "rgba(255,120,120,0.9)", fontWeight: 600, lineHeight: 1.4 }}>
                    No trail data — straight-line only. Navigate with extreme care.
                  </span>
                </div>
              )}
              {isOsmTrace && (
                <div style={{
                  background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.22)",
                  borderRadius: 10, padding: "8px 12px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(74,222,128,0.85)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, lineHeight: 1.4 }}>
                    Traced from OSM trail data — turn-by-turn not available
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
                <motion.button onClick={() => { setMode("track"); enableGPS() }} whileTap={{ scale: 0.95 }} style={{ flex: 2, border: isStraightLine ? "1px solid rgba(239,68,68,0.5)" : "none", borderRadius: 14, padding: "12px", background: isStraightLine ? "rgba(239,68,68,0.18)" : ACCENT, color: isStraightLine ? "#f87171" : "#0d1f1e", fontWeight: 900, fontSize: 13, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: isStraightLine ? "none" : "0 0 20px rgba(107,191,184,0.3)" }}>
                  <Navigation size={14} strokeWidth={2.5} /> {isStraightLine ? "Begin anyway" : "Begin hike"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Safety warning modal — shown when no trail data found */}
        <AnimatePresence>
          {isStraightLine && planStep === "ready" && !safetyAcknowledged && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: 0, zIndex: 1100,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)", padding: 24,
              }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{
                  background: "#1a0a0a", border: "1px solid rgba(239,68,68,0.45)",
                  borderRadius: 20, padding: "28px 24px", maxWidth: 340, width: "100%",
                  display: "flex", flexDirection: "column", gap: 16,
                  boxShadow: "0 0 40px rgba(239,68,68,0.18)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f87171" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ color: "#f87171", fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>No Trail Data Found</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 3 }}>This area has no official trail records</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    {
                      key: "route",
                      iconHtml: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
                      text: "The dotted line shown is a straight-line estimate only — it does not follow any real path.",
                    },
                    {
                      key: "terrain",
                      iconHtml: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
                      text: "Actual terrain may include cliffs, dense forest, rivers, or impassable slopes.",
                    },
                    {
                      key: "trails",
                      iconHtml: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
                      text: "Always use official trail maps or consult local guides before attempting unmarked routes.",
                    },
                    {
                      key: "contact",
                      iconHtml: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 1.17h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.37a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.92 16a2 2 0 0 1 .08.92z"/></svg>`,
                      text: "Tell someone your exact destination and expected return time before you go.",
                    },
                  ].map(({ key, iconHtml, text }) => (
                    <div key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, marginTop: 2 }} dangerouslySetInnerHTML={{ __html: iconHtml }} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>{text}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <motion.button
                    onClick={resetPlan} whileTap={{ scale: 0.95 }}
                    style={{ flex: 1, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 13, padding: "11px", background: "transparent", color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    Go back
                  </motion.button>
                  <motion.button
                    onClick={() => setSafetyAcknowledged(true)} whileTap={{ scale: 0.95 }}
                    style={{ flex: 2, border: "1px solid rgba(239,68,68,0.5)", borderRadius: 13, padding: "11px", background: "rgba(239,68,68,0.15)", color: "#f87171", fontWeight: 800, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    I understand the risks
                  </motion.button>
                </div>
              </motion.div>
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
