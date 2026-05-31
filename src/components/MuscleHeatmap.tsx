"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getMuscleGroup } from "@/lib/exerciseData"

// ── Config ────────────────────────────────────────────────────────────────────

type Zone =
  | "chest" | "shoulders" | "biceps" | "abs" | "obliques" | "quads"
  | "traps" | "lats" | "rearDelts" | "triceps" | "lowerBack" | "glutes" | "hamstrings" | "calves"

const UNTOUCHED  = "rgba(141,153,150,0.18)"
const ZONE_STROKE = "rgba(255,255,255,0.05)"

// Map muscle groups → which SVG zones light up on each side.
// Full Body spills across everything (mirrors MuscleRecovery behavior).
const GROUP_TO_FRONT_ZONES: Record<string, Zone[]> = {
  Chest:      ["chest"],
  Shoulders:  ["shoulders"],
  Arms:       ["biceps"],
  Back:       [],
  Core:       ["abs", "obliques"],
  Legs:       ["quads"],
  "Full Body":["chest", "shoulders", "abs", "quads"],
  Cardio:     ["quads"],
}

const GROUP_TO_BACK_ZONES: Record<string, Zone[]> = {
  Chest:      [],
  Shoulders:  ["rearDelts", "traps"],
  Arms:       ["triceps"],
  Back:       ["lats", "traps", "lowerBack"],
  Core:       ["lowerBack"],
  Legs:       ["glutes", "hamstrings", "calves"],
  "Full Body":["lats", "glutes", "hamstrings"],
  Cardio:     ["calves", "hamstrings"],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Mix between yellow (low) and red (high) via ratio 0..1.
// The midpoint reads orange because we lerp in HSL hue (yellow 50° → red 0°)
// rather than RGB, which avoids the muddy brown a naive blend produces.
function colorForRatio(ratio: number): string {
  const t = Math.pow(Math.min(1, Math.max(0, ratio)), 0.7)
  const hue   = 50 + (5  - 50) * t
  const sat   = 90 + (80 - 90) * t
  const light = 55 + (52 - 55) * t
  return `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${light.toFixed(1)}%)`
}

function pickLog<T extends { date?: string; completedAt: string }>(logs: T[]): T | null {
  if (logs.length === 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const sortedByRecent = [...logs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  )
  const todayLog = sortedByRecent.find(l => (l.date || "") === todayId)
  return todayLog ?? sortedByRecent[0]
}

function aggregateSetsByGroup(log: { exercises: { name: string; sets: number }[] }) {
  const byGroup: Record<string, number> = {}
  for (const ex of log.exercises || []) {
    const g = getMuscleGroup(ex.name)
    byGroup[g] = (byGroup[g] ?? 0) + (Number(ex.sets) || 0)
  }
  return byGroup
}

function buildZoneIntensity(byGroup: Record<string, number>) {
  const front: Partial<Record<Zone, number>> = {}
  const back:  Partial<Record<Zone, number>> = {}

  for (const [group, sets] of Object.entries(byGroup)) {
    if (sets <= 0) continue
    const f = GROUP_TO_FRONT_ZONES[group] || []
    const b = GROUP_TO_BACK_ZONES[group]  || []
    f.forEach(z => { front[z] = Math.max(front[z] ?? 0, sets) })
    b.forEach(z => { back[z]  = Math.max(back[z]  ?? 0, sets) })
  }

  return { front, back }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  logs: Array<{
    date?: string
    completedAt: string
    workoutName: string
    exercises: Array<{ name: string; sets: number; reps: number }>
  }>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MuscleHeatmap({ logs }: Props) {
  const [side, setSide] = useState<"front" | "back">("front")

  const { log, front, back, isToday, peakSets } = useMemo(() => {
    const empty: Partial<Record<Zone, number>> = {}
    const log = pickLog(logs)
    if (!log) return { log: null, front: empty, back: empty, isToday: false, peakSets: 0 }

    const byGroup = aggregateSetsByGroup(log)
    const peak = Math.max(0, ...Object.values(byGroup))

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const isToday = (log.date || "") === todayId

    const { front, back } = buildZoneIntensity(byGroup)
    return { log, front, back, isToday, peakSets: peak }
  }, [logs])

  const zoneFill = (zone: Zone): string => {
    const map = side === "front" ? front : back
    const sets = map[zone]
    if (!sets || peakSets === 0) return UNTOUCHED
    return colorForRatio(sets / peakSets)
  }

  if (!log) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
        No workout logged yet — your muscle map will appear after your first session.
      </div>
    )
  }

  const headline = isToday
    ? `Today: ${log.workoutName}`
    : `Last workout: ${log.workoutName}`

  return (
    <div>
      {/* Header + flip toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
          {headline}
        </div>
        <button
          onClick={() => setSide(s => (s === "front" ? "back" : "front"))}
          style={{
            background: "var(--surface-2, rgba(255,255,255,0.04))",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "5px 11px",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          {side === "front" ? "FRONT ↺" : "BACK ↺"}
        </button>
      </div>

      {/* Silhouette */}
      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}>
        <AnimatePresence mode="wait">
          <motion.svg
            key={side}
            initial={{ opacity: 0, rotateY: -25 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 25 }}
            transition={{ duration: 0.22 }}
            viewBox="0 0 200 340"
            style={{ width: "min(220px, 80%)", height: "auto", display: "block" }}
          >
            {side === "front" ? (
              <FrontBody zoneFill={zoneFill} />
            ) : (
              <BackBody zoneFill={zoneFill} />
            )}
          </motion.svg>
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 }}>
        <LegendDot color="#f5b400" label="Light" />
        <div style={{
          width: 60,
          height: 6,
          borderRadius: 999,
          background: "linear-gradient(to right, #f5b400, #e85555)",
        }} />
        <LegendDot color="#e85555" label="Target" />
      </div>
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.04em" }}>{label}</span>
    </div>
  )
}

