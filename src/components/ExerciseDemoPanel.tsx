"use client"

import { useEffect, useMemo, useState } from "react"
import { getExerciseDemo } from "@/lib/exerciseDemos"

type ExerciseDemoPanelProps = {
  exerciseName: string
  compact?: boolean
  showName?: boolean
}

function DemoFrame({
  src,
  fallbackSrc,
  alt,
  label,
}: {
  src: string
  fallbackSrc: string
  alt: string
  label: string
}) {
  const [imageSrc, setImageSrc] = useState(src)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageSrc(src)
    setImageFailed(false)
  }, [src])

  const handleImageError = () => {
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc)
      return
    }

    setImageFailed(true)
  }

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
      {imageFailed ? (
        <div style={{ color: "var(--text-muted)", fontSize: "9px", fontWeight: 800, textAlign: "center", padding: "6px" }}>
          Pending
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
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
        {label}
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
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        <DemoFrame
          src={demo.startAssetPath}
          fallbackSrc={demo.fallbackImagePath}
          alt={`${demo.name} start position`}
          label="START"
        />
        <DemoFrame
          src={demo.endAssetPath}
          fallbackSrc={demo.fallbackImagePath}
          alt={`${demo.name} end position`}
          label="END"
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
