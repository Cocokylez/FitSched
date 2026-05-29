"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

// ── Compact loader — used in page-level loading.tsx ───────────────────────────

export function FitSchedLoader({ compact = true }: { compact?: boolean }) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = "100%"
    }, 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: compact ? 12 : 16,
      }}
    >
      <div style={{ overflow: "hidden" }}>
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: compact ? 15 : 18,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          FitSched
        </motion.div>
      </div>

      <div
        style={{
          width: compact ? 60 : 80,
          height: "1.5px",
          background: "var(--border)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            width: "0%",
            background: "var(--text)",
            borderRadius: 999,
            transition: `width ${compact ? "1s" : "1.2s"} cubic-bezier(.4,0,.6,1) 0.1s`,
          }}
        />
      </div>
    </motion.div>
  )
}
