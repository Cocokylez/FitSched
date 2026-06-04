import { getMuscleGroup } from "./exerciseData"
import type { MuscleGroup } from "./workoutRecommendations"

// Muscle "recovery" model derived purely from a user's recent workout logs.
// Extracted from workout/page.tsx so the schedule page and the on-demand
// "Train again" action can share the exact same readiness picture instead of
// each re-deriving it.

export type ReadinessStatus = "fresh" | "recovering" | "sore" | "untrained"

export interface MuscleReadiness {
  group: string // display name: "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Core"
  status: ReadinessStatus
  daysSince: number | null
}

export interface ReadinessLog {
  completedAt: string | Date
  exercises?: Array<{ name: string }> | null
}

// The six muscle groups we track recovery for. Cardio / Full Body aren't tracked
// directly — a full-body session "spills" recovery cost onto the big movers.
const TRACKED = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"] as const
const FULL_BODY_SPILL = ["Chest", "Back", "Legs", "Core"]

const DISPLAY_TO_ENUM: Record<string, MuscleGroup> = {
  Chest: "CHEST",
  Back: "BACK",
  Shoulders: "SHOULDERS",
  Arms: "ARMS",
  Legs: "LEGS",
  Core: "CORE",
}

export function readinessToEnum(group: string): MuscleGroup | null {
  return DISPLAY_TO_ENUM[group] ?? null
}

// status thresholds (days since last trained): <1.5 sore, <3.5 recovering, else fresh
export function computeMuscleReadiness(logs: ReadinessLog[]): MuscleReadiness[] {
  const lastTrained: Record<string, Date> = {}

  for (const log of logs) {
    for (const ex of log.exercises || []) {
      const rawGroup = getMuscleGroup(ex.name)
      const affected = rawGroup === "Full Body" ? FULL_BODY_SPILL : [rawGroup]
      for (const g of affected) {
        if (!TRACKED.includes(g as (typeof TRACKED)[number])) continue
        const d = new Date(log.completedAt)
        if (!lastTrained[g] || d > lastTrained[g]) lastTrained[g] = d
      }
    }
  }

  const now = Date.now()
  return TRACKED.map((group) => {
    const last = lastTrained[group]
    if (!last) return { group, status: "untrained" as const, daysSince: null }
    const daysSince = (now - last.getTime()) / (1000 * 60 * 60 * 24)
    const status: ReadinessStatus =
      daysSince < 1.5 ? "sore" : daysSince < 3.5 ? "recovering" : "fresh"
    return { group, status, daysSince }
  })
}

// Higher score = better pick. Ranks the freshest, least-recently-trained muscle
// highest, with a bias toward the user's onboarding targets. Tuned so a
// preferred *fresh* muscle can edge out a non-preferred untrained one, but a
// preferred *sore* muscle never beats a genuinely fresh one (we won't push a
// muscle that hasn't recovered just because the user likes it).
function scoreReadiness(entry: MuscleReadiness, isPreferred: boolean): number {
  const statusScore =
    entry.status === "untrained" ? 100
    : entry.status === "fresh" ? 80
    : entry.status === "recovering" ? 40
    : 10 // sore
  const recencyBonus = entry.daysSince == null ? 7 : Math.min(entry.daysSince, 7)
  const preferredBonus = isPreferred ? 25 : 0
  return statusScore + recencyBonus + preferredBonus
}

// Chooses which muscle group an on-demand bonus workout should hit.
// `preferred` = the user's onboarding target muscles (enum form), so the auto
// pick still honors "the desired thing" when those muscles are ready.
export function pickFreshestTarget(
  readiness: MuscleReadiness[],
  preferred: MuscleGroup[],
): MuscleGroup {
  const preferredSet = new Set(preferred)
  const ranked = readiness
    .map((entry) => ({ entry, group: readinessToEnum(entry.group) }))
    .filter((r): r is { entry: MuscleReadiness; group: MuscleGroup } => r.group !== null)
    .sort(
      (a, b) =>
        scoreReadiness(b.entry, preferredSet.has(b.group)) -
        scoreReadiness(a.entry, preferredSet.has(a.group)),
    )

  return ranked[0]?.group ?? preferred[0] ?? "FULL_BODY"
}
