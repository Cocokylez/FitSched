"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowUpRight, CheckCircle, Clock, Flag, History,
  MapPin, Navigation, Pause, Play, RotateCcw, Ruler, Trash2, X,
} from "lucide-react"
import { playSound } from "@/lib/sound"

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = "#6bbfb8"
const GREEN  = "#4ade80"
const RED    = "#f87171"
const BLUE   = "#60a5fa"

const GLOBE_IMG   = "//unpkg.com/three-globe/example/img/earth-night.jpg"
const GLOBE_BG    = "//unpkg.com/three-globe/example/img/night-sky.png"

// ── Globe (no SSR) ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false }) as any

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "idle" | "tracking" | "planning"
type PlanStep = "start" | "end" | "loading" | "ready"
type Waypoint = { lat: number; lng: number; alt: number | null; ts: number }

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

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

function fmtPace(km: number, sec: number): string {
  if (km < 0.01) return "--:--"
  const mPerKm = sec / 60 / km, m = Math.floor(mPerKm), s = Math.round((mPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function fmtWalkTime(sec: number): string {
  const m = Math.round(sec / 60)
  return m < 60 ? `~${m} min` : `~${Math.floor(m / 60)}h ${m % 60}m`
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HikePage() {
  // Globe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef   = useRef<any>(null)
  const [globeReady, setGlobeReady] = useState(false)
  const [winSize, setWinSize] = useState({ w: 0, h: 0 })

  // Mode
  const [mode, setMode]         = useState<Mode>("idle")
  const modeRef                 = useRef<Mode>("idle")

  // GPS tracking
  const watchRef      = useRef<number | null>(null)
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const permRef       = useRef<PermissionStatus | null>(null)
  const waypointsRef  = useRef<Waypoint[]>([])
  const distRef       = useRef(0)
  const elevRef       = useRef(0)
  const startedRef    = useRef(false)
  const pausedRef     = useRef(false)
  const startTimeRef  = useRef(0)
  const pausedMsRef   = useRef(0)
  const pauseStartRef = useRef(0)

  const [trackStatus, setTrackStatus] = useState<"idle" | "acquiring" | "tracking" | "paused">("idle")
  const [distKm, setDistKm]           = useState(0)
  const [elapsed, setElapsed]         = useState(0)
  const [gpsPos, setGpsPos]           = useState<{ lat: number; lng: number } | null>(null)
  const [trackPath, setTrackPath]     = useState<[number, number][]>([])
  const [gpsError, setGpsError]       = useState<string | null>(null)

  // Plan mode
  const planStepRef   = useRef<PlanStep>("start")
  const planStartRef  = useRef<{ lat: number; lng: number } | null>(null)
  const [planStep, setPlanStep]       = useState<PlanStep>("start")
  const [planStart, setPlanStart]     = useState<{ lat: number; lng: number } | null>(null)
  const [planEnd, setPlanEnd]         = useState<{ lat: number; lng: number } | null>(null)
  const [planPath, setPlanPath]       = useState<[number, number][]>([])
  const [routeInfo, setRouteInfo]     = useState<{ distM: number; durSec: number } | null>(null)

  // Save form (after tracking)
  const [showSave, setShowSave]       = useState(false)
  const [saveName, setSaveName]       = useState("")
  const [saveLoc, setSaveLoc]         = useState("")
  const [saveNotes, setSaveNotes]     = useState("")
  const [saving, setSaving]           = useState(false)
  const pendingResultRef              = useRef<{ distKm: number; durationMin: number; elevationM: number | null; routePoints: Waypoint[] } | null>(null)

  // Logs history modal
  const [showLogs, setShowLogs]       = useState(false)
  const [logs, setLogs]               = useState<HikeLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  // ── Window size ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const update = () => setWinSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // ── Globe auto-rotation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!globeReady || !globeRef.current) return
    const controls = globeRef.current.controls()
    controls.autoRotate      = mode === "idle"
    controls.autoRotateSpeed = 0.4
    controls.enableZoom      = mode !== "tracking"
    controls.enablePan       = false
  }, [mode, globeReady])

  // ── Hide nav bar ─────────────────────────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hike-tracker-change", { detail: { open: true } }))
    return () => { window.dispatchEvent(new CustomEvent("hike-tracker-change", { detail: { open: false } })) }
  }, [])

  // ── GPS callbacks ────────────────────────────────────────────────────────────

  const onPosition = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, altitude: alt } = pos.coords
    setGpsError(null)
    setGpsPos({ lat, lng })

    if (!startedRef.current) {
      startedRef.current   = true
      startTimeRef.current = Date.now()
      setTrackStatus("tracking")

      // Zoom globe to user location
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat, lng, altitude: 0.015 }, 2000)
      }

      timerRef.current = setInterval(() => {
        if (pausedRef.current) return
        const s = Math.floor((Date.now() - startTimeRef.current - pausedMsRef.current) / 1000)
        setElapsed(s)
        setDistKm(Math.round(distRef.current * 1000) / 1000)
      }, 1000)
    }

    if (pausedRef.current) return

    const wp: Waypoint = { lat, lng, alt, ts: Date.now() }
    const prev = waypointsRef.current

    if (prev.length > 0) {
      const last = prev[prev.length - 1]
      const d = haversine(last.lat, last.lng, lat, lng)
      if (d < 0.003) return
      distRef.current += d
      if (alt !== null && last.alt !== null && alt > last.alt) elevRef.current += alt - last.alt
    }

    waypointsRef.current = [...prev, wp]
    setTrackPath(waypointsRef.current.map(w => [w.lat, w.lng]))

    // Smoothly follow position on globe
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat, lng }, 800)
    }
  }, [])

  const onGpsError = useCallback((err: GeolocationPositionError) => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setGpsError(
      err.code === 1
        ? "Location blocked — tap the lock icon in your browser's address bar → Site permissions → Location → Allow."
        : err.code === 2
        ? "GPS signal not found — move outdoors."
        : "Location request timed out — try again."
    )
    setTrackStatus("idle")
  }, [])

  const startWatching = useCallback(() => {
    if (watchRef.current !== null) return
    setGpsError(null)
    setTrackStatus("acquiring")
    watchRef.current = navigator.geolocation.watchPosition(onPosition, onGpsError, {
      enableHighAccuracy: true, timeout: 30000, maximumAge: 0,
    })
  }, [onPosition, onGpsError])

  const enableGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported."); return }
    const go = () => {
      setGpsError(null)
      setTrackStatus("acquiring")
      navigator.geolocation.getCurrentPosition(
        (pos) => { onPosition(pos); if (watchRef.current === null) startWatching() },
        onGpsError,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    }
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then(r => {
        r.state === "granted" ? startWatching() : go()
      }).catch(go)
    } else go()
  }, [onPosition, onGpsError, startWatching])

  // Permission check on mount
  useEffect(() => {
    if (!navigator.geolocation || !("permissions" in navigator)) return
    let perm: PermissionStatus
    navigator.permissions.query({ name: "geolocation" }).then(result => {
      perm = result; permRef.current = result
      result.onchange = () => {
        if (result.state === "granted" && !startedRef.current && modeRef.current === "tracking") {
          setGpsError(null); startWatching()
        }
      }
    }).catch(() => {})
    return () => { if (perm) perm.onchange = null }
  }, [startWatching])

  // ── Mode transitions ─────────────────────────────────────────────────────────

  function enterTracking() {
    modeRef.current = "tracking"
    setMode("tracking")
    enableGPS()
  }

  function enterPlanning() {
    modeRef.current = "planning"
    setMode("planning")
    planStepRef.current  = "start"
    planStartRef.current = null
    setPlanStep("start")
    setPlanStart(null)
    setPlanEnd(null)
    setPlanPath([])
    setRouteInfo(null)
    // Zoom out to see the whole globe
    if (globeRef.current) globeRef.current.pointOfView({ altitude: 2.5 }, 1000)
  }

  function backToIdle() {
    modeRef.current = "idle"
    setMode("idle")
    setGpsError(null)
    if (globeRef.current) globeRef.current.pointOfView({ altitude: 2.5 }, 1000)
  }

  // ── Tracking controls ────────────────────────────────────────────────────────

  function togglePause() {
    if (trackStatus === "tracking") {
      pausedRef.current = true; pauseStartRef.current = Date.now()
      setTrackStatus("paused")
    } else if (trackStatus === "paused") {
      pausedMsRef.current += Date.now() - pauseStartRef.current
      pausedRef.current = false; setTrackStatus("tracking")
    }
  }

  function finishTracking() {
    if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    playSound("confirmation_001.ogg", 0.65)
    pendingResultRef.current = {
      distKm:      Math.round(distRef.current * 100) / 100,
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      elevationM:  elevRef.current > 1 ? Math.round(elevRef.current) : null,
      routePoints: waypointsRef.current,
    }
    setShowSave(true)
  }

  // ── Plan mode: globe click ───────────────────────────────────────────────────

  const handleGlobeClick = useCallback(async ({ lat, lng }: { lat: number; lng: number }) => {
    if (modeRef.current !== "planning") return

    if (planStepRef.current === "start") {
      planStartRef.current = { lat, lng }
      planStepRef.current  = "end"
      setPlanStart({ lat, lng })
      setPlanStep("end")

    } else if (planStepRef.current === "end") {
      const start = planStartRef.current!
      planStepRef.current = "loading"
      setPlanEnd({ lat, lng })
      setPlanStep("loading")

      try {
        const res = await fetch(
          `/api/hike/route?slat=${start.lat}&slng=${start.lng}&elat=${lat}&elng=${lng}`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.code !== "Ok" || !data.routes?.[0]) throw new Error()

        const route   = data.routes[0]
        const coords  = (route.geometry.coordinates as [number, number][]).map(([lo, la]) => [la, lo] as [number, number])
        setPlanPath(coords)
        setRouteInfo({ distM: route.distance, durSec: route.duration })
        setPlanStep("ready")

        // Fit globe to route bounds
        if (globeRef.current && coords.length > 0) {
          const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1])
          const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
          const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
          globeRef.current.pointOfView({ lat: midLat, lng: midLng, altitude: 0.1 }, 1200)
        }
      } catch {
        setGpsError("Couldn't find a walking route between those points.")
        planStepRef.current = "end"
        setPlanStep("end")
      }
    }
  }, [])

  function resetPlan() {
    planStepRef.current = "start"; planStartRef.current = null
    setPlanStep("start"); setPlanStart(null); setPlanEnd(null)
    setPlanPath([]); setRouteInfo(null); setGpsError(null)
  }

  function beginHikeFromPlan() {
    resetPlan()
    enterTracking()
  }

  // ── Save hike ────────────────────────────────────────────────────────────────

  async function saveHike() {
    const r = pendingResultRef.current
    if (!r) return
    setSaving(true)
    try {
      const res = await fetch("/api/hike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         saveName.trim() || "Hike",
          locationName: saveLoc.trim() || null,
          distanceKm:   r.distKm,
          durationMin:  r.durationMin,
          elevationM:   r.elevationM,
          routePoints:  r.routePoints,
          notes:        saveNotes.trim() || null,
          loggedAt:     new Date().toISOString(),
        }),
      })
      if (res.ok) {
        playSound("confirmation_002.ogg", 0.6)
        setShowSave(false)
        setSaveName(""); setSaveLoc(""); setSaveNotes("")
        pendingResultRef.current = null
        // Reset tracking state
        waypointsRef.current = []; distRef.current = 0; elevRef.current = 0
        startedRef.current = false; pausedRef.current = false
        pausedMsRef.current = 0; startTimeRef.current = 0
        setDistKm(0); setElapsed(0); setGpsPos(null); setTrackPath([])
        setTrackStatus("idle")
        backToIdle()
      }
    } finally { setSaving(false) }
  }

  function discardHike() {
    setShowSave(false)
    pendingResultRef.current = null
    waypointsRef.current = []; distRef.current = 0; elevRef.current = 0
    startedRef.current = false; pausedRef.current = false
    pausedMsRef.current = 0; startTimeRef.current = 0
    setDistKm(0); setElapsed(0); setGpsPos(null); setTrackPath([])
    setTrackStatus("idle")
    backToIdle()
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

  // ── Globe data ────────────────────────────────────────────────────────────────

  const gpsPoints = useMemo(() => {
    if (!gpsPos) return []
    return [{ lat: gpsPos.lat, lng: gpsPos.lng, color: ACCENT, size: 0.4 }]
  }, [gpsPos])

  const planPoints = useMemo(() => {
    const pts = []
    if (planStart) pts.push({ lat: planStart.lat, lng: planStart.lng, color: GREEN,  size: 0.35, label: "Start" })
    if (planEnd)   pts.push({ lat: planEnd.lat,   lng: planEnd.lng,   color: RED,    size: 0.35, label: "Finish" })
    return pts
  }, [planStart, planEnd])

  const allPoints = useMemo(() => [...gpsPoints, ...planPoints], [gpsPoints, planPoints])

  const arcsData = useMemo(() => {
    if (trackPath.length < 2) return []
    // Convert consecutive waypoints to arcs
    return trackPath.slice(0, -1).map((pt, i) => ({
      startLat: pt[0], startLng: pt[1],
      endLat: trackPath[i + 1][0], endLng: trackPath[i + 1][1],
      color: ACCENT,
    }))
  }, [trackPath])

  const planArcs = useMemo(() => {
    if (planPath.length < 2) return []
    return planPath.slice(0, -1).map((pt, i) => ({
      startLat: pt[0], startLng: pt[1],
      endLat: planPath[i + 1][0], endLng: planPath[i + 1][1],
      color: BLUE,
    }))
  }, [planPath])

  const allArcs = useMemo(() => [...arcsData, ...planArcs], [arcsData, planArcs])

  const canPause  = trackStatus === "tracking" || trackStatus === "paused"
  const canFinish = canPause && distRef.current >= 0.01

  // ── Input style ───────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12, padding: "11px 14px",
    color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none",
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", zIndex: 0 }}>

      {/* ── Globe ──────────────────────────────────────────────────────── */}
      {winSize.w > 0 && (
        <Globe
          ref={globeRef}
          width={winSize.w}
          height={winSize.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={GLOBE_IMG}
          backgroundImageUrl={GLOBE_BG}
          atmosphereColor="rgba(107,191,184,0.4)"
          atmosphereAltitude={0.18}
          pointsData={allPoints}
          pointColor="color"
          pointRadius="size"
          pointAltitude={0.005}
          pointLabel="label"
          arcsData={allArcs}
          arcColor="color"
          arcAltitude={0.003}
          arcStroke={1.2}
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={mode === "tracking" ? 1500 : 0}
          onGlobeReady={() => setGlobeReady(true)}
          onGlobeClick={handleGlobeClick}
          enablePointerInteraction={mode === "planning" || mode === "idle"}
        />
      )}

      {/* ── Hike history button (top-right) ────────────────────────────── */}
      {mode === "idle" && (
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => { setShowLogs(true); fetchLogs() }}
          style={{
            position: "absolute", top: 20, right: 18,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 999, padding: "8px 14px", color: "#fff",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            backdropFilter: "blur(12px)",
          }}
        >
          <History size={14} strokeWidth={2} />
          Logs
        </motion.button>
      )}

      {/* ── Back button (tracking / planning) ──────────────────────────── */}
      {mode !== "idle" && !showSave && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          onClick={backToIdle}
          style={{
            position: "absolute", top: 20, left: 18,
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 999, padding: "8px 14px", color: "rgba(255,255,255,0.8)",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            backdropFilter: "blur(12px)",
          }}
        >
          <X size={14} strokeWidth={2} />
          Back
        </motion.button>
      )}

      {/* ── IDLE: two main buttons ──────────────────────────────────────── */}
      <AnimatePresence>
        {mode === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            style={{
              position: "absolute", bottom: "max(36px, env(safe-area-inset-bottom))",
              left: 0, right: 0, display: "flex", justifyContent: "center",
              gap: 12, padding: "0 24px",
            }}
          >
            <motion.button
              onClick={enterTracking}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1, maxWidth: 200, border: "none", borderRadius: 20,
                padding: "18px 20px", background: ACCENT, color: "#0d1f1e",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "flex-start", gap: 5,
                boxShadow: `0 0 28px rgba(107,191,184,0.35)`,
              }}
            >
              <Navigation size={22} strokeWidth={2.2} />
              <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.1 }}>Track with GPS</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.65 }}>Live route on globe</span>
            </motion.button>

            <motion.button
              onClick={enterPlanning}
              whileTap={{ scale: 0.95 }}
              style={{
                flex: 1, maxWidth: 200, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20,
                padding: "18px 20px", background: "rgba(255,255,255,0.08)", color: "#fff",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "flex-start", gap: 5, backdropFilter: "blur(16px)",
              }}
            >
              <MapPin size={22} strokeWidth={2.2} />
              <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.1 }}>Plan route</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.55 }}>Tap start → finish</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TRACKING: GPS error ─────────────────────────────────────────── */}
      <AnimatePresence>
        {mode === "tracking" && gpsError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: 0, zIndex: 10,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", padding: 28, gap: 16,
            }}
          >
            <span style={{ color: "#f87171", fontWeight: 800, fontSize: 14, textAlign: "center", lineHeight: 1.55 }}>
              {gpsError}
            </span>
            <motion.button
              onClick={() => { setGpsError(null); enableGPS() }}
              whileTap={{ scale: 0.95 }}
              style={{
                border: `1px solid ${ACCENT}`, borderRadius: 14, padding: "11px 28px",
                background: "transparent", color: ACCENT,
                fontWeight: 800, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              Try again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TRACKING: acquiring overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {mode === "tracking" && trackStatus === "acquiring" && !gpsError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)",
              zIndex: 10, pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{
                background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
                borderRadius: 999, padding: "10px 20px",
                display: "flex", alignItems: "center", gap: 10,
                border: `1px solid rgba(107,191,184,0.3)`,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }}
              />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
                Acquiring GPS signal…
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TRACKING: live enable-GPS prompt ───────────────────────────── */}
      <AnimatePresence>
        {mode === "tracking" && trackStatus === "idle" && !gpsError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: "absolute", bottom: "max(160px, calc(env(safe-area-inset-bottom) + 140px))",
              left: "50%", transform: "translateX(-50%)", zIndex: 10,
            }}
          >
            <motion.button
              onClick={enableGPS}
              whileTap={{ scale: 0.95 }}
              style={{
                border: "none", borderRadius: 999, padding: "14px 28px",
                background: ACCENT, color: "#0d1f1e",
                fontWeight: 900, fontSize: 14, fontFamily: "inherit", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: `0 0 24px rgba(107,191,184,0.4)`,
              }}
            >
              <Navigation size={16} strokeWidth={2.5} />
              Allow location
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TRACKING: stats + controls ──────────────────────────────────── */}
      <AnimatePresence>
        {mode === "tracking" && (trackStatus === "tracking" || trackStatus === "paused") && (
          <motion.div
            initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: "max(16px, env(safe-area-inset-bottom))",
            }}
          >
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {([
                { label: "Distance", value: distKm.toFixed(2), unit: "km", Icon: Ruler },
                { label: "Time",     value: fmtTime(elapsed),              unit: "",    Icon: Clock },
                { label: "Pace",     value: fmtPace(distKm, elapsed),      unit: "/km", Icon: ArrowUpRight },
              ] as const).map(({ label, value, unit, Icon }, i) => (
                <div key={label} style={{
                  padding: "14px 8px", textAlign: "center",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                    {value}
                    {unit && <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginLeft: 2 }}>{unit}</span>}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", marginTop: 3 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 10, padding: "12px 18px" }}>
              <motion.button
                onClick={canPause ? togglePause : undefined}
                whileTap={canPause ? { scale: 0.95 } : {}}
                style={{
                  flex: 1, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: "13px",
                  background: "rgba(255,255,255,0.07)", color: "#fff",
                  cursor: canPause ? "pointer" : "default",
                  fontWeight: 900, fontSize: 14, fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: canPause ? 1 : 0.38, transition: "opacity 0.18s",
                }}
              >
                {trackStatus === "paused"
                  ? <><Play  size={16} strokeWidth={2.5} /> Resume</>
                  : <><Pause size={16} strokeWidth={2.5} /> Pause</>}
              </motion.button>
              <motion.button
                onClick={canFinish ? finishTracking : undefined}
                whileTap={canFinish ? { scale: 0.95 } : {}}
                style={{
                  flex: 2, border: "none", borderRadius: 16, padding: "13px",
                  background: canFinish ? ACCENT : "rgba(255,255,255,0.07)",
                  color: canFinish ? "#0d1f1e" : "rgba(255,255,255,0.35)",
                  cursor: canFinish ? "pointer" : "default",
                  fontWeight: 900, fontSize: 14, fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: canFinish ? 1 : 0.38,
                  transition: "background 0.2s, color 0.2s, opacity 0.18s",
                  boxShadow: canFinish ? `0 0 20px rgba(107,191,184,0.3)` : "none",
                }}
              >
                <CheckCircle size={16} strokeWidth={2.5} />
                Finish hike
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PLANNING: instruction pill ──────────────────────────────────── */}
      <AnimatePresence>
        {mode === "planning" && planStep !== "ready" && planStep !== "loading" && (
          <motion.div
            key={planStep}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 10, pointerEvents: "none" }}
          >
            <div style={{
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)",
              borderRadius: 999, padding: "10px 20px",
              display: "flex", alignItems: "center", gap: 9, whiteSpace: "nowrap",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
              {planStep === "start"
                ? <><MapPin size={15} color={GREEN} strokeWidth={2.5} /><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Tap the globe to set your start point</span></>
                : <><Flag   size={15} color={RED}   strokeWidth={2.5} /><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Now tap to set your finish point</span></>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PLANNING: loading */}
      <AnimatePresence>
        {mode === "planning" && planStep === "loading" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 10, pointerEvents: "none" }}
          >
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity }}
              style={{
                background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)",
                borderRadius: 999, padding: "10px 20px", border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ color: BLUE, fontWeight: 700, fontSize: 13 }}>Finding route…</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PLANNING: route info panel ──────────────────────────────────── */}
      <AnimatePresence>
        {mode === "planning" && planStep === "ready" && routeInfo && (
          <motion.div
            initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "rgba(0,0,0,0.78)", backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              padding: "18px 18px",
              paddingBottom: "max(18px, env(safe-area-inset-bottom))",
            }}
          >
            {/* Route legend */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                  {fmtDist(routeInfo.distM)}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", marginTop: 3 }}>Distance</div>
              </div>
              <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                  {fmtWalkTime(routeInfo.durSec)}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.38)", textTransform: "uppercase", marginTop: 3 }}>Walking time</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 18, height: 3, background: BLUE, borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>Route</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <motion.button
                onClick={resetPlan}
                whileTap={{ scale: 0.95 }}
                style={{
                  flex: 1, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: "13px",
                  background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)",
                  fontWeight: 800, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <RotateCcw size={14} strokeWidth={2.5} /> Reset
              </motion.button>
              <motion.button
                onClick={beginHikeFromPlan}
                whileTap={{ scale: 0.95 }}
                style={{
                  flex: 2, border: "none", borderRadius: 16, padding: "13px",
                  background: ACCENT, color: "#0d1f1e",
                  fontWeight: 900, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  boxShadow: `0 0 20px rgba(107,191,184,0.3)`,
                }}
              >
                <Navigation size={14} strokeWidth={2.5} /> Begin hike
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save hike modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSave && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: 0, zIndex: 20,
              background: "rgba(0,0,0,0.8)", backdropFilter: "blur(14px)",
              display: "flex", alignItems: "flex-end",
            }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 290, damping: 30 }}
              style={{
                width: "100%", maxWidth: 560, margin: "0 auto",
                background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px 24px 0 0", padding: "24px 20px",
                paddingBottom: "max(32px, env(safe-area-inset-bottom))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17, color: "#fff" }}>Save your hike</div>
                  {pendingResultRef.current && (
                    <div style={{ fontSize: 12, color: ACCENT, marginTop: 3, fontWeight: 700 }}>
                      {pendingResultRef.current.distKm} km · {fmtDuration(pendingResultRef.current.durationMin)}
                      {pendingResultRef.current.elevationM ? ` · ↑${pendingResultRef.current.elevationM}m` : ""}
                    </div>
                  )}
                </div>
                <button onClick={discardHike} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4, display: "flex" }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6 }}>Trail name</label>
                  <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. Bukit Timah Hill" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6 }}>Location</label>
                  <input value={saveLoc} onChange={e => setSaveLoc(e.target.value)} placeholder="e.g. Bukit Timah Nature Reserve" style={inp} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 6 }}>Notes</label>
                  <textarea value={saveNotes} onChange={e => setSaveNotes(e.target.value)} placeholder="How was it?" rows={2} style={{ ...inp, resize: "none" }} />
                </div>
                <motion.button
                  onClick={saveHike}
                  disabled={saving}
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

      {/* ── Logs history modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowLogs(false) }}
            style={{
              position: "absolute", inset: 0, zIndex: 20,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
              display: "flex", alignItems: "flex-end",
            }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 290, damping: 30 }}
              style={{
                width: "100%", maxWidth: 560, margin: "0 auto",
                background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px 24px 0 0", padding: "20px 18px",
                paddingBottom: "max(24px, env(safe-area-inset-bottom))",
                maxHeight: "80dvh", overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontWeight: 900, fontSize: 17, color: "#fff" }}>Hike logs</div>
                <button onClick={() => setShowLogs(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4, display: "flex" }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              {logsLoading ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", padding: "32px 0", fontSize: 13 }}>Loading…</div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", padding: "32px 0", fontSize: 13 }}>No hikes logged yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {logs.map(log => (
                    <div key={log.id} style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16, padding: "13px 15px",
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.name}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px" }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{log.distanceKm} km</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{fmtDuration(log.durationMin)}</span>
                          {log.elevationM && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>↑{log.elevationM}m</span>}
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{fmtDate(log.loggedAt)}</span>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => deleteLog(log.id)}
                        disabled={deletingId === log.id}
                        whileTap={{ scale: 0.88 }}
                        style={{
                          background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8, padding: "5px 7px", cursor: "pointer",
                          color: "rgba(255,255,255,0.35)", display: "flex", flexShrink: 0,
                          opacity: deletingId === log.id ? 0.3 : 1, transition: "opacity 0.15s",
                        }}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
