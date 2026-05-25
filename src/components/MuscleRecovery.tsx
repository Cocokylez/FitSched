"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { getMuscleGroup } from "@/lib/exerciseData"

// ── Config ────────────────────────────────────────────────────────────────────

const TRACKED = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as const
type Group = (typeof TRACKED)[number]
type Status = "resting" | "recovering" | "fresh" | "untrained"

// Full Body exercises count towards all of these
const FULL_BODY_SPILL: Group[] = ["Chest", "Back", "Legs", "Core"]

function getStatus(daysAgo: number | null): Status {
  if (daysAgo === null) return "untrained"
  if (daysAgo <= 1) return "resting"
  if (daysAgo <= 3) return "recovering"
  return "fresh"
}

const STATUS = {
  resting:   { dot: "#ef4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.18)",   tag: "Resting"   },
  recovering:{ dot: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.18)",  tag: "Recovering"},
  fresh:     { dot: "#10b981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.18)",  tag: "Ready ✓"   },
  untrained: { dot: "#8d9996", bg: "rgba(141,153,150,0.06)", border: "rgba(141,153,150,0.10)", tag: "—"         },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  logs: Array<{
    completedAt: string
    exercises: Array<{ name: string }>
  }>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MuscleRecovery({ logs }: Props) {
  const rows = useMemo(() => {
    const lastTrained: Partial<Record<Group, Date>> = {}

    logs.forEach((log) => {
      const date = new Date(log.completedAt)
      ;(log.exercises || []).forEach((ex) => {
        const rawGroup = getMuscleGroup(ex.name)
        const group = rawGroup as Group
        if ((TRACKED as readonly string[]).includes(rawGroup)) {
          if (!lastTrained[group] || date > lastTrained[group]!) {
            lastTrained[group] = date
          }
        }
        if (rawGroup === "Full Body") {
          FULL_BODY_SPILL.forEach((g) => {
            if (!lastTrained[g] || date > lastTrained[g]!) lastTrained[g] = date
          })
        }
      })
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return TRACKED.map((group) => {
      const last = lastTrained[group]
      if (!last) return { group, daysAgo: null, status: "untrained" as Status }
      const d = new Date(last)
      d.setHours(0, 0, 0, 0)
      const daysAgo = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
      return { group, daysAgo, status: getStatus(daysAgo) }
    })
  }, [logs])

  const readyGroups = rows.filter((r) => r.status === "fresh")
  const allResting = rows.every((r) => r.status === "resting" || r.status === "recovering")

  const suggestion =
    readyGroups.length === 0 && allResting
      ? "Rest day recommended — all groups are still recovering"
      : readyGroups.length === 0
      ? "Start logging workouts to track recovery"
      : readyGroups.length === 1
      ? `✓ ${readyGroups[0].group} is ready to train`
      : `✓ ${readyGroups.map((r) => r.group).join(", ")} ready to train`

  return (
    <div>
      {/* Suggestion line */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: readyGroups.length > 0 ? "var(--accent)" : "var(--text-muted)",
          marginBottom: 12,
          lineHeight: 1.4,
        }}
      >
        {suggestion}
      </div>

      {/* 3-column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
        {rows.map(({ group, daysAgo, status }, i) => {
          const cfg = STATUS[status]
          const ageLabel =
            daysAgo === null ? "—" : daysAgo === 0 ? "today" : `${daysAgo}d ago`

          return (
            <motion.div
              key={group}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 10,
                padding: "9px 10px",
              }}
            >
              {/* dot + age */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: cfg.dot,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: cfg.dot,
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                  }}
                >
                  {ageLabel}
                </span>
              </div>

              <div
                style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}
              >
                {group}
              </div>
              <div
                style={{ fontSize: 9, color: cfg.dot, marginTop: 3, fontWeight: 600 }}
              >
                {cfg.tag}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        {(["resting", "recovering", "fresh"] as Status[]).map((s) => (
          <div
            key={s}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: STATUS[s].dot,
              }}
            />
            <span style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600 }}>
              {s === "resting" ? "0–1d" : s === "recovering" ? "2–3d" : "4d+"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