function FrontBody({ zoneFill }: { zoneFill: (z: Zone) => string }) {
  const s = ZONE_STROKE
  return (
    <g>
      {/* Head */}
      <circle cx="100" cy="32" r="18" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />
      {/* Neck */}
      <rect x="94" y="48" width="12" height="10" rx="3" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />

      {/* Shoulders (both delts) */}
      <ellipse cx="68"  cy="74" rx="14" ry="11" fill={zoneFill("shoulders")} stroke={s} strokeWidth="0.8" />
      <ellipse cx="132" cy="74" rx="14" ry="11" fill={zoneFill("shoulders")} stroke={s} strokeWidth="0.8" />

      {/* Chest (two pecs) */}
      <path
        d="M82 70 Q100 64 118 70 L118 102 Q100 110 82 102 Z"
        fill={zoneFill("chest")}
        stroke={s}
        strokeWidth="0.8"
      />

      {/* Biceps */}
      <ellipse cx="58"  cy="108" rx="9"  ry="20" fill={zoneFill("biceps")} stroke={s} strokeWidth="0.8" />
      <ellipse cx="142" cy="108" rx="9"  ry="20" fill={zoneFill("biceps")} stroke={s} strokeWidth="0.8" />

      {/* Forearms (untracked — neutral fill) */}
      <ellipse cx="54"  cy="148" rx="7" ry="18" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />
      <ellipse cx="146" cy="148" rx="7" ry="18" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />

      {/* Abs (rectus) */}
      <path
        d="M86 112 L114 112 L112 178 L88 178 Z"
        fill={zoneFill("abs")}
        stroke={s}
        strokeWidth="0.8"
      />

      {/* Obliques */}
      <path d="M78 116 L86 116 L88 172 L78 168 Z" fill={zoneFill("obliques")} stroke={s} strokeWidth="0.8" />
      <path d="M122 116 L114 116 L112 172 L122 168 Z" fill={zoneFill("obliques")} stroke={s} strokeWidth="0.8" />

      {/* Hips (neutral) */}
      <path d="M76 180 L124 180 L120 204 L80 204 Z" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />

      {/* Quads */}
      <path d="M78 206 L98 206 L94 282 L80 282 Z" fill={zoneFill("quads")} stroke={s} strokeWidth="0.8" />
      <path d="M122 206 L102 206 L106 282 L120 282 Z" fill={zoneFill("quads")} stroke={s} strokeWidth="0.8" />

      {/* Shins (neutral) */}
      <ellipse cx="86"  cy="306" rx="7" ry="18" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />
      <ellipse cx="114" cy="306" rx="7" ry="18" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />
    </g>
  )
}

function BackBody({ zoneFill }: { zoneFill: (z: Zone) => string }) {
  const s = ZONE_STROKE
  return (
    <g>
      {/* Head */}
      <circle cx="100" cy="32" r="18" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />
      {/* Neck */}
      <rect x="94" y="48" width="12" height="10" rx="3" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />

      {/* Traps (upper back triangle) */}
      <path
        d="M82 60 L118 60 L122 88 L78 88 Z"
        fill={zoneFill("traps")}
        stroke={s}
        strokeWidth="0.8"
      />

      {/* Rear delts */}
      <ellipse cx="64"  cy="78" rx="12" ry="10" fill={zoneFill("rearDelts")} stroke={s} strokeWidth="0.8" />
      <ellipse cx="136" cy="78" rx="12" ry="10" fill={zoneFill("rearDelts")} stroke={s} strokeWidth="0.8" />

      {/* Lats (V-taper) */}
      <path
        d="M78 90 L122 90 L116 156 L84 156 Z"
        fill={zoneFill("lats")}
        stroke={s}
        strokeWidth="0.8"
      />

      {/* Triceps */}
      <ellipse cx="58"  cy="108" rx="9" ry="20" fill={zoneFill("triceps")} stroke={s} strokeWidth="0.8" />
      <ellipse cx="142" cy="108" rx="9" ry="20" fill={zoneFill("triceps")} stroke={s} strokeWidth="0.8" />

      {/* Forearms (neutral) */}
      <ellipse cx="54"  cy="148" rx="7" ry="18" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />
      <ellipse cx="146" cy="148" rx="7" ry="18" fill="rgba(141,153,150,0.10)" stroke={s} strokeWidth="0.8" />

      {/* Lower back (spinal erectors) */}
      <path
        d="M88 158 L112 158 L110 184 L90 184 Z"
        fill={zoneFill("lowerBack")}
        stroke={s}
        strokeWidth="0.8"
      />

      {/* Glutes */}
      <path
        d="M76 186 L100 186 L98 222 L80 222 Z"
        fill={zoneFill("glutes")}
        stroke={s}
        strokeWidth="0.8"
      />
      <path
        d="M124 186 L100 186 L102 222 L120 222 Z"
        fill={zoneFill("glutes")}
        stroke={s}
        strokeWidth="0.8"
      />

      {/* Hamstrings */}
      <path d="M80 224 L98 224 L94 280 L84 280 Z" fill={zoneFill("hamstrings")} stroke={s} strokeWidth="0.8" />
      <path d="M120 224 L102 224 L106 280 L116 280 Z" fill={zoneFill("hamstrings")} stroke={s} strokeWidth="0.8" />

      {/* Calves */}
      <ellipse cx="86"  cy="304" rx="8" ry="20" fill={zoneFill("calves")} stroke={s} strokeWidth="0.8" />
      <ellipse cx="114" cy="304" rx="8" ry="20" fill={zoneFill("calves")} stroke={s} strokeWidth="0.8" />
    </g>
  )
}
