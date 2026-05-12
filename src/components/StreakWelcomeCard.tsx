"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Dumbbell, X } from "lucide-react"
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

function FireBurst({ broken }: { broken: boolean }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div style={{ position: "relative", width: 172, height: 176, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.svg
        viewBox="0 0 160 180"
        width="160"
        height="180"
        aria-hidden="true"
        initial={{ scale: 0.48, opacity: 0, y: 22 }}
        animate={broken
          ? { scale: [0.48, 1.1, 0.8], opacity: [0, 1, 0.46], y: [22, 0, 0], rotate: [0, -5, 4] }
          : { scale: shouldReduceMotion ? 1 : [0.48, 1.16, 1], opacity: 1, y: 0, rotate: shouldReduceMotion ? 0 : [0, -1.5, 1.5, 0] }}
        transition={broken
          ? { duration: 1.15, ease: "easeOut" }
          : { duration: shouldReduceMotion ? 0.25 : 1.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <defs>
          <radialGradient id="streakGlow" cx="50%" cy="58%" r="48%">
            <stop offset="0%" stopColor={broken ? "rgba(225, 232, 235, 0.42)" : "rgba(255, 185, 73, 0.62)"} />
            <stop offset="52%" stopColor={broken ? "rgba(170, 180, 184, 0.18)" : "rgba(255, 93, 42, 0.24)"} />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
          <linearGradient id="outerFlame" x1="75" y1="24" x2="83" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={broken ? "#d3d8da" : "#ffdf63"} />
            <stop offset="34%" stopColor={broken ? "#aeb8bb" : "#ff8a2f"} />
            <stop offset="72%" stopColor={broken ? "#6f7a7d" : "#ff3f25"} />
            <stop offset="100%" stopColor={broken ? "#485155" : "#b6171a"} />
          </linearGradient>
          <linearGradient id="innerFlame" x1="82" y1="64" x2="82" y2="149" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={broken ? "#f0f2f2" : "#fff7a6"} />
            <stop offset="58%" stopColor={broken ? "#bcc4c6" : "#ffd24f"} />
            <stop offset="100%" stopColor={broken ? "#828d90" : "#ff7a1f"} />
          </linearGradient>
          <filter id="flameSoftGlow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values={broken
                ? "0.55 0 0 0 0.55 0 0.62 0 0 0.62 0 0 0.7 0 0.7 0 0 0 0.48 0"
                : "1 0 0 0 1 0 0.45 0 0 0.32 0 0 0.1 0 0 0 0 0 0.72 0"}
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="80" cy="105" rx="62" ry="66" fill="url(#streakGlow)" opacity={broken ? 0.45 : 0.85} />

        <motion.g
          style={{ transformOrigin: "80px 142px" }}
          animate={broken || shouldReduceMotion ? { scaleX: 1, scaleY: 1 } : { scaleX: [1, 0.94, 1.06, 1], scaleY: [1, 1.05, 0.97, 1] }}
          transition={{ duration: 1.05, repeat: broken || shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
          filter="url(#flameSoftGlow)"
        >
          <path
            d="M80 166c-31.5 0-57-22.8-57-55.7 0-22.8 14.1-42.7 30.7-59.1 12.5-12.3 20.6-24.5 19.4-39.2 19.9 9.1 33.1 25.4 36.3 45.3 7-4.5 11.4-11.4 12.9-20.3 15.9 16.2 20.7 34.8 17.4 52.8C134.4 129.5 112.6 166 80 166Z"
            fill="url(#outerFlame)"
            opacity={broken ? 0.58 : 1}
          />
          <motion.path
            d="M82 151c-18.6 0-33.3-13.3-33.3-32.4 0-12.5 8.3-24.3 18.3-33.7 7.3-6.9 12.7-16 11.1-27.6 14.2 8.5 22.2 20.7 22.7 34.1 5.3-2.1 9.8-6.5 12.5-12.6 8.1 11.4 10.1 24.1 6.7 36.1-5.3 18.6-19.2 36.1-38 36.1Z"
            fill="url(#innerFlame)"
            opacity={broken ? 0.5 : 0.96}
            style={{ transformOrigin: "82px 145px" }}
            animate={broken || shouldReduceMotion ? { scale: 1, y: 0 } : { scale: [1, 1.09, 0.98, 1.05], y: [0, -4, 1, -2] }}
            transition={{ duration: 0.82, repeat: broken || shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M58 129c-9.3-12.1-7.1-28.2 6.2-41.5 1.9 9 7.8 14.1 15.7 20.6-13.4 3.6-20 10.8-21.9 20.9Z"
            fill={broken ? "#a9b2b5" : "#ffd85b"}
            opacity={broken ? 0.38 : 0.78}
            animate={broken || shouldReduceMotion ? { opacity: 0.38 } : { opacity: [0.48, 0.92, 0.58] }}
            transition={{ duration: 0.7, repeat: broken || shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M103 132c8.6-13.9 6-30.1-6.5-41.1-0.8 9.3-6.1 15.7-14.1 22.9 12.1 2.8 18.2 9.7 20.6 18.2Z"
            fill={broken ? "#8f999d" : "#ffb33e"}
            opacity={broken ? 0.34 : 0.66}
            animate={broken || shouldReduceMotion ? { opacity: 0.34 } : { opacity: [0.38, 0.78, 0.45] }}
            transition={{ duration: 0.92, repeat: broken || shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
          />
        </motion.g>
      </motion.svg>

      {!broken && !shouldReduceMotion && (
        <motion.span
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: [0.75, 1.2, 0.98], opacity: [0, 0.28, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 12,
            borderRadius: "50%",
            border: "1px solid rgba(255, 163, 59, 0.28)",
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
  const hasActiveStreak = streak > 0
  const showMoment = hasActiveStreak || streakBroken
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
    setOpen(true)
  }, [displayStreak, hasActiveStreak, showMoment])

  if (!showMoment) return null

  const close = () => setOpen(false)
  const goWorkout = () => {
    setOpen(false)
    onGoWorkout()
  }

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

            <FireBurst broken={streakBroken && !hasActiveStreak} />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.28, ease: "easeOut" }}
            >
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.17em", color: "rgba(255, 255, 255, 0.48)", textTransform: "uppercase", marginBottom: 7 }}>
                Welcome back
              </div>
              <div style={{ fontSize: 25, lineHeight: 1.08, fontWeight: 950, letterSpacing: "-0.35px" }}>
                {hasActiveStreak ? `${displayStreak} day streak is alive` : "Your streak went quiet"}
              </div>
              <div style={{ maxWidth: 288, margin: "10px auto 0", color: "rgba(255, 255, 255, 0.64)", fontSize: 13, lineHeight: 1.48 }}>
                {hasActiveStreak
                  ? "Keep it warm with today's workout."
                  : displayStreak > 0
                    ? `That ${displayStreak} day run faded after a missed day. Start it again today.`
                    : "Start fresh today and build the next one."}
              </div>
            </motion.div>

            <ConfettiAroundButton />

            <motion.button
              type="button"
              onClick={goWorkout}
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
                background: hasActiveStreak ? "#6bbfb8" : "rgba(255, 255, 255, 0.12)",
                color: hasActiveStreak ? "#10201f" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                fontSize: 14,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              <Dumbbell size={17} strokeWidth={2.4} />
              <span>{hasActiveStreak ? "Go exercise" : "Restart streak"}</span>
              <ArrowRight size={16} strokeWidth={2.4} />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
