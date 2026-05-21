"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Dumbbell, Snowflake, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

type StreakWelcomeCardProps = {
  streak: number
  previousStreak: number
  streakBroken: boolean
  onGoWorkout: () => void
}

const confettiColors = ["#6bbfb8", "#f6c85f", "#ff8a65", "#8fa8ff", "#ffffff"]

function ConfettiAroundButton() {
  const shouldReduceMotion = useReducedMotion()
  const pieces = useMemo(() => {
    return Array.from({ length: 34 }, (_, index) => ({
      id: index,
      x: ((index * 59) % 330) - 165,
      y: -24 - ((index * 41) % 118),
      rotate: ((index * 67) % 360) - 180,
      color: confettiColors[index % confettiColors.length],
      width: 5 + (index % 3) * 2,
      height: 8 + (index % 4) * 2,
      delay: 0.65 + (index % 8) * 0.035,
    }))
  }, [])

  if (shouldReduceMotion) return null

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, height: 170, pointerEvents: "none", overflow: "visible" }}>
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ opacity: 0, x: 0, y: 22, rotate: 0, scale: 0.72 }}
          animate={{ opacity: [0, 1, 1, 0], x: piece.x, y: piece.y, rotate: piece.rotate, scale: [0.72, 1, 0.9] }}
          transition={{ duration: 1.65, delay: piece.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            width: piece.width,
            height: piece.height,
            borderRadius: piece.id % 2 === 0 ? "999px" : "2px",
            background: piece.color,
          }}
        />
      ))}
    </div>
  )
}

function FreezeHalo({ active }: { active: boolean }) {
  const shouldReduceMotion = useReducedMotion()
  const shards = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => ({
      id: index,
      rotate: index * 30,
      distance: 66 + (index % 3) * 7,
      size: 8 + (index % 4) * 2,
      delay: 0.04 * index,
    }))
  }, [])

  if (shouldReduceMotion) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.72, rotate: -10 }}
      animate={{
        opacity: active ? [0, 1, 0.9] : [0, 0.75, 0.55],
        scale: active ? [0.72, 1.08, 1] : [0.72, 0.98, 0.94],
        rotate: active ? [12, -4, 0] : [-10, 2, -2],
      }}
      transition={{ duration: active ? 1.05 : 0.78, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
      }}
    >
      <motion.span
        animate={{ scale: active ? [0.88, 1.08, 0.96] : [0.84, 0.98, 0.9], opacity: active ? [0.22, 0.54, 0.34] : [0.12, 0.3, 0.16] }}
        transition={{ duration: 1.4, repeat: active ? Infinity : 0, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: 154,
          height: 154,
          borderRadius: "50%",
          border: "1px solid rgba(139, 226, 255, 0.38)",
          boxShadow: "inset 0 0 30px rgba(139,226,255,0.14), 0 0 34px rgba(107,191,184,0.16)",
        }}
      />
      {shards.map((shard) => (
        <motion.span
          key={shard.id}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: active ? [0, 1, 0.72] : [0, 0.76, 0],
            scale: active ? [0, 1.15, 0.92] : [0, 0.9, 0.4],
            x: Math.cos((shard.rotate * Math.PI) / 180) * shard.distance,
            y: Math.sin((shard.rotate * Math.PI) / 180) * shard.distance,
            rotate: shard.rotate + 45,
          }}
          transition={{ duration: active ? 1.05 : 0.7, delay: shard.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: shard.size,
            height: shard.size * 2.2,
            borderRadius: "999px 999px 2px 2px",
            background: "linear-gradient(180deg, rgba(225,252,255,0.95), rgba(95,206,236,0.28))",
            boxShadow: "0 0 16px rgba(139,226,255,0.34)",
          }}
        />
      ))}
    </motion.div>
  )
}

