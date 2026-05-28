"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

// ── Full-screen dashboard splash ─────────────────────────────────────────────

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Kick the bar fill on next paint
    const fill = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = "100%"
    }, 50)
    const exit = setTimeout(() => setExiting(true), 1250)
    const done = setTimeout(() => onDone(), 1600)
    return () => [fill, exit, done].forEach(clearTimeout)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={exiting ? { duration: 0.35, ease: "easeIn" } : { duration: 0.2 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      {/* Wordmark — clips upward from a hidden container */}
      <div style={{ overflow: "hidden" }}>
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "#fff",
          }}
        >
          FitSched
        </motion.div>
      </div>

      {/* Progress bar — your exact style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, delay: 0.2 }}
        style={{
          width: 80,
          height: "1.5px",
          background: "#1a1a1a",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            width: "0%",
            background: "#fff",
            borderRadius: 999,
            transition: "width 1.2s cubic-bezier(.4,0,.6,1) 0.1s",
          }}
        />
      </motion.div>
    </motion.div>
  )
}

// ── Compact spinner — page-level loading.tsx ──────────────────────────────────

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
