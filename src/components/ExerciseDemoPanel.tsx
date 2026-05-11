"use client"

import { useEffect, useMemo, useState } from "react"
import { getExerciseDemo } from "@/lib/exerciseDemos"

type ExerciseDemoPanelProps = {
  exerciseName: string
  compact?: boolean
  showName?: boolean
}

function DemoFrame({
  startSrc,
  endSrc,
  startFallbackSrcs,
  endFallbackSrcs,
  startAlt,
  endAlt,
}: {
  startSrc: string
  endSrc: string
  startFallbackSrcs: string[]
  endFallbackSrcs: string[]
  startAlt: string
  endAlt: string
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
    const timer = window.setInterval(() => {
      setPhase((current) => (current === "start" ? "end" : "start"))
    }, 2000)

    return () => window.clearInterval(timer)
  }, [])

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
    <div
      style={{
        position: "relative",
        minWidth: 0,
        height: "100%",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: "rgba(255, 255, 255, 0.03)",
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
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: visiblePhase === "start" ? 1 : 0,
                transition: "opacity 460ms ease",
              }}
            />
          )}
          {!endFailed && (
            <img
              src={endImageSrc}
              alt={endAlt}
              onError={() => handleImageError("end")}
              loading="lazy"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                opacity: visiblePhase === "end" ? 1 : 0,
                transition: "opacity 460ms ease",
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
    </div>
  )
}

export function ExerciseDemoPanel({
  exerciseName,
  compact = false,
  showName = false,
}: ExerciseDemoPanelProps) {
  const demo = useMemo(() => getExerciseDemo(exerciseName), [exerciseName])
  const visibleInstructions = compact ? demo.instructions.slice(0, 2) : demo.instructions

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "92px 1fr" : "128px 1fr",
        gap: compact ? "10px" : "14px",
        alignItems: "stretch",
        marginTop: compact ? "10px" : "14px",
        marginBottom: compact ? 0 : "14px",
        padding: compact ? "10px" : "12px",
        borderRadius: compact ? "14px" : "18px",
        border: "1px solid var(--border)",
        background: "var(--surface-2)",
      }}
    >
      <div
        style={{
          position: "relative",
          minHeight: compact ? "88px" : "126px",
          borderRadius: compact ? "11px" : "14px",
          overflow: "hidden",
          border: "1px solid rgba(107, 191, 184, 0.22)",
          background: "linear-gradient(135deg, rgba(107,191,184,0.14), rgba(255,255,255,0.04))",
        }}
      >
        <DemoFrame
          startSrc={demo.startAssetPath}
          endSrc={demo.endAssetPath}
          startFallbackSrcs={[demo.startFallbackAssetPath, demo.fallbackImagePath]}
          endFallbackSrcs={[demo.endFallbackAssetPath, demo.fallbackImagePath]}
          startAlt={`${demo.name} start position`}
          endAlt={`${demo.name} end position`}
        />
      </div>

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
