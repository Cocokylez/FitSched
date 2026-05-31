"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { getMuscleGroup } from "@/lib/exerciseData"
import { useLanguage } from "@/context/LanguageContext"

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

// ── Combo image table ────────────────────────────────────────────────────────
//
// Pre-rendered body diagrams for the four canonical combo workouts.
// `filenameBase` matches the on-disk asset name in public/muscle/.
// File pattern: /muscle/{filenameBase}-{front|back}.png
// `groups` are the muscle-group labels (from exerciseData.ts) the combo targets.
//
type ComboDef = { id: string; filenameBase: string; groups: string[] }

const COMBOS: ComboDef[] = [
  { id: "chest-tricep",  filenameBase: "chest and tricep",  groups: ["Chest", "Arms"]    },
  { id: "back-bicep",    filenameBase: "Back & Biceps",     groups: ["Back",  "Arms"]    },
  { id: "shoulder-core", filenameBase: "Shoulders & Core",  groups: ["Shoulders", "Core"] },
  { id: "arms-core",     filenameBase: "Arms & Core",       groups: ["Arms",  "Core"]    },
]

// Score each combo by total sets across its target groups.
// Returns the highest-scoring combo, or null when nothing was hit (or only
// non-combo groups like Legs/Full Body were trained — those fall back to SVG).
function detectCombo(byGroup: Record<string, number>): ComboDef | null {
  let best: { combo: ComboDef; score: number } | null = null
  for (const combo of COMBOS) {
    const score = combo.groups.reduce((sum, g) => sum + (byGroup[g] ?? 0), 0)
    if (score > 0 && (!best || score > best.score)) best = { combo, score }
  }
  return best?.combo ?? null
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
  const { t } = useLanguage()
  const [side, setSide] = useState<"front" | "back">("front")
  const [imgError, setImgError] = useState(false)

  const { log, front, back, isToday, peakSets, combo } = useMemo(() => {
    const empty: Partial<Record<Zone, number>> = {}
    const log = pickLog(logs)
    if (!log) return { log: null, front: empty, back: empty, isToday: false, peakSets: 0, combo: null as ComboDef | null }

    const byGroup = aggregateSetsByGroup(log)
    const peak = Math.max(0, ...Object.values(byGroup))
    const combo = detectCombo(byGroup)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const isToday = (log.date || "") === todayId

    const { front, back } = buildZoneIntensity(byGroup)
    return { log, front, back, isToday, peakSets: peak, combo }
  }, [logs])

  // Reset image-error state whenever the combo or side changes so a fresh
  // <img> request is attempted before falling back to the SVG.
  useEffect(() => {
    setImgError(false)
  }, [combo?.id, side])

  const zoneFill = (zone: Zone): string => {
    const map = side === "front" ? front : back
    const sets = map[zone]
    if (!sets || peakSets === 0) return UNTOUCHED
    return colorForRatio(sets / peakSets)
  }

  if (!log) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
        {t.noMuscleMapYet}
      </div>
    )
  }

  // Translate well-known combo workout names (Chest & Triceps, etc.); custom
  // names that don't match the map fall through to whatever was saved.
  const nameMap = t.workoutNames as Record<string, string> | undefined
  const translatedName = nameMap?.[log.workoutName] ?? log.workoutName
  const headline = isToday
    ? `${t.todayLabel}: ${translatedName}`
    : `${t.lastWorkoutLabel}: ${translatedName}`

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

      {/* Glow keyframes — soft pulsing green + yellow drop-shadow follows
          the transparent-PNG alpha edge, so the highlighted muscles read as
          active even though the filter isn't color-isolated. */}
      <style>{`
        @keyframes muscleGlowPulse {
          0%, 100% {
            filter:
              drop-shadow(0 0 4px rgba(80, 220, 100, 0.35))
              drop-shadow(0 0 8px rgba(230, 200, 50, 0.20));
          }
          50% {
            filter:
              drop-shadow(0 0 12px rgba(80, 220, 100, 0.70))
              drop-shadow(0 0 22px rgba(230, 200, 50, 0.45));
          }
        }
      `}</style>

      {/* Body — combo image when one matches and loads, SVG heatmap otherwise */}
      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}>
        <AnimatePresence mode="wait">
          {combo && !imgError ? (
            <motion.img
              key={`${combo.id}-${side}`}
              src={`/muscle/${encodeURIComponent(combo.filenameBase)}-${side}.png`}
              alt={`${combo.filenameBase} ${side} view`}
              onError={() => setImgError(true)}
              initial={{ opacity: 0, rotateY: -25 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 25 }}
              transition={{ duration: 0.22 }}
              style={{
                width: "min(220px, 80%)",
                height: "auto",
                display: "block",
                animation: "muscleGlowPulse 2.4s ease-in-out infinite",
              }}
            />
          ) : (
            <motion.svg
              key={side}
              initial={{ opacity: 0, rotateY: -25 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 25 }}
              transition={{ duration: 0.22 }}
              viewBox="0 0 220 420"
              style={{ width: "min(220px, 80%)", height: "auto", display: "block" }}
            >
              {side === "front" ? (
                <FrontBody zoneFill={zoneFill} />
              ) : (
                <BackBody zoneFill={zoneFill} />
              )}
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* Legend — combo legend (green/yellow) when image renders, ramp legend for SVG fallback */}
      {combo && !imgError ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 4 }}>
          <LegendDot color="#3fa84a" label={t.primaryLabel} />
          <LegendDot color="#e8c029" label={t.secondaryLabel} />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 }}>
          <LegendDot color="#f5b400" label={t.lightLabel} />
          <div style={{
            width: 60,
            height: 6,
            borderRadius: 999,
            background: "linear-gradient(to right, #f5b400, #e85555)",
          }} />
          <LegendDot color="#e85555" label={t.targetLabel} />
        </div>
      )}
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

