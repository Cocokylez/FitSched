import { useCallback, useEffect, useRef, useState } from "react"

export type VerificationState = "idle" | "requesting" | "active" | "denied"
export type VerificationMethod = "breath+motion" | "motion" | "breath" | "unverified"
export type ChallengePhase = "hold" | "breathe"

export interface ActiveChallenge {
  phase: ChallengePhase
  countdown: number
  ping: 1 | 2        // which hold in the sequence
  totalPings: 2      // always 2 — shown as "1/2" and "2/2"
}

export interface VerificationResult {
  score: number
  multiplier: number
  method: VerificationMethod
}

const SAMPLE_MS = 150
const CALIBRATION_SAMPLES = 14   // ~2 seconds of silence
const MAX_RMS_HISTORY = 800      // ~2 minutes
const MAX_CHALLENGES = 2
const HOLD_SECONDS = 2           // each hold is 2s
const BREATHE_BETWEEN_SECONDS = 2
const BREATHE_AFTER_SECONDS = 2

export function useWorkoutVerification() {
  const [state, setState] = useState<VerificationState>("idle")
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const challengeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null)

  const rmsRef = useRef<number[]>([])
  const calibRef = useRef<number[]>([])
  const floorRef = useRef(0.008)
  const calibratedRef = useRef(false)
  const magsRef = useRef<number[]>([])
  const micActiveRef = useRef(false)
  const motionActiveRef = useRef(false)
  const challengeCountRef = useRef(0)
  const challengeResultsRef = useRef<boolean[]>([])

  const start = useCallback(async () => {
    setState("requesting")

    function scheduleNextChallenge() {
      if (challengeCountRef.current >= MAX_CHALLENGES) return
      // Wide random window — hard to anticipate even if someone reads the source
      const delay = challengeCountRef.current === 0
        ? 45_000 + Math.random() * 105_000   // 45s–150s from calibration
        : 60_000 + Math.random() * 120_000   // 60s–180s after previous challenge
      challengeTimerRef.current = setTimeout(runChallenge, delay)
    }

    function runChallenge() {
      challengeCountRef.current++

      // Snapshot baseline from last ~2s of breathing
      const recent = rmsRef.current.slice(-14)
      const baseline = recent.length > 0
        ? recent.reduce((s, v) => s + v, 0) / recent.length
        : floorRef.current

      // Two-ping challenge: HOLD → BREATHE → HOLD → BREATHE → evaluate both
      // Each hold captures its own RMS window independently.

      let holdStartIdx1 = 0
      let holdStartIdx2 = 0
      let hCount = HOLD_SECONDS

      holdStartIdx1 = rmsRef.current.length
      setChallenge({ phase: "hold", countdown: hCount, ping: 1, totalPings: 2 })

      countdownRef.current = setInterval(() => {
        hCount--
        if (hCount > 0) {
          setChallenge({ phase: "hold", countdown: hCount, ping: 1, totalPings: 2 })
        } else {
          clearInterval(countdownRef.current!)
          startBreatheBetween()
        }
      }, 1000)

      function startBreatheBetween() {
        let bCount = BREATHE_BETWEEN_SECONDS
        setChallenge({ phase: "breathe", countdown: bCount, ping: 1, totalPings: 2 })

        countdownRef.current = setInterval(() => {
          bCount--
          if (bCount > 0) {
            setChallenge({ phase: "breathe", countdown: bCount, ping: 1, totalPings: 2 })
          } else {
            clearInterval(countdownRef.current!)
            startHold2()
          }
        }, 1000)
      }

      function startHold2() {
        let hCount2 = HOLD_SECONDS
        holdStartIdx2 = rmsRef.current.length
        setChallenge({ phase: "hold", countdown: hCount2, ping: 2, totalPings: 2 })

        countdownRef.current = setInterval(() => {
          hCount2--
          if (hCount2 > 0) {
            setChallenge({ phase: "hold", countdown: hCount2, ping: 2, totalPings: 2 })
          } else {
            clearInterval(countdownRef.current!)
            evaluateBothHolds()
          }
        }, 1000)
      }

      function evaluateBothHolds() {
        const passed1 = evaluateHold(rmsRef.current.slice(holdStartIdx1, holdStartIdx1 + Math.ceil(HOLD_SECONDS * 1000 / SAMPLE_MS)), baseline)
        const passed2 = evaluateHold(rmsRef.current.slice(holdStartIdx2), baseline)

        // Both must pass — two independent chances to catch an audio loop
        challengeResultsRef.current.push(passed1 && passed2)

        let bCount = BREATHE_AFTER_SECONDS
        setChallenge({ phase: "breathe", countdown: bCount, ping: 2, totalPings: 2 })

        countdownRef.current = setInterval(() => {
          bCount--
          if (bCount > 0) {
            setChallenge({ phase: "breathe", countdown: bCount, ping: 2, totalPings: 2 })
          } else {
            clearInterval(countdownRef.current!)
            setChallenge(null)
            scheduleNextChallenge()
          }
        }, 1000)
      }
    }

    // Mic setup — bandpass filtered breath detection
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      streamRef.current = stream

      const ctx = new AudioContext()
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)

      // Bandpass ~100–600 Hz: captures breath sounds, rejects bass/treble
      const bp = ctx.createBiquadFilter()
      bp.type = "bandpass"
      bp.frequency.value = 280
      bp.Q.value = 0.5

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.3
      source.connect(bp)
      bp.connect(analyser)
      // NOT connected to destination — completely silent

      const buf = new Float32Array(analyser.fftSize)
      sampleTimerRef.current = setInterval(() => {
        analyser.getFloatTimeDomainData(buf)
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length)

        if (!calibratedRef.current) {
          calibRef.current.push(rms)
          if (calibRef.current.length >= CALIBRATION_SAMPLES) {
            floorRef.current = calibRef.current.reduce((s, v) => s + v, 0) / calibRef.current.length
            calibratedRef.current = true
            scheduleNextChallenge()
          }
        } else {
          rmsRef.current.push(rms)
          if (rmsRef.current.length > MAX_RMS_HISTORY) rmsRef.current.shift()
        }
      }, SAMPLE_MS)

      micActiveRef.current = true
    } catch {
      micActiveRef.current = false
    }

    // Motion setup
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

    setState(micActiveRef.current || motionActiveRef.current ? "active" : "denied")
  }, [])

  const getResult = useCallback((elapsedSeconds: number): VerificationResult => {
    const breathScore = scoreBreath(rmsRef.current, floorRef.current)
    const motionScore = scoreMotion(magsRef.current)

    const mic = micActiveRef.current
    const motion = motionActiveRef.current

    let raw: number
    let method: VerificationMethod

    if (mic && motion) {
      raw = breathScore * 0.65 + motionScore * 0.35
      method = "breath+motion"
    } else if (mic) {
      raw = breathScore
      method = "breath"
    } else if (motion) {
      raw = motionScore
      method = "motion"
    } else {
      raw = 0.5
      method = "unverified"
    }

    // Both pings must pass — failing either is a strong cheat signal
    const results = challengeResultsRef.current
    let challengeMultiplier = 1.0
    if (results.length > 0) {
      const passRate = results.filter(Boolean).length / results.length
      if (passRate === 0) challengeMultiplier = 0.05   // failed all — almost certainly an audio loop
      else if (passRate < 0.5) challengeMultiplier = 0.45
    }

    // Client-side time penalty (server also applies its own via session token)
    const timeFactor =
      elapsedSeconds >= 600 ? 1.0
      : elapsedSeconds >= 300 ? 0.7
      : elapsedSeconds >= 120 ? 0.4
      : 0.15

    const score = Math.min(1, Math.max(0, raw * timeFactor * challengeMultiplier))
    const multiplier = score >= 0.55 ? 1.0 : score >= 0.25 ? 0.5 : 0.0

    return { score, multiplier, method }
  }, [])

  const stop = useCallback(() => {
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current)
    if (challengeTimerRef.current) clearTimeout(challengeTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (motionHandlerRef.current) window.removeEventListener("devicemotion", motionHandlerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    ctxRef.current?.close().catch(() => {})
    setChallenge(null)
  }, [])

  useEffect(() => () => stop(), [stop])

  return { state, challenge, start, getResult, stop }
}

