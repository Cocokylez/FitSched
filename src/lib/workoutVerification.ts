import { useCallback, useEffect, useRef, useState } from "react"

export type VerificationState = "idle" | "requesting" | "active" | "denied"
export type VerificationMethod = "motion" | "unverified"

export interface VerificationResult {
  score: number
  multiplier: number
  method: VerificationMethod
}

export function useWorkoutVerification() {
  const [state, setState] = useState<VerificationState>("idle")
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null)
  const magsRef = useRef<number[]>([])
  const motionActiveRef = useRef(false)

  const start = useCallback(async () => {
    setState("requesting")

    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        const perm = await (DeviceMotionEvent as any).requestPermission()
        if (perm !== "granted") throw new Error("denied")
      }

      const handler = (e: DeviceMotionEvent) => {
        const g = e.accelerationIncludingGravity
        if (!g) return
        const mag = Math.sqrt((g.x ?? 0) ** 2 + (g.y ?? 0) ** 2 + (g.z ?? 0) ** 2)
        magsRef.current.push(mag)
        if (magsRef.current.length > 3000) magsRef.current.shift()
      }

      motionHandlerRef.current = handler
      window.addEventListener("devicemotion", handler)
      motionActiveRef.current = true
    } catch {
      motionActiveRef.current = false
    }

    setState(motionActiveRef.current ? "active" : "denied")
  }, [])

  const getResult = useCallback((elapsedSeconds: number): VerificationResult => {
    const motion = motionActiveRef.current
    const raw = motion ? scoreMotion(magsRef.current) : 0.5
    const method: VerificationMethod = motion ? "motion" : "unverified"

    const timeFactor = !motion ? 1.0
      : elapsedSeconds >= 600 ? 1.0
      : elapsedSeconds >= 300 ? 0.7
      : elapsedSeconds >= 120 ? 0.4
      : 0.15

    const score = Math.min(1, Math.max(0, raw * timeFactor))
    const multiplier = score >= 0.55 ? 1.0 : score >= 0.25 ? 0.5 : 0.0

    return { score, multiplier, method }
  }, [])

  const stop = useCallback(() => {
    if (motionHandlerRef.current) window.removeEventListener("devicemotion", motionHandlerRef.current)
    motionHandlerRef.current = null
    motionActiveRef.current = false
  }, [])

  useEffect(() => () => stop(), [stop])

  return { state, start, getResult, stop }
}

function scoreMotion(mags: number[]): number {
  if (mags.length < 30) return 0.5
  const recent = mags.slice(-300)
  const mean = recent.reduce((s, v) => s + v, 0) / recent.length
  const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length
  const std = Math.sqrt(variance)
  if (std < 0.35) return 0.1
  if (std < 0.9) return 0.45
  if (std < 2.5) return 0.88
  return 1.0
}
