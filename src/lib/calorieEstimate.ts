import { getMuscleGroup } from "@/lib/exerciseData"

// ── Per-set calorie rates by muscle group ─────────────────────────────────────
// Rates are kcal per set-unit (where 1 unit = 10 reps).
// These are rough estimates calibrated to typical strength-training sessions
// (~150–350 kcal per 45-min workout) — not clinical precision.

const RATE: Record<string, number> = {
  Chest:     6.5,
  Back:      7.0,
  Legs:      7.5,   // largest muscle group → most burn
  Shoulders: 5.5,
  Arms:      4.5,
  Core:      4.0,
  "Full Body": 8.5,
  Cardio:    11.0,
  Other:     5.0,
}

const DEFAULT_RATE = 5.0

export function estimateCalories(
  exercises: Array<{ name: string; sets: number; reps: number }>
): number {
  let total = 0
  for (const ex of exercises) {
    const group  = getMuscleGroup(ex.name)
    const rate   = RATE[group] ?? DEFAULT_RATE
    const repsCapped = Math.min(ex.reps, 20)   // cap time-based values
    total += ex.sets * (repsCapped / 10) * rate
  }
  return Math.round(total)
}