// Evaluates a single hold window: did amplitude drop >55% below pre-hold baseline?
function evaluateHold(samples: number[], baseline: number): boolean {
  if (samples.length === 0) return true  // no data — give benefit of doubt
  const holdAvg = samples.reduce((s, v) => s + v, 0) / samples.length
  // Only testable if baseline was elevated above ambient noise
  const testable = baseline > floorRef_global * 2.2
  return testable ? holdAvg < baseline * 0.45 : true
}

// Module-level ref share for evaluateHold — populated in start()
let floorRef_global = 0.008

function scoreBreath(history: number[], floor: number): number {
  floorRef_global = floor
  if (history.length < 20) return 0.5
  const windowSize = Math.min(history.length, 200)
  const recent = history.slice(-windowSize)
  const peaks = findPeaks(recent, floor)
  const durationSec = (windowSize * SAMPLE_MS) / 1000
  const peaksPerMin = (peaks.length / durationSec) * 60

  if (peaksPerMin < 8) return 0.15
  if (peaksPerMin > 130) return 0.2
  if (peaksPerMin >= 18 && peaksPerMin <= 90) return 0.95
  if (peaksPerMin >= 8 && peaksPerMin < 18) return 0.6
  return 0.45
}

function findPeaks(data: number[], floor: number): number[] {
  const threshold = Math.max(floor * 1.65, 0.004)
  const minGap = 3
  const peaks: number[] = []
  let last = -minGap
  for (let i = 1; i < data.length - 1; i++) {
    if (
      data[i] > threshold &&
      data[i] >= data[i - 1] &&
      data[i] >= data[i + 1] &&
      i - last >= minGap
    ) {
      peaks.push(i)
      last = i
    }
  }
  return peaks
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
