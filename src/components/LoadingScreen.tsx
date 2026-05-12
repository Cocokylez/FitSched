"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const activeTimers = [
      setTimeout(() => setExiting(true), 1250),
      setTimeout(() => onDone(), 1650),
    ];

    return () => activeTimers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(180deg, rgba(107,191,184,0.045), var(--bg) 46%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      <FitSchedLoader compact={false} />
    </motion.div>
  );
}

export function FitSchedLoader({ compact = true }: { compact?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      style={{
        width: compact ? 220 : 244,
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 14,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 28,
          padding: compact ? 14 : 16,
          boxShadow: "var(--shadow-lg)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              background: "var(--accent-soft)",
              border: "1px solid var(--border-strong)",
              color: "var(--accent-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.02em",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            FS
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--text)", fontSize: 18, fontWeight: 900, lineHeight: 1 }}>
              FitSched
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 650, marginTop: 5 }}>
              Preparing your workout
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {[
            { width: "74%", delay: "0s" },
            { width: "92%", delay: "0.18s" },
            { width: "58%", delay: "0.36s" },
          ].map((item, index) => (
            <div
              key={index}
              style={{
                height: 30,
                borderRadius: 14,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "0 10px",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: index === 1 ? "#6bbfb8" : "rgba(107,191,184,0.44)",
                  animation: "loaderPulse 1.4s ease-in-out infinite",
                  animationDelay: item.delay,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  height: 7,
                  width: item.width,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(107,191,184,0.32), rgba(255,255,255,0.08))",
                  backgroundSize: "220% 100%",
                  animation: "loaderSweep 1.35s ease-in-out infinite",
                  animationDelay: item.delay,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          height: 5,
          borderRadius: 999,
          background: "rgba(255,255,255,0.07)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            width: "46%",
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, rgba(107,191,184,0.15), #6bbfb8, rgba(107,191,184,0.25))",
            animation: "loaderTrack 1.18s cubic-bezier(0.65, 0, 0.35, 1) infinite",
          }}
        />
      </div>
    </motion.div>
  );
}

export function SkeletonBlock({ style: customStyle = {} }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        animation: "shimmer 1.5s ease-in-out infinite",
        background: "linear-gradient(90deg, var(--bg3) 25%, var(--bg2) 50%, var(--bg3) 75%)",
        backgroundSize: "200% 100%",
        borderRadius: 12,
        ...customStyle,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: "var(--bg1)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 }}>
      <SkeletonBlock style={{ height: 16, width: "60%", marginBottom: 8 }} />
      <SkeletonBlock style={{ height: 12, width: "40%", marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <SkeletonBlock style={{ height: 22, width: 60, borderRadius: 20 }} />
        <SkeletonBlock style={{ height: 22, width: 80, borderRadius: 20 }} />
      </div>
    </div>
  );
}
