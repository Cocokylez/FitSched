"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { Flag, History, MapPin, Navigation, RotateCcw, Trash2, X } from "lucide-react"
import { HikeTracker } from "@/components/HikeTracker"
import type { TrackerResult } from "@/components/HikeTracker"
import { playSound } from "@/lib/sound"

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = "#6bbfb8"
const GREEN  = "#4ade80"
const RED    = "#f87171"
const BLUE   = "#60a5fa"

const GLOBE_IMG = "//unpkg.com/three-globe/example/img/earth-day.jpg"
const GLOBE_BG  = "//unpkg.com/three-globe/example/img/night-sky.png"

// ── Globe (no SSR) ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false }) as any

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode     = "idle" | "planning"
type PlanStep = "start" | "end" | "loading" | "ready"

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
  const globeRef    = useRef<any>(null)
  const [globeReady, setGlobeReady] = useState(false)
  const [winSize, setWinSize]       = useState({ w: 0, h: 0 })

  // Mode
  const [mode, setMode] = useState<Mode>("idle")

  // GPS tracker overlay + cinematic transition
  const [showTracker, setShowTracker]   = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(false)

  // Plan mode
  const planStepRef  = useRef<PlanStep>("start")
  const planStartRef = useRef<{ lat: number; lng: number } | null>(null)
  const [planStep, setPlanStep]   = useState<PlanStep>("start")
  const [planStart, setPlanStart] = useState<{ lat: number; lng: number } | null>(null)
  const [planEnd, setPlanEnd]     = useState<{ lat: number; lng: number } | null>(null)
  const [planPath, setPlanPath]   = useState<[number, number][]>([])
  const [routeInfo, setRouteInfo] = useState<{ distM: number; durSec: number } | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)

  // Save form (after tracker finishes)
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

  // ── Window size ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const update = () => setWinSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // ── Globe controls ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!globeReady || !globeRef.current) return
    const controls = globeRef.current.controls()
    controls.autoRotate      = mode === "idle" && !showTracker && !showSave && !overlayVisible
    controls.autoRotateSpeed = 0.4
    controls.enableZoom      = mode === "planning"
    controls.enablePan       = false
  }, [mode, globeReady, showTracker, showSave, overlayVisible])

  // ── Hide nav bar for entire hike page ────────────────────────────────────────

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hike-tracker-change", { detail: { open: true } }))
    return () => { window.dispatchEvent(new CustomEvent("hike-tracker-change", { detail: { open: false } })) }
  }, [])

  // ── Mode transitions ─────────────────────────────────────────────────────────

  function enterPlanning() {
    setMode("planning")
    planStepRef.current  = "start"
    planStartRef.current = null
    setPlanStep("start"); setPlanStart(null); setPlanEnd(null)
    setPlanPath([]); setRouteInfo(null); setPlanError(null)
    if (globeRef.current) globeRef.current.pointOfView({ altitude: 2.5 }, 1000)
  }

  function backToIdle() {
    setMode("idle")
    if (globeRef.current) globeRef.current.pointOfView({ altitude: 2.5 }, 1000)
  }

  // ── Plan mode: globe click ────────────────────────────────────────────────────

  const handleGlobeClick = useCallback(async ({ lat, lng }: { lat: number; lng: number }) => {
    if (mode !== "planning") return

    if (planStepRef.current === "start") {
      planStartRef.current = { lat, lng }
      planStepRef.current  = "end"
      setPlanStart({ lat, lng }); setPlanStep("end")

    } else if (planStepRef.current === "end") {
      const start = planStartRef.current!
      planStepRef.current = "loading"
      setPlanEnd({ lat, lng }); setPlanStep("loading")

      try {
        const res = await fetch(
          `/api/hike/route?slat=${start.lat}&slng=${start.lng}&elat=${lat}&elng=${lng}`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data.code !== "Ok" || !data.routes?.[0]) throw new Error()

        const route  = data.routes[0]
        const coords = (route.geometry.coordinates as [number, number][]).map(([lo, la]) => [la, lo] as [number, number])
        setPlanPath(coords)
        setRouteInfo({ distM: route.distance, durSec: route.duration })
        setPlanStep("ready")

        if (globeRef.current && coords.length > 0) {
          const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1])
          const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
          const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
          globeRef.current.pointOfView({ lat: midLat, lng: midLng, altitude: 0.1 }, 1200)
        }
      } catch {
        setPlanError("Couldn't find a walking route between those points.")
        planStepRef.current = "end"; setPlanStep("end")
      }
    }
  }, [mode])

  function resetPlan() {
    planStepRef.current = "start"; planStartRef.current = null
    setPlanStep("start"); setPlanStart(null); setPlanEnd(null)
    setPlanPath([]); setRouteInfo(null); setPlanError(null)
  }

  function beginHikeFromPlan() {
    resetPlan(); backToIdle()
    enterTrackingMode()
  }

  // ── Cinematic transitions ─────────────────────────────────────────────────────

  function enterTrackingMode() {
    // Start zooming in immediately (no perceived delay)
    if (globeRef.current) globeRef.current.pointOfView({ altitude: 0.002 }, 1100)

    // Race GPS against a 400ms window — if it wins, redirect the zoom to the real location
    if (navigator.geolocation) {
      const overlayTimer = setTimeout(() => setOverlayVisible(true), 450)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Got real coords — steer the globe there before the overlay covers it
          if (globeRef.current) {
            globeRef.current.pointOfView(
              { lat: pos.coords.latitude, lng: pos.coords.longitude, altitude: 0.002 },
              900
            )
          }
          clearTimeout(overlayTimer)
          setTimeout(() => setOverlayVisible(true), 380)
        },
        () => {}, // fallback: keep original zoom-to-nowhere
        { enableHighAccuracy: false, timeout: 400, maximumAge: 60000 }
      )
    } else {
      setTimeout(() => setOverlayVisible(true), 450)
    }

    setTimeout(() => setShowTracker(true), 820)
    setTimeout(() => setOverlayVisible(false), 1040)
  }

  function handleTrackerClose() {
    // 1. Fade overlay in to hide street map
    setOverlayVisible(true)
    // 2. Unmount tracker, zoom globe back out
    setTimeout(() => {
      setShowTracker(false)
      if (globeRef.current) globeRef.current.pointOfView({ altitude: 2.5 }, 1400)
    }, 360)
    // 3. Fade overlay out to reveal globe zooming out
    setTimeout(() => setOverlayVisible(false), 560)
  }

  function handleTrackerFinish(result: TrackerResult) {
    playSound("confirmation_001.ogg", 0.65)
    pendingResultRef.current = result
    // Quick fade to swap tracker → save form
    setOverlayVisible(true)
    setTimeout(() => {
      setShowTracker(false)
      setShowSave(true)
      setOverlayVisible(false)
    }, 300)
  }

  // ── Save hike ─────────────────────────────────────────────────────────────────

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
          distanceKm:   r.distanceKm,
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
      }
    } finally { setSaving(false) }
  }

  function discardHike() {
    setShowSave(false)
    pendingResultRef.current = null
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

  const planPoints = useMemo(() => {
    const pts = []
    if (planStart) pts.push({ lat: planStart.lat, lng: planStart.lng, color: GREEN, size: 0.35, label: "Start"  })
    if (planEnd)   pts.push({ lat: planEnd.lat,   lng: planEnd.lng,   color: RED,   size: 0.35, label: "Finish" })
    return pts
  }, [planStart, planEnd])

  const planArcs = useMemo(() => {
    if (planPath.length < 2) return []
    return planPath.slice(0, -1).map((pt, i) => ({
      startLat: pt[0], startLng: pt[1],
      endLat: planPath[i + 1][0], endLng: planPath[i + 1][1],
      color: BLUE,
    }))
  }, [planPath])

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
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: winSize.w, height: winSize.h, overflow: "hidden",
        }}>
          <Globe
            ref={globeRef}
            width={winSize.w}
            height={winSize.h}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl={GLOBE_IMG}
            backgroundImageUrl={GLOBE_BG}
            atmosphereColor="rgba(147,210,255,0.45)"
            atmosphereAltitude={0.2}
            pointsData={planPoints}
            pointColor="color"
            pointRadius="size"
            pointAltitude={0.005}
            pointLabel="label"
            arcsData={planArcs}
            arcColor="color"
            arcAltitude={0.003}
            arcStroke={1.6}
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={0}
            onGlobeReady={() => setGlobeReady(true)}
            onGlobeClick={handleGlobeClick}
            enablePointerInteraction={mode === "planning"}
          />
        </div>
      )}

      {/* ── Logs button (idle only) ─────────────────────────────────────── */}
      {mode === "idle" && !showTracker && !showSave && (
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

      {/* ── Back button (planning) ──────────────────────────────────────── */}
      {mode === "planning" && (
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
        {mode === "idle" && (!showTracker || overlayVisible) && !showSave && !showLogs && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            style={{
              position: "absolute",
              bottom: "max(36px, env(safe-area-inset-bottom))",
              left: 0, right: 0,
              display: "flex", justifyContent: "center",
              gap: 12, padding: "0 24px",
            }}
          >
            <motion.button
              onClick={enterTrackingMode}
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
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.65 }}>Street-level map</span>
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

      {/* PLANNING: error */}
      <AnimatePresence>
        {mode === "planning" && planError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 10, pointerEvents: "none" }}
          >
            <div style={{
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)",
              borderRadius: 999, padding: "10px 20px", border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <span style={{ color: RED, fontWeight: 700, fontSize: 13 }}>{planError}</span>
            </div>
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
                onClick={resetPlan} whileTap={{ scale: 0.95 }}
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
                onClick={beginHikeFromPlan} whileTap={{ scale: 0.95 }}
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

      {/* ── HikeTracker overlay (street-level Leaflet map) ──────────────── */}
      {showTracker && (
        <HikeTracker
          onFinish={handleTrackerFinish}
          onClose={handleTrackerClose}
          disableNavEvent
        />
      )}

      {/* ── Cinematic transition overlay ────────────────────────────────── */}
      <motion.div
        animate={{ opacity: overlayVisible ? 1 : 0 }}
        transition={{ duration: 0.32, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0, zIndex: 310,
          background: "#000", pointerEvents: "none",
        }}
      />

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
                      {pendingResultRef.current.distanceKm} km · {fmtDuration(pendingResultRef.current.durationMin)}
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

      {/* ── Logs modal ──────────────────────────────────────────────────── */}
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
