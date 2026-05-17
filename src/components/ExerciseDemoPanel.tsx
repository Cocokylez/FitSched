"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { getExerciseDemo } from "@/lib/exerciseDemos"

type ExerciseDemoPanelProps = {
  exerciseName: string
  compact?: boolean
  showName?: boolean
  showVisual?: boolean
}

type ExerciseDemoVisualProps = {
  exerciseName: string
  compact?: boolean
  height?: number | string
  objectFit?: "cover" | "contain"
  timerText?: string
  paused?: boolean
  active?: boolean
  onToggleTimer?: () => void
}

function DemoFrame({
  startSrc,
  endSrc,
  startFallbackSrcs,
  endFallbackSrcs,
  startAlt,
  endAlt,
  objectFit = "contain",
  timerText,
  paused = false,
  active = false,
  onToggleTimer,
}: {
  startSrc: string
  endSrc: string
  startFallbackSrcs: string[]
  endFallbackSrcs: string[]
  startAlt: string
  endAlt: string
  objectFit?: "cover" | "contain"
  timerText?: string
  paused?: boolean
  active?: boolean
  onToggleTimer?: () => void
}) {
  const [phase, setPhase] = useState<"start" | "end">("start")
  const [startImageSrc, setStartImageSrc] = useState(startSrc)
  const [endImageSrc, setEndImageSrc] = useState(endSrc)
  const [startFallbackIndex, setStartFallbackIndex] = useState(0)
  const [endFallbackIndex, setEndFallbackIndex] = useState(0)
  const [startFailed, setStartFailed] = useState(false)
  const [endFailed, setEndFailed] = useState(false)

  useEffect(() => {
    setPhase("start")
    setStartImageSrc(startSrc)
    setEndImageSrc(endSrc)
    setStartFallbackIndex(0)
    setEndFallbackIndex(0)
    setStartFailed(false)
    setEndFailed(false)
  }, [startSrc, endSrc])

  useEffect(() => {
    if (!active) return

    const timer = window.setInterval(() => {
      setPhase((current) => (current === "start" ? "end" : "start"))
    }, 2000)

    return () => window.clearInterval(timer)
  }, [active])

  const handleImageError = (position: "start" | "end") => {
    if (position === "start") {
      if (startFallbackIndex < startFallbackSrcs.length) {
        setStartImageSrc(startFallbackSrcs[startFallbackIndex])
        setStartFallbackIndex((index) => index + 1)
        return
      }

      setStartFailed(true)
      return
    }

    if (endFallbackIndex < endFallbackSrcs.length) {
      setEndImageSrc(endFallbackSrcs[endFallbackIndex])
      setEndFallbackIndex((index) => index + 1)
      return
    }

    setEndFailed(true)
  }

  const visiblePhase = startFailed ? "end" : endFailed ? "start" : phase

  return (
    <button
      type="button"
      onClick={onToggleTimer}
      aria-label={onToggleTimer ? (paused ? "Resume timer" : "Pause timer") : undefined}
      style={{
        position: "relative",
        minWidth: 0,
        width: "100%",
        height: "100%",
        border: "none",
        padding: 0,
        color: "inherit",
        font: "inherit",
        cursor: onToggleTimer ? "pointer" : "default",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: "rgba(255, 255, 255, 0.03)",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {startFailed && endFailed ? (
        <div style={{ color: "var(--text-muted)", fontSize: "9px", fontWeight: 800, textAlign: "center", padding: "6px" }}>
          Pending
        </div>
      ) : (
        <>
          {!startFailed && (
            <img
              src={startImageSrc}
              alt={startAlt}
              onError={() => handleImageError("start")}
              loading="lazy"
              decoding="async"
              fetchPriority={active ? "auto" : "low"}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit,
                display: "block",
                opacity: visiblePhase === "start" ? 1 : 0,
                transition: "opacity 460ms ease",
                transform: "translateZ(0)",
              }}
            />
          )}
          {!endFailed && (
            <img
              src={endImageSrc}
              alt={endAlt}
              onError={() => handleImageError("end")}
              loading="lazy"
              decoding="async"
              fetchPriority={active ? "auto" : "low"}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit,
                display: "block",
                opacity: visiblePhase === "end" ? 1 : 0,
                transition: "opacity 460ms ease",
                transform: "translateZ(0)",
              }}
            />
          )}
        </>
      )}
      <div
        style={{
          position: "absolute",
          left: "5px",
          bottom: "5px",
          padding: "2px 5px",
          borderRadius: "999px",
          background: "rgba(0, 0, 0, 0.5)",
          color: "#ffffff",
          fontSize: "8px",
          fontWeight: 900,
          letterSpacing: 0,
        }}
      >
        {visiblePhase === "start" ? "START" : "END"}
      </div>
      {timerText && (
        <div
          style={{
            position: "absolute",
            right: "7px",
            bottom: "7px",
            borderRadius: "999px",
            padding: paused ? "5px 8px" : "6px 9px",
            background: "rgba(15, 18, 18, 0.74)",
            border: "1px solid rgba(107, 191, 184, 0.32)",
            color: "#7fd8d1",
            fontSize: paused ? "11px" : "13px",
            fontWeight: 950,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
            opacity: paused ? 0.72 : 1,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {timerText}
        </div>
      )}
    </button>
  )
}

