"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<"dots" | "circle" | "square">("dots");
  const [exiting, setExiting] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const activeTimers = [
      setTimeout(() => setStage("circle"), 700),
      setTimeout(() => setStage("square"), 1550),
      setTimeout(() => setExiting(true), 2100),
      setTimeout(() => onDone(), 2800),
    ];

    timers.current = activeTimers;
    return () => activeTimers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      <motion.div
        animate={exiting ? { scale: 0.92 } : { scale: 1 }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          width: 110, height: 110, borderRadius: 28,
          background: "var(--bg1)",
          boxShadow: "var(--shadow), 0 8px 40px rgba(99,102,241,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {stage === "dots" && (
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 11, height: 11, borderRadius: "50%",
                  background: i === 2 ? "#a5b4fc" : "var(--brand)",
                  animation: "dotPop 1s ease-in-out infinite",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
        )}
        {stage === "circle" && (
          <svg viewBox="0 0 60 60" style={{ width: 58, height: 58 }}>
            <circle
              cx="30" cy="30" r="24"
              fill="none" stroke="var(--brand)" strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="150.8" strokeDashoffset="150.8"
              style={{
                transformOrigin: "center",
                transform: "rotate(-90deg)",
                animation: "drawRing 0.75s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              }}
            />
          </svg>
        )}
        {stage === "square" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "var(--brand)",
            }}
          />
        )}
      </motion.div>
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
