/**
 * repCounter.ts — pose-landmark rep counting for camera-assisted sets.
 *
 * Pure logic, no React and no MediaPipe imports: the component feeds it the 33
 * pose landmarks each frame and it returns the rep count. Counting is a
 * two-phase state machine on a joint angle with hysteresis — the angle must
 * cross the "down" threshold and come back above the "up" threshold for one
 * rep, so jitter around a single threshold can never double-count.
 *
 * Phase 1 supports the two exercises a phone camera reads most reliably:
 *   squat  — knee angle (hip→knee→ankle)
 *   pushup — elbow angle (shoulder→elbow→wrist)
 */

export type CameraExerciseType = "squat" | "pushup"

export interface PoseLandmark {
  x: number
  y: number
  z: number
  visibility?: number
}

// MediaPipe PoseLandmarker indices (left, right)
const SHOULDER = [11, 12] as const
const ELBOW    = [13, 14] as const
const WRIST    = [15, 16] as const
const HIP      = [23, 24] as const
const KNEE     = [25, 26] as const
const ANKLE    = [27, 28] as const

interface ExerciseSpec {
  /** [proximal, pivot, distal] landmark index pairs — angle measured at pivot. */
  joints: readonly [readonly [number, number], readonly [number, number], readonly [number, number]]
  /** Angle below this = bottom of the rep. */
  downAngle: number
  /** Angle above this = back at the top → rep counted. */
  upAngle: number
}

const SPECS: Record<CameraExerciseType, ExerciseSpec> = {
  squat:  { joints: [HIP, KNEE, ANKLE],       downAngle: 105, upAngle: 155 },
  pushup: { joints: [SHOULDER, ELBOW, WRIST], downAngle: 100, upAngle: 150 },
}

/** Landmarks dimmer than this are treated as "not in frame". */
const MIN_VISIBILITY = 0.5

/** ms a phase must hold before it can flip — absorbs single-frame flicker. */
const MIN_PHASE_MS = 250

/**
 * Map a raw exercise name (stored in English) to a supported camera exercise.
 * Deliberately conservative: only unambiguous names match, everything else
 * returns null and the camera option simply isn't offered.
 */
export function getCameraExerciseType(name: string): CameraExerciseType | null {
  const n = name.toLowerCase()
  // "split squat" etc. move on one leg at a time — the knee-angle machine still
  // works, so squat variants are allowed. Pistol squats excluded (too noisy).
  if (n.includes("pistol")) return null
  if (n.includes("squat")) return "squat"
  if (n.includes("push-up") || n.includes("pushup") || n.includes("push up")) return "pushup"
  return null
}

function angleDeg(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const m1 = Math.hypot(v1.x, v1.y)
  const m2 = Math.hypot(v2.x, v2.y)
  if (m1 === 0 || m2 === 0) return 180
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)))
  return (Math.acos(cos) * 180) / Math.PI
}

export type RepPhase = "up" | "down" | "no_pose"

export class RepCounter {
  readonly type: CameraExerciseType
  private spec: ExerciseSpec
  private phase: RepPhase = "no_pose"
  private lastFlip = 0
  reps = 0

  constructor(type: CameraExerciseType) {
    this.type = type
    this.spec = SPECS[type]
  }

  /**
   * Feed one frame of landmarks. Returns the current phase; `this.reps`
   * increments when a full down→up cycle completes.
   */
  update(landmarks: PoseLandmark[] | undefined, nowMs: number): RepPhase {
    const track = this.pickSide(landmarks)
    if (!track) {
      this.phase = "no_pose"
      return this.phase
    }

    const angle = angleDeg(track[0], track[1], track[2])

    // First usable frame after losing the pose: sync to whatever position the
    // user is in without counting anything.
    if (this.phase === "no_pose") {
      this.phase = angle <= this.spec.downAngle ? "down" : "up"
      this.lastFlip = nowMs
      return this.phase
    }

    if (nowMs - this.lastFlip < MIN_PHASE_MS) return this.phase

    if (this.phase === "up" && angle <= this.spec.downAngle) {
      this.phase = "down"
      this.lastFlip = nowMs
    } else if (this.phase === "down" && angle >= this.spec.upAngle) {
      this.phase = "up"
      this.lastFlip = nowMs
      this.reps += 1
    }

    return this.phase
  }

  /** Choose left or right side by joint visibility; null when neither is usable. */
  private pickSide(landmarks: PoseLandmark[] | undefined): [PoseLandmark, PoseLandmark, PoseLandmark] | null {
    if (!landmarks || landmarks.length < 33) return null
    const [j1, j2, j3] = this.spec.joints

    let best: [PoseLandmark, PoseLandmark, PoseLandmark] | null = null
    let bestVis = MIN_VISIBILITY

    for (const side of [0, 1] as const) {
      const a = landmarks[j1[side]]
      const b = landmarks[j2[side]]
      const c = landmarks[j3[side]]
      if (!a || !b || !c) continue
      const vis = Math.min(a.visibility ?? 1, b.visibility ?? 1, c.visibility ?? 1)
      if (vis >= bestVis) {
        bestVis = vis
        best = [a, b, c]
      }
    }
    return best
  }
}
