"use client"

import { useEffect, useMemo, useState } from "react"
import { getExerciseDemo } from "@/lib/exerciseDemos"

type ExerciseDemoPanelProps = {
  exerciseName: string
  compact?: boolean
  showName?: boolean
}

export function ExerciseDemoPanel({
  exerciseName,
  compact = false,
  showName = false,
}: ExerciseDemoPanelProps) {
  const demo = useMemo(() => getExerciseDemo(exerciseName), [exerciseName])
  const [imageSrc, setImageSrc] = useState(demo.demoAssetPath)
  const [imageFailed, setImageFailed] = useState(false)
  const visibleInstructions = compact ? demo.instructions.slice(0, 2) : demo.instructions

  useEffect(() => {
    setImageSrc(demo.demoAssetPath)
    setImageFailed(false)
  }, [demo.demoAssetPath])

  const handleImageError = () => {
    if (imageSrc !== demo.fallbackImagePath) {
      setImageSrc(demo.fallbackImagePath)
      return
    }

    setImageFailed(true)
  }

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
          display: "grid",
          placeItems: "center",
        }}
      >
        {imageFailed ? (
          <div style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 800, textAlign: "center", padding: "10px" }}>
            Demo asset pending
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={`${demo.name} exercise demo`}
            onError={handleImageError}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: "8px",
            bottom: "8px",
            padding: "3px 7px",
            borderRadius: "999px",
            background: "rgba(0, 0, 0, 0.45)",
            color: "#ffffff",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: 0,
          }}
        >
          DEMO
        </div>
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
