"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

// ── Full-screen dashboard splash ─────────────────────────────────────────────

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const timers = [
      setTimeout(() => setExiting(true), 1250),
      setTimeout(() => onDone(), 1650),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={
        exiting
          ? { duration: 0.4, ease: "easeIn" }
          : { duration: 0.25, ease: "easeOut" }
      }
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      <FitSchedLoader compact={false} />
    </motion.div>
  )
}

// ── Shared monogram tile (used by splash + page-level loading.tsx) ────────────

export function FitSchedLoader({ compact = true }: { compact?: boolean }) {
  const tileSize  = compact ? 48 : 88
  const fontSize  = compact ? 17 : 30
  const radius    = compact ? 16 : 26
  const ringInset = compact ? -8  : -14

  return (
    <motion.div
      initial={{ scale: 0.72, opacity: 0 }}
      animate={{ scale: 1,    opacity: 1 }}
      transition={{ type: "spring", stiffness: 255, damping: 22, delay: 0.08 }}
      style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* Outer pulse ring */}
      <motion.div
        animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.09, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: ringInset,
          borderRadius: radius + Math.abs(ringInset),
          border: "1px solid rgba(107,191,184,0.28)",
          boxShadow: "0 0 32px rgba(107,191,184,0.12)",
          pointerEvents: "none",
        }}
      />

      {/* Second, slower ring for depth */}
      <motion.div
        animate={{ opacity: [0.15, 0.4, 0.15], scale: [1, 1.18, 1] }}
        transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        style={{
          position: "absolute",
          inset: ringInset - (compact ? 8 : 14),
          borderRadius: radius + Math.abs(ringInset) + (compact ? 8 : 14),
          border: "1px solid rgba(107,191,184,0.12)",
          pointerEvents: "none",
        }}
      />

      {/* Tile */}
      <div
        style={{
          position: "relative",
          width: tileSize,
          height: tileSize,
          borderRadius: radius,
          background: "var(--surface)",
          border: "1px solid rgba(107,191,184,0.38)",
          boxShadow: [
            "0 0 0 1px rgba(107,191,184,0.08)",
            compact ? "0 6px 20px rgba(0,0,0,0.3)" : "0 12px 40px rgba(0,0,0,0.38)",
            "inset 0 1px 0 rgba(255,255,255,0.07)",
          ].join(", "),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Shimmer sweep — loops every ~2.8s */}
        <motion.div
          animate={{ x: ["-200%", "240%"] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            repeatDelay: 1.9,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.5,
          }}
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(108deg, transparent 30%, rgba(107,191,184,0.22) 50%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Monogram */}
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize,
            fontWeight: 900,
            letterSpacing: "0.025em",
            color: "var(--text)",
            position: "relative",
            zIndex: 1,
            userSelect: "none",
          }}
        >
          FS
        </span>
      </div>
    </motion.div>
  )
}
