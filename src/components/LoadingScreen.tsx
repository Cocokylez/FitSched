"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import FlameIcon from "@/components/FlameIcon"

// ── Full-screen dashboard splash ────────────────────────────────────────────

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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      {/* Ambient radial glow behind the flame */}
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(107,191,184,0.11) 0%, transparent 68%)",
          pointerEvents: "none",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -58%)",
        }}
      />

      {/* Flame — wrapped in pointer-events:none so clicks don't fire sounds */}
      <motion.div
        initial={{ scale: 0.55, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
        transition={{
          scale:   { type: "spring", stiffness: 270, damping: 20, delay: 0.1 },
          opacity: { duration: 0.3,  ease: "easeOut",     delay: 0.1 },
          y:       { duration: 2.8,  repeat: Infinity,    ease: "easeInOut", delay: 0.55 },
        }}
        style={{ marginBottom: 2, pointerEvents: "none" }}
      >
        <FlameIcon size={68} streak={0} />
      </motion.div>

      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "var(--text)",
          lineHeight: 1,
        }}
      >
        FitSched
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.52 }}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
          marginTop: 7,
          letterSpacing: "0.005em",
        }}
      >
        Your schedule. Your pace.
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.2 }}
        style={{
          marginTop: 36,
          width: 110,
          height: 3,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.03)",
        }}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          style={{
            height: "100%",
            width: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, rgba(107,191,184,0.45) 0%, #6bbfb8 60%, rgba(107,191,184,0.7) 100%)",
            transformOrigin: "left center",
          }}
        />
      </motion.div>
    </motion.div>
  )
}

// ── Compact spinner used by Next.js loading.tsx ──────────────────────────────

export function FitSchedLoader({ compact = true }: { compact?: boolean }) {
  const size = compact ? 42 : 56

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Flame */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ pointerEvents: "none" }}
      >
        <FlameIcon size={size} streak={0} />
      </motion.div>

      {/* Wordmark */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: compact ? 15 : 20,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "var(--text)",
          lineHeight: 1,
        }}
      >
        FitSched
      </div>

      {/* Dot pulse */}
      <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1.15, 0.75] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#6bbfb8",
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}
