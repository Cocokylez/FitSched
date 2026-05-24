"use client"

import "leaflet/dist/leaflet.css"
import type L from "leaflet"
import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Clock, MapPin, TrendingUp, X, Zap } from "lucide-react"
import type { Waypoint } from "@/components/HikeTracker"

// ── Types ─────────────────────────────────────────────────────────────────────

export type HikeDetail = {
  id: string
  name: string
  distanceKm: number
  durationMin: number
  elevationM: number | null
  locationName: string | null
  notes: string | null
  routePoints: Waypoint[] | null
  loggedAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = "#6bbfb8"
const GREEN  = "#4ade80"
const RED    = "#f87171"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPace(distKm: number, durationMin: number): string {
  if (distKm < 0.01) return "--:--"
  const mPerKm = durationMin / distKm
  const m = Math.floor(mPerKm)
  const s = Math.round((mPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  hike: HikeDetail
  onClose: () => void
}

export function HikeRouteDetail({ hike, onClose }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<L.Map | null>(null)

  const points   = Array.isArray(hike.routePoints) ? (hike.routePoints as Waypoint[]) : []
  const hasRoute = points.length >= 2

  // ── Build Leaflet map ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapDivRef.current || !hasRoute) return
    let map: L.Map

    import("leaflet").then(({ default: Lf }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Lf.Icon.Default.prototype as any)._getIconUrl

      map = Lf.map(mapDivRef.current!, {
        zoomControl:       false,
        attributionControl: false,
        dragging:          true,
        scrollWheelZoom:   true,
        doubleClickZoom:   true,
        tapTolerance:      15,
      })

      Lf.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
      }).addTo(map)

      const latlngs = points.map(p => [p.lat, p.lng] as [number, number])

      // ── Route polyline ────────────────────────────────────────────────────────
      const poly = Lf.polyline(latlngs, {
        color:     ACCENT,
        weight:    5,
        opacity:   0.92,
        lineCap:   "round",
        lineJoin:  "round",
      }).addTo(map)

      // Subtle shadow / glow pass (wider, transparent)
      Lf.polyline(latlngs, {
        color:   ACCENT,
        weight:  12,
        opacity: 0.12,
        lineCap: "round",
      }).addTo(map)

      // ── Start marker (green) ──────────────────────────────────────────────────
      Lf.circleMarker(latlngs[0], {
        radius:      9,
        fillColor:   GREEN,
        color:       "#fff",
        weight:      2.5,
        fillOpacity: 1,
      }).addTo(map)

      // ── End marker (red) ──────────────────────────────────────────────────────
      Lf.circleMarker(latlngs[latlngs.length - 1], {
        radius:      9,
        fillColor:   RED,
        color:       "#fff",
        weight:      2.5,
        fillOpacity: 1,
      }).addTo(map)

      map.fitBounds(poly.getBounds(), { padding: [36, 36], animate: false })
      mapRef.current = map
    })

    return () => { map?.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRoute])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "var(--bg)", display: "flex", flexDirection: "column",
        overflowY: "hidden",
      }}
    >

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        padding: "14px 16px 12px",
        background: "var(--panel)", borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 18, fontWeight: 900, color: "var(--text)", lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {hike.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
            {fmtDate(hike.loggedAt)}
            {hike.locationName && (
              <span style={{ opacity: 0.65 }}> · {hike.locationName}</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--text-muted)", padding: 4, display: "flex", flexShrink: 0, marginLeft: 12,
          }}
        >
          <X size={22} strokeWidth={2} />
        </button>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div
        ref={mapDivRef}
        style={{ flex: "0 0 52%", position: "relative", background: "#111918" }}
      >
        {!hasRoute && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 10, color: "rgba(255,255,255,0.28)",
          }}>
            <MapPin size={36} strokeWidth={1.2} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>No GPS route recorded</span>
          </div>
        )}

        {/* ── Legend dots (only when route exists) ──────────────────────────── */}
        {hasRoute && (
          <div style={{
            position: "absolute", bottom: 10, right: 10, zIndex: 999,
            background: "rgba(10,20,18,0.78)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
            padding: "7px 11px",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            {[
              { color: GREEN, label: "Start" },
              { color: RED,   label: "Finish" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "0 0 max(24px, env(safe-area-inset-bottom))",
        background: "var(--panel)",
      }}>

        {/* 3-column stats grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          borderBottom: "1px solid var(--border)",
        }}>
          {[
            { icon: <MapPin   size={15} strokeWidth={2} />, label: "Distance", value: `${hike.distanceKm} km` },
            { icon: <Clock    size={15} strokeWidth={2} />, label: "Time",     value: formatDuration(hike.durationMin) },
            { icon: <Zap      size={15} strokeWidth={2} />, label: "Pace",     value: `${formatPace(hike.distanceKm, hike.durationMin)}/km` },
          ].map(({ icon, label, value }, i) => (
            <div
              key={label}
              style={{
                textAlign: "center", padding: "18px 8px",
                borderRight: i < 2 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", color: ACCENT, marginBottom: 7 }}>
                {icon}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 900, color: "var(--text)",
                lineHeight: 1, fontVariantNumeric: "tabular-nums",
              }}>
                {value}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                color: "var(--text-muted)", textTransform: "uppercase", marginTop: 5,
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Elevation + notes */}
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {hike.elevationM && hike.elevationM > 0 && (
            <div style={{
              background: "var(--surface-2, rgba(128,128,128,0.07))",
              border: "1px solid var(--border)", borderRadius: 14,
              padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <TrendingUp size={20} color={ACCENT} strokeWidth={2} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)" }}>
                  ↑ {hike.elevationM} m
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                  color: "var(--text-muted)", textTransform: "uppercase", marginTop: 3,
                }}>
                  Elevation gain
                </div>
              </div>
            </div>
          )}

          {hike.notes && (
            <div style={{
              background: "var(--surface-2, rgba(128,128,128,0.05))",
              border: "1px solid var(--border)", borderRadius: 14,
              padding: "13px 15px",
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 7,
              }}>
                Notes
              </div>
              <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
                {hike.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
