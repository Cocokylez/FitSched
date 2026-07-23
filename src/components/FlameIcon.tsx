"use client"

import type { CSSProperties } from "react"

import { getStreakTier } from "@/lib/streakTiers"

type FlameIconProps = {
  /** Rendered width in px. Height follows the 68:84 aspect of the source shape. */
  size?: number
  streak?: number
  /** Cold burnt-out state — kills the sway and the embers. */
  broken?: boolean
}

/* The clip-path coordinates below are absolute px inside a 68×84 box, so the
   flame is scaled with `transform: scale()` rather than by resizing the element —
   changing width/height would stretch the box but leave the path at its original
   size. Everything else derives from these two numbers. */
const BASE_W = 68
const BASE_H = 84

/** Outer body of the flame — the teardrop with the notched left shoulder. */
const FLAME_PATH =
  "path('M30 8 C33 18 36 26 39 32 C44 23 49 18 54 19 C58 28 62 35 62 45 C62 61 50 73 35 76 C20 80 9 67 9 47 C9 31 19 21 30 8 Z')"

/** White-hot core, sitting low in the body where a real flame is hottest. */
const CORE_PATH =
  "path('M36 47 C38 51 39 52 41 53 C43 50 45 49 47 50 C50 55 51 59 50 62 C49 69 44 73 37 73 C30 73 25 69 24 62 C23 55 29 52 36 47 Z')"

/** Rising embers, positioned as a fraction of the flame box so they scale with `size`. */
const EMBERS = [
  { leftPct: 0.18, bottomPct: 0.5, size: 6, duration: 2.4, delay: 0, dx: -10, color: "var(--sf-c1)" },
  { leftPct: 0.78, bottomPct: 0.6, size: 5, duration: 2.9, delay: -0.9, dx: 12, color: "var(--sf-c2)" },
  { leftPct: 0.5, bottomPct: 0.44, size: 5, duration: 2.2, delay: -1.4, dx: -4, color: "var(--sf-c1)" },
] as const

export default function FlameIcon({ size = 120, streak = 0, broken = false }: FlameIconProps) {
  const tier = getStreakTier(streak, broken)
  const scale = size / BASE_W
  const height = Math.round(BASE_H * scale)

  const vars = {
    "--sf-c1": tier.c1,
    "--sf-c2": tier.c2,
    "--sf-c3": tier.c3,
    "--sf-glow": tier.glow,
  } as CSSProperties

  return (
    <div
      aria-hidden="true"
      style={{
        ...vars,
        position: "relative",
        width: size,
        height,
        display: "block",
        // The glow and embers deliberately spill outside the flame's own box.
        overflow: "visible",
      }}
    >
      {/* Ambient glow. Sized off the flame so it stays proportional at any scale. */}
      <div
        className="sf-glow-pulse"
        style={{
          position: "absolute",
          left: "50%",
          top: "44%",
          width: size * 2.2,
          height: size * 2.2,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--sf-glow) 0%, transparent 62%)",
          opacity: broken ? 0.22 : 0.5,
          animation: broken ? undefined : "sf-glow 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Flame body. Anchored bottom-centre so the sway pivots at its base. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          width: BASE_W,
          height: BASE_H,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "50% 100%",
        }}
      >
        <div
          className={broken ? undefined : "sf-flame"}
          style={{ position: "relative", width: BASE_W, height: BASE_H }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, var(--sf-c1), var(--sf-c2) 50%, var(--sf-c3))",
              clipPath: FLAME_PATH,
            }}
          />
          <div
            className={broken ? undefined : "sf-in"}
            style={{
              position: "absolute",
              inset: 0,
              // A broken flame has no white-hot core — just cooling ash.
              background: broken ? "rgba(255,255,255,0.18)" : "#ffffff",
              clipPath: CORE_PATH,
            }}
          />
        </div>
      </div>

      {/* Rising embers. Hidden entirely when broken — nothing left to throw off. */}
      {!broken &&
        EMBERS.map((ember, i) => (
          <span
            key={i}
            className="sf-ember"
            style={
              {
                position: "absolute",
                left: `${ember.leftPct * 100}%`,
                bottom: `${ember.bottomPct * 100}%`,
                width: Math.max(2, ember.size * scale),
                height: Math.max(2, ember.size * scale),
                borderRadius: "50%",
                background: ember.color,
                animation: `sf-rise ${ember.duration}s ease-out infinite`,
                animationDelay: `${ember.delay}s`,
                "--dx": `${ember.dx * scale}px`,
                pointerEvents: "none",
              } as CSSProperties
            }
          />
        ))}
    </div>
  )
}

/**
 * One-shot celebration burst — a ring plus radial sparks.
 *
 * Render it inside a `position: relative` box and change `nonce` to fire it
 * (the key remount restarts the CSS animations). Renders nothing at nonce 0, so
 * it costs nothing until the user actually celebrates.
 */
export function FlameBurst({ nonce, streak = 0 }: { nonce: number; streak?: number }) {
  if (!nonce) return null

  const tier = getStreakTier(streak)
  const SPARKS = 14

  return (
    <div
      key={nonce}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}
    >
      <span
        style={{
          position: "absolute",
          left: "50%",
          top: "44%",
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `2px solid ${tier.c1}`,
          animation: "sf-ringpop 0.66s ease-out both",
        }}
      />
      {Array.from({ length: SPARKS }, (_, i) => {
        const angle = ((i * (360 / SPARKS) + (i % 2 ? 8 : 0)) * Math.PI) / 180
        const distance = 62 + (i % 3) * 18
        const dotSize = 4 + (i % 3) * 2
        const color = [tier.c1, tier.c2, "#ffffff"][i % 3]

        return (
          <span
            key={i}
            style={
              {
                position: "absolute",
                left: "50%",
                top: "44%",
                width: dotSize,
                height: dotSize,
                borderRadius: "50%",
                background: color,
                animation: "sf-burst 0.72s cubic-bezier(.2,.7,.3,1) both",
                animationDelay: `${(i % 4) * 0.02}s`,
                "--bx": `${Math.cos(angle) * distance}px`,
                "--by": `${Math.sin(angle) * distance}px`,
              } as CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
