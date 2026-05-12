"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Dumbbell, Flame, X } from "lucide-react"
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
    <div style={{ position: "relative", width: 126, height: 126, margin: "0 auto 16px" }}>
      <motion.div
        initial={{ scale: 0.48, opacity: 0, y: 22 }}
        animate={broken
          ? { scale: [0.48, 1.08, 0.82], opacity: [0, 1, 0.48], y: [22, 0, 0], rotate: [0, -6, 5] }
          : { scale: shouldReduceMotion ? 1 : [0.48, 1.12, 1], opacity: 1, y: 0, rotate: shouldReduceMotion ? 0 : [0, -2, 2, 0] }}
        transition={broken
          ? { duration: 1.15, ease: "easeOut" }
          : { duration: shouldReduceMotion ? 0.25 : 1.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 126,
          height: 126,
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: broken ? "rgba(255, 255, 255, 0.42)" : "#6bbfb8",
          background: broken
            ? "linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035))"
            : "radial-gradient(circle at 50% 35%, rgba(107, 191, 184, 0.26), rgba(107, 191, 184, 0.09) 55%, rgba(255, 255, 255, 0.045))",
          border: broken ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(107, 191, 184, 0.34)",
          boxShadow: broken
            ? "inset 0 1px 0 rgba(255, 255, 255, 0.08)"
            : "inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 22px 58px rgba(107, 191, 184, 0.16)",
        }}
      >
        <Flame size={62} strokeWidth={2.15} />
      </motion.div>

      {!broken && !shouldReduceMotion && (
        <motion.span
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: [0.75, 1.18, 0.96], opacity: [0, 0.42, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: 42,
            border: "1px solid rgba(107, 191, 184, 0.34)",
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
              overflow: "hidden",
              borderRadius: 28,
              padding: "22px",
              color: "#ffffff",
              background: hasActiveStreak
                ? "linear-gradient(145deg, rgba(23, 39, 38, 0.98), rgba(20, 24, 24, 0.97))"
                : "linear-gradient(145deg, rgba(31, 31, 31, 0.98), rgba(19, 21, 21, 0.97))",
              border: hasActiveStreak ? "1px solid rgba(107, 191, 184, 0.28)" : "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 26px 90px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.10)",
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
