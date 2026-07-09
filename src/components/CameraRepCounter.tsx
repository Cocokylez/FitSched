"use client"

/**
 * CameraRepCounter — on-device pose-based rep counting (Beta).
 *
 * Runs Google MediaPipe PoseLandmarker entirely in the browser: no video frame
 * ever leaves the phone. The model (~5 MB) and wasm runtime load lazily the
 * first time a user turns the camera on, and are cached module-wide so later
 * sets and remounts start instantly.
 */

import { useEffect, useRef, useState } from "react"
import { RepCounter, type CameraExerciseType } from "@/lib/repCounter"
import type { PoseLandmarker } from "@mediapipe/tasks-vision"

const WASM_URL  = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

// Cached across mounts — loading the model is the slow part (~1-3s on 4G).
let landmarkerPromise: Promise<PoseLandmarker> | null = null

async function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision")
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      })
    })().catch((err) => {
      landmarkerPromise = null // allow retry after a failed load
      throw err
    })
  }
  return landmarkerPromise
}

export interface CameraRepCounterLabels {
  starting: string
  denied: string
  tip: string
  stop: string
}

interface Props {
  exerciseType: CameraExerciseType
  targetReps: number
  accentColor: string
  labels: CameraRepCounterLabels
  /** Fired once when the rep target is reached. */
  onTargetReached: () => void
  /** User tapped the stop button. */
  onStop: () => void
}

type CamState = "loading" | "active" | "denied"

export default function CameraRepCounter({ exerciseType, targetReps, accentColor, labels, onTargetReached, onStop }: Props) {
  const videoRef  = useRef<HTMLVideoElement | null>(null)
  const [camState, setCamState] = useState<CamState>("loading")
  const [reps, setReps]         = useState(0)
  const [poseSeen, setPoseSeen] = useState(false)

  const onTargetReachedRef = useRef(onTargetReached)
  onTargetReachedRef.current = onTargetReached

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let rafId = 0
    let firedTarget = false
    const counter = new RepCounter(exerciseType)

    async function start() {
      try {
        const [lm, media] = await Promise.all([
          getLandmarker(),
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          }),
        ])
        if (cancelled) { media.getTracks().forEach((t) => t.stop()); return }

        stream = media
        const video = videoRef.current
        if (!video) return
        video.srcObject = media
        await video.play()
        if (cancelled) return
        setCamState("active")

        let lastVideoTime = -1
        const loop = () => {
          if (cancelled) return
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime
            const now = performance.now()
            const result = lm.detectForVideo(video, now)
            const phase = counter.update(result.landmarks?.[0], now)
            setPoseSeen(phase !== "no_pose")
            setReps(counter.reps)
            if (!firedTarget && counter.reps >= targetReps) {
              firedTarget = true
              onTargetReachedRef.current()
              return // parent advances to rest — stop the loop, effect cleanup stops the camera
            }
          }
          rafId = requestAnimationFrame(loop)
        }
        rafId = requestAnimationFrame(loop)
      } catch {
        if (!cancelled) setCamState("denied")
      }
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [exerciseType, targetReps])

  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "#000", aspectRatio: "4 / 3" }}>
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: camState === "active" ? "block" : "none" }}
      />

      {camState !== "active" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>
          {camState === "loading" ? labels.starting : labels.denied}
        </div>
      )}

      {camState === "active" && (
        <>
          {/* Rep counter */}
          <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "baseline", gap: 4, background: "rgba(0,0,0,0.55)", borderRadius: 14, padding: "8px 14px", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: accentColor, lineHeight: 1 }}>{reps}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.75)" }}>/ {targetReps}</span>
          </div>

          {/* Pose-lock indicator */}
          <div style={{ position: "absolute", top: 12, right: 12, width: 10, height: 10, borderRadius: 999, background: poseSeen ? "#22c55e" : "#f59e0b", boxShadow: "0 0 0 3px rgba(0,0,0,0.4)" }} />

          {/* Body-in-frame tip while no pose is detected */}
          {!poseSeen && (
            <div style={{ position: "absolute", left: 12, right: 12, bottom: 52, textAlign: "center", background: "rgba(0,0,0,0.55)", borderRadius: 12, padding: "7px 10px", color: "#fff", fontSize: 11.5, fontWeight: 700, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
              {labels.tip}
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onStop}
        style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(0,0,0,0.5)", borderRadius: 999, padding: "6px 16px", fontSize: 12, fontWeight: 800, color: "#fff", cursor: "pointer", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      >
        {labels.stop}
      </button>
    </div>
  )
}
