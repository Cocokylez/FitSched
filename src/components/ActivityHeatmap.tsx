"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ActivityHeatmapProps {
  logs: Array<{ completedAt: string }>
  weeks?: number
}

const CELL = 11
const GAP = 2

function toLocalKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function ActivityHeatmap({ logs, weeks = 16 }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)

  const { columns, monthLabels, totalCount } = useMemo(() => {
    const today = new Date()
    const todayKey = toLocalKey(today)

    // Find the Monday that starts our 16-week window
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - weeks * 7 + 1)
    const dow = startDate.getDay() // 0=Sun, 1=Mon...
    const backToMon = dow === 0 ? 6 : dow - 1
    startDate.setDate(startDate.getDate() - backToMon)
    startDate.setHours(0, 0, 0, 0)

    // Count workouts per local date
    const countByDate: Record<string, number> = {}
    logs.forEach((log) => {
      const d = new Date(log.completedAt)
      const key = toLocalKey(d)
      countByDate[key] = (countByDate[key] || 0) + 1
    })

    // Build flat array of days then chunk into 7-day columns
    const flat: Array<{
      date: Date
      count: number
      key: string
      isToday: boolean
      isFuture: boolean
    }> = []

    const cur = new Date(startDate)
    while (true) {
      const key = toLocalKey(cur)
      const isFuture = cur > today
      flat.push({
        date: new Date(cur),
        count: countByDate[key] || 0,
        key,
        isToday: key === todayKey,
        isFuture,
      })
      cur.setDate(cur.getDate() + 1)
      // Stop after filling the current week through Sunday
      if (isFuture && cur.getDay() === 1) break
    }

    // Chunk into columns of 7
    const columns: (typeof flat)[] = []
    for (let i = 0; i < flat.length; i += 7) {
      columns.push(flat.slice(i, i + 7))
    }

    // Month labels — find the leftmost column where each month first appears
    const seenMonths = new Set<number>()
    const monthLabels: Array<{ label: string; colIndex: number }> = []
    columns.forEach((col, ci) => {
      const m = col[0].date.getMonth()
      if (!seenMonths.has(m)) {
        seenMonths.add(m)
        monthLabels.push({
          label: col[0].date.toLocaleDateString("en-US", { month: "short" }),
          colIndex: ci,
        })
      }
    })

    const totalCount = flat.reduce((sum, d) => sum + (d.isFuture ? 0 : d.count), 0)

    return { columns, monthLabels, totalCount }
  }, [logs, weeks])

  const cellColor = (count: number, isFuture: boolean) => {
    if (isFuture) return "transparent"
    if (count === 0) return "var(--border)"
    return "var(--accent)"
  }

  const cellOpacity = (count: number, isFuture: boolean) => {
    if (isFuture) return 0
    if (count === 0) return 1
    if (count === 1) return 0.38
    if (count === 2) return 0.68
    return 1
  }

  const DAY_LABELS = ["M", "", "W", "", "F", "", "S"]

  return (
    <div style={{ position: "relative" }}>
      {/* Subtitle */}
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 10,
        }}
      >
        {totalCount} workout{totalCount !== 1 ? "s" : ""} in the last {weeks} weeks
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", minWidth: "fit-content" }}>

          {/* Month labels row */}
          <div
            style={{
              position: "relative",
              height: 14,
              marginBottom: 3,
              marginLeft: 18,
            }}
          >
            {monthLabels.map((m, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: m.colIndex * (CELL + GAP),
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid row: day labels + cells */}
          <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
            {/* Day-of-week labels */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: GAP,
                marginRight: 4,
                width: 14,
                flexShrink: 0,
              }}
            >
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  style={{
                    height: CELL,
                    fontSize: 8,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    userSelect: "none",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div style={{ display: "flex", gap: GAP }}>
              {columns.map((col, ci) => (
                <div key={ci} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                  {col.map((day, ri) => (
                    <motion.div
                      key={ri}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{
                        opacity: cellOpacity(day.count, day.isFuture),
                        scale: 1,
                      }}
                      transition={{
                        delay: (ci * 7 + ri) * 0.0018,
                        duration: 0.22,
                        ease: "easeOut",
                      }}
                      onMouseEnter={(e) => {
                        if (day.isFuture) return
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        const label = day.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                        const cnt = day.count
                        setTooltip({
                          text: cnt === 0
                            ? `${label} — rest day`
                            : `${label} — ${cnt} workout${cnt !== 1 ? "s" : ""}`,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 6,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        background: cellColor(day.count, day.isFuture),
                        flexShrink: 0,
                        cursor: day.isFuture ? "default" : "pointer",
                        outline: day.isToday
                          ? "1.5px solid var(--accent)"
                          : "none",
                        outlineOffset: 1,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              marginTop: 8,
              marginLeft: 18,
              justifyContent: "flex-end",
            }}
          >
            <span style={{ fontSize: 9, color: "var(--text-muted)", marginRight: 2 }}>Less</span>
            {[null, 0.38, 0.68, 1].map((opacity, i) => (
              <div
                key={i}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 2,
                  background: opacity === null ? "var(--border)" : "var(--accent)",
                  opacity: opacity ?? 1,
                  flexShrink: 0,
                }}
              />
            ))}
            <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 2 }}>More</span>
          </div>
        </div>
      </div>

      {/* Floating tooltip (portal-ish via fixed) */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 9999,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: "var(--shadow)",
            }}
          >
            {tooltip.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