// ── SVG body data ─────────────────────────────────────────────────────────────
//
// All paths are designed for viewBox 220×420. Center line = x:110.
// Anatomy reference: stylized fitness chart (head→shoulder slope→narrow waist
// →hip flare→thigh→knee→calf→foot). Each side mirrors across the center.
//
// Rendering order per side:
//   1. Body envelope (head, torso, arms, legs) — neutral fog
//   2. Neutral scaffolding (forearms, shins, hands, feet) — drawn into envelope
//   3. Tracked muscle zones — filled by zoneFill(), sit on top
//

const BODY_BACKDROP = "rgba(141,153,150,0.12)"
const BODY_STROKE   = "rgba(255,255,255,0.16)"
const NEUTRAL_FILL  = "rgba(141,153,150,0.18)"

function FrontBody({ zoneFill }: { zoneFill: (z: Zone) => string }) {
  const s = ZONE_STROKE
  return (
    <g>
      {/* ── 1. Body envelope ─────────────────────────────────────────── */}
      {/* Head */}
      <circle cx="110" cy="32" r="20" fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1" />
      {/* Neck */}
      <path d="M100 51 L120 51 L122 65 L98 65 Z" fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1" />
      {/* Torso (shoulders → waist → hips) */}
      <path
        d="M62 78 C 78 70, 96 65, 110 65 C 124 65, 142 70, 158 78
           C 168 88, 170 100, 168 116
           L 164 142
           C 158 162, 150 178, 148 188
           C 150 208, 156 222, 158 234
           L 62 234
           C 64 222, 70 208, 72 188
           C 70 178, 62 162, 56 142
           L 52 116
           C 50 100, 52 88, 62 78 Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />
      {/* Right arm envelope */}
      <path
        d="M168 92 C 178 102, 184 116, 183 134
           C 181 154, 178 175, 175 196
           C 173 212, 170 224, 167 232
           C 168 240, 162 244, 156 240
           L 152 232
           C 154 218, 156 200, 156 184
           C 156 168, 156 152, 156 138
           L 156 116
           Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />
      {/* Left arm envelope (mirror) */}
      <path
        d="M52 92 C 42 102, 36 116, 37 134
           C 39 154, 42 175, 45 196
           C 47 212, 50 224, 53 232
           C 52 240, 58 244, 64 240
           L 68 232
           C 66 218, 64 200, 64 184
           C 64 168, 64 152, 64 138
           L 64 116
           Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />
      {/* Right leg envelope */}
      <path
        d="M114 234 L158 234
           C 160 258, 160 295, 158 325
           L 156 345
           C 155 365, 156 388, 156 405
           C 156 412, 150 415, 142 414
           L 122 412
           C 117 410, 115 405, 115 398
           L 113 345
           L 112 320
           Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />
      {/* Left leg envelope (mirror) */}
      <path
        d="M106 234 L62 234
           C 60 258, 60 295, 62 325
           L 64 345
           C 65 365, 64 388, 64 405
           C 64 412, 70 415, 78 414
           L 98 412
           C 103 410, 105 405, 105 398
           L 107 345
           L 108 320
           Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />

      {/* ── 2. Tracked muscle zones (front) ──────────────────────────── */}

      {/* Deltoids — anterior caps with shoulder slope */}
      <path
        d="M62 78 C 56 86, 53 96, 54 110 C 64 110, 72 105, 78 96 C 76 86, 70 80, 62 78 Z"
        fill={zoneFill("shoulders")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M158 78 C 164 86, 167 96, 166 110 C 156 110, 148 105, 142 96 C 144 86, 150 80, 158 78 Z"
        fill={zoneFill("shoulders")} stroke={s} strokeWidth="0.8"
      />

      {/* Pectorals — two distinct ovals with center gap */}
      <path
        d="M82 76 C 76 82, 73 96, 76 112 C 80 124, 95 130, 106 124 L 108 92 C 104 80, 94 74, 82 76 Z"
        fill={zoneFill("chest")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M138 76 C 144 82, 147 96, 144 112 C 140 124, 125 130, 114 124 L 112 92 C 116 80, 126 74, 138 76 Z"
        fill={zoneFill("chest")} stroke={s} strokeWidth="0.8"
      />

      {/* Biceps — bulged narrowing into elbow */}
      <path
        d="M50 100 C 44 116, 42 138, 46 158 C 52 162, 58 160, 60 152 C 62 138, 62 118, 58 102 C 54 99, 51 99, 50 100 Z"
        fill={zoneFill("biceps")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M170 100 C 176 116, 178 138, 174 158 C 168 162, 162 160, 160 152 C 158 138, 158 118, 162 102 C 166 99, 169 99, 170 100 Z"
        fill={zoneFill("biceps")} stroke={s} strokeWidth="0.8"
      />

      {/* Forearms — taper from elbow to wrist (neutral, untracked) */}
      <path
        d="M44 160 C 41 180, 43 200, 47 220 C 51 222, 55 220, 56 214 C 56 196, 56 178, 54 162 Z"
        fill={NEUTRAL_FILL} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M176 160 C 179 180, 177 200, 173 220 C 169 222, 165 220, 164 214 C 164 196, 164 178, 166 162 Z"
        fill={NEUTRAL_FILL} stroke={s} strokeWidth="0.8"
      />

      {/* Abdominals — 6-pack grid (3 rows × 2 cols) */}
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect x="93"  y={130 + row * 16} width="11" height="13" rx="2.5"
                fill={zoneFill("abs")} stroke={s} strokeWidth="0.8" />
          <rect x="106" y={130 + row * 16} width="11" height="13" rx="2.5"
                fill={zoneFill("abs")} stroke={s} strokeWidth="0.8" />
        </g>
      ))}

      {/* Obliques — flank the abs */}
      <path
        d="M80 132 C 76 148, 76 166, 80 182 C 84 184, 90 182, 91 176 L 91 138 C 88 132, 84 130, 80 132 Z"
        fill={zoneFill("obliques")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M140 132 C 144 148, 144 166, 140 182 C 136 184, 130 182, 129 176 L 129 138 C 132 132, 136 130, 140 132 Z"
        fill={zoneFill("obliques")} stroke={s} strokeWidth="0.8"
      />

      {/* Quads — outer (vastus lateralis) + inner (vastus medialis) per leg */}
      <path
        d="M118 244 C 124 270, 128 300, 128 328 C 124 334, 118 334, 115 326 C 114 300, 113 270, 114 244 Z"
        fill={zoneFill("quads")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M150 244 C 152 270, 150 305, 146 330 C 142 334, 137 332, 136 326 C 134 300, 134 270, 138 244 Z"
        fill={zoneFill("quads")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M102 244 C 96 270, 92 300, 92 328 C 96 334, 102 334, 105 326 C 106 300, 107 270, 106 244 Z"
        fill={zoneFill("quads")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M70 244 C 68 270, 70 305, 74 330 C 78 334, 83 332, 84 326 C 86 300, 86 270, 82 244 Z"
        fill={zoneFill("quads")} stroke={s} strokeWidth="0.8"
      />

      {/* Shins (tibialis anterior) — slim, neutral fill */}
      <path
        d="M120 352 C 122 370, 124 388, 124 402 C 121 404, 118 403, 117 398 L 116 352 Z"
        fill={NEUTRAL_FILL} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M100 352 C 98 370, 96 388, 96 402 C 99 404, 102 403, 103 398 L 104 352 Z"
        fill={NEUTRAL_FILL} stroke={s} strokeWidth="0.8"
      />
    </g>
  )
}

function BackBody({ zoneFill }: { zoneFill: (z: Zone) => string }) {
  const s = ZONE_STROKE
  return (
    <g>
      {/* ── 1. Body envelope (same outline as front) ─────────────────── */}
      {/* Head */}
      <circle cx="110" cy="32" r="20" fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1" />
      {/* Neck */}
      <path d="M100 51 L120 51 L122 65 L98 65 Z" fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1" />
      {/* Torso */}
      <path
        d="M62 78 C 78 70, 96 65, 110 65 C 124 65, 142 70, 158 78
           C 168 88, 170 100, 168 116
           L 164 142
           C 158 162, 150 178, 148 188
           C 150 208, 156 222, 158 234
           L 62 234
           C 64 222, 70 208, 72 188
           C 70 178, 62 162, 56 142
           L 52 116
           C 50 100, 52 88, 62 78 Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />
      {/* Arms */}
      <path
        d="M168 92 C 178 102, 184 116, 183 134
           C 181 154, 178 175, 175 196
           C 173 212, 170 224, 167 232
           C 168 240, 162 244, 156 240
           L 152 232
           C 154 218, 156 200, 156 184
           C 156 168, 156 152, 156 138
           L 156 116
           Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />
      <path
        d="M52 92 C 42 102, 36 116, 37 134
           C 39 154, 42 175, 45 196
           C 47 212, 50 224, 53 232
           C 52 240, 58 244, 64 240
           L 68 232
           C 66 218, 64 200, 64 184
           C 64 168, 64 152, 64 138
           L 64 116
           Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />
      {/* Legs */}
      <path
        d="M114 234 L158 234
           C 160 258, 160 295, 158 325
           L 156 345
           C 155 365, 156 388, 156 405
           C 156 412, 150 415, 142 414
           L 122 412
           C 117 410, 115 405, 115 398
           L 113 345
           L 112 320
           Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />
      <path
        d="M106 234 L62 234
           C 60 258, 60 295, 62 325
           L 64 345
           C 65 365, 64 388, 64 405
           C 64 412, 70 415, 78 414
           L 98 412
           C 103 410, 105 405, 105 398
           L 107 345
           L 108 320
           Z"
        fill={BODY_BACKDROP} stroke={BODY_STROKE} strokeWidth="1"
      />

      {/* ── 2. Tracked muscle zones (back) ──────────────────────────── */}

      {/* Trapezius — diamond/kite from neck base widening to shoulders, tapering down */}
      <path
        d="M110 66 C 96 70, 78 80, 62 92 C 70 100, 92 108, 110 110 C 128 108, 150 100, 158 92 C 142 80, 124 70, 110 66 Z"
        fill={zoneFill("traps")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M88 108 C 96 116, 110 120, 110 132 C 110 120, 124 116, 132 108 C 124 114, 110 116, 110 116 C 110 116, 96 114, 88 108 Z"
        fill={zoneFill("traps")} stroke={s} strokeWidth="0.8"
      />

      {/* Rear deltoids — small caps tucked behind */}
      <path
        d="M52 100 C 48 110, 47 122, 52 132 C 60 132, 66 126, 68 118 C 66 108, 60 102, 52 100 Z"
        fill={zoneFill("rearDelts")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M168 100 C 172 110, 173 122, 168 132 C 160 132, 154 126, 152 118 C 154 108, 160 102, 168 100 Z"
        fill={zoneFill("rearDelts")} stroke={s} strokeWidth="0.8"
      />

      {/* Latissimus dorsi — V-taper wings */}
      <path
        d="M70 116 C 74 138, 80 158, 88 174 C 96 178, 105 178, 108 170 L 108 130 C 96 124, 82 118, 70 116 Z"
        fill={zoneFill("lats")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M150 116 C 146 138, 140 158, 132 174 C 124 178, 115 178, 112 170 L 112 130 C 124 124, 138 118, 150 116 Z"
        fill={zoneFill("lats")} stroke={s} strokeWidth="0.8"
      />

      {/* Triceps — horseshoe shape (suggested three heads via slight inset) */}
      <path
        d="M50 100 C 44 116, 42 138, 46 158 C 52 162, 58 160, 60 152 C 62 138, 62 118, 58 102 C 54 99, 51 99, 50 100 Z M 50 122 C 48 130, 48 145, 50 152 L 54 152 C 56 140, 56 125, 54 118 Z"
        fill={zoneFill("triceps")} stroke={s} strokeWidth="0.8" fillRule="evenodd"
      />
      <path
        d="M170 100 C 176 116, 178 138, 174 158 C 168 162, 162 160, 160 152 C 158 138, 158 118, 162 102 C 166 99, 169 99, 170 100 Z M 170 122 C 172 130, 172 145, 170 152 L 166 152 C 164 140, 164 125, 166 118 Z"
        fill={zoneFill("triceps")} stroke={s} strokeWidth="0.8" fillRule="evenodd"
      />

      {/* Forearms — neutral */}
      <path
        d="M44 160 C 41 180, 43 200, 47 220 C 51 222, 55 220, 56 214 C 56 196, 56 178, 54 162 Z"
        fill={NEUTRAL_FILL} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M176 160 C 179 180, 177 200, 173 220 C 169 222, 165 220, 164 214 C 164 196, 164 178, 166 162 Z"
        fill={NEUTRAL_FILL} stroke={s} strokeWidth="0.8"
      />

      {/* Lower back (erector spinae) — two columns flanking the spine */}
      <path
        d="M96 176 C 94 190, 94 208, 96 222 L 104 222 C 106 208, 106 190, 104 176 Z"
        fill={zoneFill("lowerBack")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M124 176 C 126 190, 126 208, 124 222 L 116 222 C 114 208, 114 190, 116 176 Z"
        fill={zoneFill("lowerBack")} stroke={s} strokeWidth="0.8"
      />

      {/* Glutes — heart-shape: two weighted curves meeting at center */}
      <path
        d="M64 236 C 60 252, 62 278, 76 290 C 90 294, 105 288, 108 274 L 108 246 C 98 236, 80 234, 64 236 Z"
        fill={zoneFill("glutes")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M156 236 C 160 252, 158 278, 144 290 C 130 294, 115 288, 112 274 L 112 246 C 122 236, 140 234, 156 236 Z"
        fill={zoneFill("glutes")} stroke={s} strokeWidth="0.8"
      />

      {/* Hamstrings — two parallel long muscles per leg */}
      <path
        d="M70 295 C 72 314, 74 332, 78 346 C 82 350, 86 348, 86 342 L 86 296 Z"
        fill={zoneFill("hamstrings")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M104 295 C 102 314, 100 332, 96 346 C 92 350, 88 348, 88 342 L 88 296 Z"
        fill={zoneFill("hamstrings")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M150 295 C 148 314, 146 332, 142 346 C 138 350, 134 348, 134 342 L 134 296 Z"
        fill={zoneFill("hamstrings")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M116 295 C 118 314, 120 332, 124 346 C 128 350, 132 348, 132 342 L 132 296 Z"
        fill={zoneFill("hamstrings")} stroke={s} strokeWidth="0.8"
      />

      {/* Calves — diamond/teardrop gastrocnemius, widest at upper third */}
      <path
        d="M86 354
           C 78 366, 76 380, 80 392
           C 82 400, 86 404, 88 402
           L 92 396
           C 96 384, 96 370, 92 358
           C 90 354, 88 353, 86 354 Z"
        fill={zoneFill("calves")} stroke={s} strokeWidth="0.8"
      />
      <path
        d="M134 354
           C 142 366, 144 380, 140 392
           C 138 400, 134 404, 132 402
           L 128 396
           C 124 384, 124 370, 128 358
           C 130 354, 132 353, 134 354 Z"
        fill={zoneFill("calves")} stroke={s} strokeWidth="0.8"
      />
    </g>
  )
}