export function ExerciseDemoVisual({
  exerciseName,
  compact = false,
  height,
  objectFit = "contain",
  timerText,
  paused = false,
  onToggleTimer,
}: ExerciseDemoVisualProps) {
  const demo = useMemo(() => getExerciseDemo(exerciseName), [exerciseName])
  const frameHeight = height ?? (compact ? 88 : 126)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = frameRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin: "160px 0px" },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={frameRef}
      style={{
        position: "relative",
        minHeight: typeof frameHeight === "number" ? `${frameHeight}px` : frameHeight,
        height: typeof frameHeight === "number" ? `${frameHeight}px` : frameHeight,
        borderRadius: compact ? "11px" : "14px",
        overflow: "hidden",
        border: "1px solid rgba(107, 191, 184, 0.22)",
        background: "linear-gradient(135deg, rgba(107,191,184,0.14), rgba(255,255,255,0.04))",
        contain: "layout paint style",
      }}
    >
      <DemoFrame
        startSrc={demo.startAssetPath}
        endSrc={demo.endAssetPath}
        startFallbackSrcs={[demo.startFallbackAssetPath, demo.startSvgFallbackAssetPath, demo.fallbackImagePath]}
        endFallbackSrcs={[demo.endFallbackAssetPath, demo.endSvgFallbackAssetPath, demo.fallbackImagePath]}
        startAlt={`${demo.name} start position`}
        endAlt={`${demo.name} end position`}
        objectFit={objectFit}
        timerText={timerText}
        paused={paused}
        active={isInView}
        onToggleTimer={onToggleTimer}
      />
    </div>
  )
}

export function ExerciseDemoPanel({
  exerciseName,
  compact = false,
  showName = false,
  showVisual = true,
}: ExerciseDemoPanelProps) {
  const demo = useMemo(() => getExerciseDemo(exerciseName), [exerciseName])
  const visibleInstructions = compact ? demo.instructions.slice(0, 2) : demo.instructions

  return (
    <div
      className="exercise-demo-panel"
      style={{
        display: "grid",
        gridTemplateColumns: showVisual ? (compact ? "92px 1fr" : "128px 1fr") : "1fr",
        gap: compact ? "10px" : "14px",
        alignItems: "stretch",
        marginTop: showVisual ? (compact ? "10px" : "14px") : 0,
        marginBottom: showVisual ? (compact ? 0 : "14px") : "10px",
        padding: showVisual ? (compact ? "10px" : "12px") : 0,
        borderRadius: compact ? "14px" : "18px",
        border: showVisual ? "1px solid var(--border)" : "none",
        background: showVisual ? "var(--surface-2)" : "transparent",
      }}
    >
      {showVisual && <ExerciseDemoVisual exerciseName={demo.name} compact={compact} />}

      <div style={{ minWidth: 0 }}>
        {showName && (
          <div style={{ fontSize: compact ? "13px" : "16px", fontWeight: 900, color: "var(--text)", marginBottom: "4px" }}>
            {demo.name}
          </div>
        )}
        <div style={{ fontSize: compact ? "12px" : "13px", color: "var(--text-muted)", lineHeight: 1.45, marginBottom: "8px" }}>
          {demo.description}
        </div>
        <ol style={{ margin: 0, paddingLeft: "18px", color: "var(--text)", fontSize: compact ? "11px" : "12px", lineHeight: 1.5 }}>
          {visibleInstructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
        {!compact && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
            {demo.targetMuscles.slice(0, 4).map((muscle) => (
              <span
                key={muscle}
                style={{
                  borderRadius: "999px",
                  padding: "4px 8px",
                  background: "rgba(107, 191, 184, 0.12)",
                  color: "#6bbfb8",
                  fontSize: "10px",
                  fontWeight: 850,
                }}
              >
                {muscle}
              </span>
            ))}
            <span
              style={{
                borderRadius: "999px",
                padding: "4px 8px",
                background: "var(--surface)",
                color: "var(--text-muted)",
                fontSize: "10px",
                fontWeight: 850,
              }}
            >
              {demo.difficulty}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