function FireBurst({ broken, frozen }: { broken: boolean; frozen?: boolean }) {
  const shouldReduceMotion = useReducedMotion()
  const fcx = 100, baseY = 182

  const rays = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const deg = i * 30
    const rad = (deg * Math.PI) / 180
    const len = 34 + (i % 3) * 14
    return {
      id: i,
      x2: fcx + Math.cos(rad) * len,
      y2: baseY + Math.sin(rad) * len,
      delay: 0.04 + i * 0.022,
      width: i % 2 === 0 ? 2.6 : 1.4,
      color: i % 3 === 0
        ? "rgba(255, 215, 55, 0.92)"
        : i % 3 === 1
        ? "rgba(255, 145, 35, 0.82)"
        : "rgba(255, 95, 18, 0.72)",
    }
  }), [])

  const sparks = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const deg = i * 45 + 12
    const rad = (deg * Math.PI) / 180
    const dist = 46 + (i % 3) * 14
    return {
      id: i,
      ex: Math.cos(rad) * dist,
      ey: Math.sin(rad) * dist,
      size: 3.5 + (i % 2) * 2.5,
      delay: 0.1 + i * 0.048,
      color: i % 3 === 0 ? "#fff4a0" : i % 3 === 1 ? "#ffb347" : "#ff6c1a",
    }
  }), [])

  return (
    <div style={{ position: "relative", width: 200, height: 210, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.svg
        viewBox="0 0 200 240"
        width="200"
        height="210"
        aria-hidden="true"
        style={{ overflow: "visible" }}
        initial={{ scale: 0.46, opacity: 0, y: 20 }}
        animate={broken
          ? { scale: [0.46, 1.08, 0.82], opacity: [0, 1, 0.48], y: [20, 0, 0] }
          : { scale: shouldReduceMotion ? 1 : [0.46, 1.22, 0.96, 1], opacity: 1, y: 0 }}
        transition={broken
          ? { duration: 1.15, ease: "easeOut" }
          : { duration: shouldReduceMotion ? 0.22 : 0.72, ease: [0.16, 1, 0.3, 1] }}
      >
        <defs>
          <radialGradient id="cfBaseGlow" cx="50%" cy="95%" r="52%">
            <stop offset="0%" stopColor={broken ? "rgba(155,165,170,0.65)" : "rgba(255,128,18,0.8)"} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <linearGradient id="cfLogA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={broken ? "#585e62" : "#8c5422"} />
            <stop offset="100%" stopColor={broken ? "#363c40" : "#3c1e08"} />
          </linearGradient>
          <linearGradient id="cfLogB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={broken ? "#4e5458" : "#764218"} />
            <stop offset="100%" stopColor={broken ? "#2e3438" : "#2e1606"} />
          </linearGradient>
          <linearGradient id="cfOuterFlame" x1={fcx} y1="44" x2={fcx} y2="178" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={broken ? "#c5cdd0" : "#ffe25a"} />
            <stop offset="36%"  stopColor={broken ? "#8a9498" : "#ff7818"} />
            <stop offset="78%"  stopColor={broken ? "#586266" : "#e02c0c"} />
            <stop offset="100%" stopColor={broken ? "#3c4548" : "#7e1006"} />
          </linearGradient>
          <linearGradient id="cfMidFlame" x1={fcx} y1="78" x2={fcx} y2="176" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor={broken ? "#e5eaec" : "#fff8b8"} />
            <stop offset="50%"  stopColor={broken ? "#aebcc0" : "#ffbe3a"} />
            <stop offset="100%" stopColor={broken ? "#74828a" : "#ff661a"} />
          </linearGradient>
          <filter id="cfBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="cfEmberGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ground ambient glow */}
        <ellipse cx={fcx} cy="222" rx="64" ry="18" fill="url(#cfBaseGlow)" opacity={broken ? 0.38 : 0.92} />

        {/* Pop burst rays — one-shot on mount */}
        {!broken && !shouldReduceMotion && rays.map((ray) => (
          <motion.path
            key={ray.id}
            d={`M${fcx},${baseY} L${ray.x2},${ray.y2}`}
            stroke={ray.color}
            strokeWidth={ray.width}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.92, 0.88, 0] }}
            transition={{ duration: 0.72, delay: ray.delay, ease: "easeOut" }}
          />
        ))}

        {/* Pop spark dots — one-shot on mount */}
        {!broken && !shouldReduceMotion && sparks.map((sp) => (
          <motion.circle
            key={sp.id}
            cx={fcx}
            cy={baseY}
            r={sp.size}
            fill={sp.color}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x: sp.ex, y: sp.ey, opacity: [0, 1, 0.7, 0], scale: [0, 1.3, 0.5, 0] }}
            transition={{ duration: 0.75, delay: sp.delay, ease: "easeOut" }}
          />
        ))}

        {/* Log A */}
        <rect
          x="42" y={baseY - 6} width="90" height="15" rx="7.5"
          fill="url(#cfLogA)"
          transform={`rotate(-26 ${fcx} ${baseY})`}
          opacity={broken ? 0.62 : 1}
        />
        {/* Log B */}
        <rect
          x="68" y={baseY - 6} width="90" height="15" rx="7.5"
          fill="url(#cfLogB)"
          transform={`rotate(26 ${fcx} ${baseY})`}
          opacity={broken ? 0.52 : 1}
        />
        {/* Log intersection shadow */}
        <ellipse cx={fcx} cy={baseY + 4} rx="26" ry="6" fill="rgba(0,0,0,0.38)" opacity={broken ? 0.28 : 0.55} />

        {/* Live ember dots at log intersection */}
        {!broken && !shouldReduceMotion && (
          <>
            <motion.circle cx="90" cy={baseY - 3} r="3.8" fill="#ff9820"
              filter="url(#cfEmberGlow)"
              animate={{ opacity: [0.65, 1, 0.45], r: [3, 4.2, 2.6] }}
              transition={{ duration: 0.78, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle cx="106" cy={baseY - 1} r="3.0" fill="#ffcc38"
              filter="url(#cfEmberGlow)"
              animate={{ opacity: [0.48, 1, 0.58], r: [2.6, 3.6, 2.2] }}
              transition={{ duration: 0.62, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle cx="118" cy={baseY - 5} r="2.4" fill="#ff7818"
              filter="url(#cfEmberGlow)"
              animate={{ opacity: [0.55, 0.9, 0.38] }}
              transition={{ duration: 0.9, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Backing glow blur layer */}
        <motion.path
          d={`M${fcx} 176 C68 163 48 130 56 94 C62 64 78 50 82 26 C104 50 126 70 122 102 C118 132 110 158 ${fcx} 176 Z`}
          fill={broken ? "#6c7880" : "#ff4e0c"}
          filter="url(#cfBlur)"
          opacity={broken ? 0.26 : 0.52}
          animate={broken ? {} : { opacity: [0.42, 0.62, 0.42] }}
          transition={{ duration: 1.75, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Outer flame */}
        <motion.path
          d={`M${fcx} 176 C68 163 48 130 56 94 C62 64 78 50 82 26 C104 50 126 70 122 102 C118 132 110 158 ${fcx} 176 Z`}
          fill="url(#cfOuterFlame)"
          opacity={broken ? 0.58 : 1}
          style={{ transformOrigin: `${fcx}px ${baseY}px` }}
          animate={broken || shouldReduceMotion ? {} : {
            scaleX: [1, 0.92, 1.08, 0.96, 1],
            scaleY: [1, 1.05, 0.97, 1.04, 1],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Mid flame */}
        <motion.path
          d={`M${fcx} 168 C76 157 63 133 68 106 C72 82 84 68 87 46 C103 64 115 82 112 106 C109 128 102 154 ${fcx} 168 Z`}
          fill="url(#cfMidFlame)"
          opacity={broken ? 0.5 : 0.95}
          style={{ transformOrigin: `${fcx}px ${baseY}px` }}
          animate={broken || shouldReduceMotion ? {} : {
            scaleX: [1, 1.1, 0.93, 1.05, 1],
            y: [0, -6, 2, -3, 0],
          }}
          transition={{ duration: 1.12, repeat: Infinity, ease: "easeInOut", delay: 0.14 }}
        />

        {/* White-hot core */}
        <motion.path
          d={`M${fcx} 158 C88 149 84 134 87 120 C90 108 98 100 99 86 C109 100 112 114 110 127 C108 139 104 152 ${fcx} 158 Z`}
          fill="#ffffff"
          opacity={broken ? 0.18 : 0.88}
          style={{ transformOrigin: `${fcx}px 140px` }}
          animate={broken || shouldReduceMotion ? {} : {
            opacity: [0.82, 1, 0.76, 0.96],
            scaleY: [1, 1.08, 0.95, 1.05],
          }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.22 }}
        />

        {/* Rising embers */}
        {!broken && !shouldReduceMotion && [
          { cx: 84, cy: 102, r: 2.2, dx: -9,  color: "#fff4b0", delay: 0 },
          { cx: 108, cy: 84,  r: 1.8, dx:  8,  color: "#ffb347", delay: 0.68 },
          { cx: 116, cy: 112, r: 2.5, dx:  12, color: "#ffe566", delay: 1.18 },
          { cx: 90,  cy: 94,  r: 1.6, dx: -5,  color: "#ffffff", delay: 1.78 },
          { cx: 110, cy: 100, r: 2.0, dx:  7,  color: "#ffcc40", delay: 0.4 },
          { cx: 78,  cy: 118, r: 1.5, dx: -11, color: "#fff4b0", delay: 0.95 },
        ].map((e, i) => (
          <motion.circle
            key={i}
            r={e.r}
            fill={e.color}
            animate={{
              cx: [e.cx, e.cx + e.dx],
              cy: [e.cy, e.cy - 60],
              opacity: [0, 1, 0.65, 0],
              r: [e.r, e.r * 0.28],
            }}
            transition={{ duration: 2.2, delay: e.delay, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      </motion.svg>

      {frozen && <FreezeHalo active={frozen} />}

      {!broken && !shouldReduceMotion && (
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: [0.7, 1.3, 1.0], opacity: [0, 0.3, 0] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            border: "1px solid rgba(255, 148, 36, 0.32)",
          }}
        />
      )}

      {broken && !shouldReduceMotion && (
        <>
          {[0, 1, 2, 3].map((line) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, x: -34, scaleX: 0.25 }}
              animate={{ opacity: [0, 0.78, 0], x: 102, scaleX: [0.25, 1.18, 0.52] }}
              transition={{ duration: 1.05, delay: 0.2 + line * 0.11, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: 32 + line * 16,
                left: -18,
                width: 42,
                height: 3,
                borderRadius: 999,
                background: "rgba(220, 235, 240, 0.62)",
                transformOrigin: "left center",
              }}
            />
          ))}
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={`smoke-${dot}`}
              initial={{ opacity: 0, y: 8, scale: 0.7 }}
              animate={{ opacity: [0, 0.48, 0], y: -44 - dot * 7, scale: [0.7, 1.35, 1.7] }}
              transition={{ duration: 1.45, delay: 0.68 + dot * 0.16, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: 54 + dot * 8,
                top: 17,
                width: 11 + dot * 3,
                height: 11 + dot * 3,
                borderRadius: "50%",
                background: "rgba(220, 235, 240, 0.25)",
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

export function StreakWelcomeCard({
  streak,
  previousStreak,
  streakBroken,
  onGoWorkout,
}: StreakWelcomeCardProps) {
  const [open, setOpen] = useState(false)
  const [freezeUsed, setFreezeUsed] = useState(false)
  const [freezing, setFreezing] = useState(false)
  const hasActiveStreak = streak > 0
  const showMoment = hasActiveStreak || streakBroken
  const missedStreak = streakBroken && !hasActiveStreak
  const displayStreak = hasActiveStreak ? streak : previousStreak

  useEffect(() => {
    if (!showMoment) {
      setOpen(false)
      return
    }

    const dayKey = new Date().toDateString()
    const stateKey = hasActiveStreak ? "active" : "broken"
    const storageKey = `fitsched-streak-pop:${stateKey}:${displayStreak}:${dayKey}`
    if (window.sessionStorage.getItem(storageKey)) return

    window.sessionStorage.setItem(storageKey, "1")
    setFreezeUsed(false)
    setFreezing(false)
    setOpen(true)
  }, [displayStreak, hasActiveStreak, showMoment])

  if (!showMoment) return null

  const close = () => setOpen(false)
  const goWorkout = () => {
    setOpen(false)
    onGoWorkout()
  }
  const useFreeze = () => {
    setFreezing(true)
    window.setTimeout(() => {
      setFreezeUsed(true)
      setFreezing(false)
    }, 950)
  }

  const freezeActive = missedStreak && (freezing || freezeUsed)
  const frozenTitle = freezeUsed ? `${displayStreak} day streak protected` : "Protect your streak"
  const activeTitle = `${displayStreak} day streak is alive`
  const title = hasActiveStreak ? activeTitle : missedStreak ? frozenTitle : "Your streak went quiet"

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9996,
            background: "rgba(0, 0, 0, 0.56)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Streak welcome"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 170, damping: 20 }}
            style={{
              position: "relative",
              width: "min(92vw, 390px)",
              overflow: "visible",
              borderRadius: 0,
              padding: "22px",
              color: "#ffffff",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close streak welcome"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 34,
                height: 34,
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "rgba(255, 255, 255, 0.07)",
                color: "rgba(255, 255, 255, 0.72)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} strokeWidth={2.4} />
            </button>

            <FireBurst broken={missedStreak && !freezeActive} frozen={freezeActive} />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.28, ease: "easeOut" }}
            >
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.17em", color: freezeActive ? "rgba(171, 236, 255, 0.72)" : "rgba(255, 255, 255, 0.48)", textTransform: "uppercase", marginBottom: 7 }}>
                {freezeActive ? "Streak freeze" : missedStreak ? "Recovery moment" : "Welcome back"}
              </div>
              <div style={{ fontSize: 25, lineHeight: 1.08, fontWeight: 950, letterSpacing: "-0.35px" }}>
                {title}
              </div>
              <div style={{ maxWidth: 288, margin: "10px auto 0", color: "rgba(255, 255, 255, 0.64)", fontSize: 13, lineHeight: 1.48 }}>
                {hasActiveStreak
                  ? "Keep it warm with today's workout."
                  : freezeUsed
                    ? "The missed day is frozen for now. Finish today's workout to keep the streak moving."
                    : missedStreak && displayStreak > 0
                    ? `That ${displayStreak} day run can still become today's comeback. Freeze the miss, then train.`
                    : "Start fresh today and build the next one."}
              </div>
            </motion.div>

            {(hasActiveStreak || freezeUsed) && <ConfettiAroundButton />}

            <motion.button
              type="button"
              onClick={missedStreak && !freezeUsed ? useFreeze : goWorkout}
              disabled={freezing}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.72, type: "spring", stiffness: 220, damping: 18 }}
              whileTap={{ scale: 0.985 }}
              style={{
                position: "relative",
                marginTop: 22,
                width: "100%",
                border: "none",
                borderRadius: 16,
                padding: "14px 15px",
                background: hasActiveStreak || freezeUsed ? "#6bbfb8" : "rgba(147, 225, 250, 0.16)",
                color: hasActiveStreak || freezeUsed ? "#10201f" : "#dff8ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                fontSize: 14,
                fontWeight: 950,
                cursor: freezing ? "default" : "pointer",
                opacity: freezing ? 0.72 : 1,
              }}
            >
              {missedStreak && !freezeUsed ? <Snowflake size={17} strokeWidth={2.4} /> : <Dumbbell size={17} strokeWidth={2.4} />}
              <span>{freezing ? "Freezing streak" : missedStreak && !freezeUsed ? "Use freeze" : hasActiveStreak ? "Go exercise" : "Restart streak"}</span>
              {!(missedStreak && !freezeUsed) && <ArrowRight size={16} strokeWidth={2.4} />}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
