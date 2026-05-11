"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Dumbbell, Flame } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

type StreakWelcomeCardProps = {
  streak: number
  previousStreak: number
  streakBroken: boolean
  onGoWorkout: () => void
}

const confettiColors = ["#6bbfb8", "#f6c85f", "#ff8a65", "#8fa8ff", "#ffffff"]

function ConfettiBurst() {
  const shouldReduceMotion = useReducedMotion()
  const pieces = useMemo(() => {
    return Array.from({ length: 28 }, (_, index) => ({
      id: index,
      x: ((index * 53) % 260) - 130,
      y: -48 - ((index * 37) % 150),
      rotate: ((index * 71) % 360) - 180,
      color: confettiColors[index % confettiColors.length],
      width: 5 + (index % 3) * 2,
      height: 8 + (index % 4) * 2,
      delay: (index % 7) * 0.035,
    }))
  }, [])

  if (shouldReduceMotion) return null

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          initial={{ opacity: 0, x: 0, y: 28, rotate: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], x: piece.x, y: piece.y, rotate: piece.rotate, scale: [0.8, 1, 0.92] }}
          transition={{ duration: 1.9, delay: piece.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: "50%",
            bottom: "28px",
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

function FireStatus({ broken }: { broken: boolean }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div style={{ position: "relative", width: 54, height: 54, flex: "0 0 auto" }}>
      <motion.div
        initial={false}
        animate={broken
          ? { scale: [1, 1.08, 0.72], rotate: [0, -8, 7], opacity: [1, 0.76, 0.36] }
          : { scale: shouldReduceMotion ? 1 : [1, 1.06, 1], rotate: shouldReduceMotion ? 0 : [0, -2, 2, 0] }}
        transition={broken
          ? { duration: 1.15, ease: "easeOut" }
          : { duration: 1.8, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
        style={{
          width: 54,
          height: 54,
          borderRadius: "17px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: broken ? "rgba(255, 255, 255, 0.42)" : "#6bbfb8",
          background: broken ? "rgba(255, 255, 255, 0.06)" : "rgba(107, 191, 184, 0.13)",
          border: broken ? "1px solid rgba(255, 255, 255, 0.10)" : "1px solid rgba(107, 191, 184, 0.28)",
        }}
      >
        <Flame size={26} strokeWidth={2.2} />
      </motion.div>

      {broken && !shouldReduceMotion && (
        <>
          {[0, 1, 2].map((line) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, x: -22, scaleX: 0.25 }}
              animate={{ opacity: [0, 0.75, 0], x: 42, scaleX: [0.25, 1, 0.6] }}
              transition={{ duration: 1, delay: line * 0.12, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: 14 + line * 9,
                left: -10,
                width: 30,
                height: 2,
                borderRadius: 999,
                background: "rgba(220, 235, 240, 0.62)",
                transformOrigin: "left center",
              }}
            />
          ))}
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={`smoke-${dot}`}
              initial={{ opacity: 0, y: 4, scale: 0.7 }}
              animate={{ opacity: [0, 0.52, 0], y: -28 - dot * 5, scale: [0.7, 1.2, 1.5] }}
              transition={{ duration: 1.35, delay: 0.55 + dot * 0.12, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: 23 + dot * 4,
                top: 4,
                width: 7 + dot * 2,
                height: 7 + dot * 2,
                borderRadius: "50%",
                background: "rgba(220, 235, 240, 0.28)",
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
  const [showConfetti, setShowConfetti] = useState(false)
  const hasActiveStreak = streak > 0
  const showCard = hasActiveStreak || streakBroken

  useEffect(() => {
    if (!hasActiveStreak) return

    setShowConfetti(true)
    const timer = window.setTimeout(() => setShowConfetti(false), 2200)
    return () => window.clearTimeout(timer)
  }, [hasActiveStreak, streak])

  if (!showCard) return null

  const displayStreak = hasActiveStreak ? streak : previousStreak

  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        padding: 1,
        marginBottom: 18,
        background: hasActiveStreak
          ? "linear-gradient(135deg, rgba(107, 191, 184, 0.58), rgba(255, 255, 255, 0.08) 42%, rgba(107, 191, 184, 0.20))"
          : "linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(107, 191, 184, 0.06), rgba(255, 255, 255, 0.08))",
      }}
    >
      <AnimatePresence>{showConfetti && <ConfettiBurst />}</AnimatePresence>
      <div
        style={{
          position: "relative",
          borderRadius: 21,
          padding: "16px",
          background: hasActiveStreak
            ? "linear-gradient(145deg, rgba(26, 38, 37, 0.96), rgba(27, 31, 31, 0.94))"
            : "linear-gradient(145deg, rgba(31, 31, 31, 0.96), rgba(26, 26, 26, 0.94))",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <FireStatus broken={streakBroken && !hasActiveStreak} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", color: "rgba(255, 255, 255, 0.48)", textTransform: "uppercase", marginBottom: 5 }}>
              Welcome back
            </div>
            <div style={{ fontSize: 20, lineHeight: 1.12, fontWeight: 950, color: "#ffffff", letterSpacing: "-0.2px" }}>
              {hasActiveStreak ? `${displayStreak} day streak is alive` : "Your streak went quiet"}
            </div>
            <div style={{ color: "rgba(255, 255, 255, 0.62)", fontSize: 12, lineHeight: 1.45, marginTop: 7 }}>
              {hasActiveStreak
                ? "Keep the rhythm warm with today's workout."
                : displayStreak > 0
                  ? `That ${displayStreak} day run faded after a missed day. Start it again today.`
                  : "Start fresh today and build the next one."}
            </div>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onGoWorkout}
          whileTap={{ scale: 0.985 }}
          style={{
            marginTop: 14,
            width: "100%",
            border: "none",
            borderRadius: 15,
            padding: "13px 14px",
            background: hasActiveStreak ? "#6bbfb8" : "rgba(255, 255, 255, 0.10)",
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
          <span>{hasActiveStreak ? "Go workout" : "Restart streak"}</span>
          <ArrowRight size={16} strokeWidth={2.4} />
        </motion.button>
      </div>
    </motion.section>
  )
}
