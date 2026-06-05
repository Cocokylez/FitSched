import { db } from "@/lib/db"

// ── Ban enforcement ──────────────────────────────────────────────────────────

/**
 * True if the account is banned. Fails OPEN (returns false) on a lookup error
 * so a transient DB hiccup can't lock every user out of earning.
 */
export async function isUserBanned(userId: string): Promise<boolean> {
  try {
    const u = await db.user.findUnique({ where: { id: userId }, select: { banned: true } })
    return Boolean(u?.banned)
  } catch {
    return false
  }
}

// ── Anomaly flagging (review signals — never auto-bans) ──────────────────────

/** Records a review signal. Best-effort: never blocks the main request flow. */
export async function flagSuspicious(userId: string, kind: string, detail?: string): Promise<void> {
  try {
    await db.suspiciousFlag.create({
      data: { userId, kind, detail: detail ? detail.slice(0, 200) : null },
    })
  } catch {
    // intentionally swallowed — a flag write must never break earning
  }
}

interface HikeVerificationLike {
  hasGpsData: boolean
  excludedRatio: number
  clustered: boolean
  rewardKm: number
}

/**
 * Evaluate a just-completed hike for review-worthy patterns. Call AFTER the
 * award transaction so flagging can never affect the reward. Returns the kinds
 * flagged (for logging/telemetry), and writes them best-effort.
 */
export async function flagHikeIfSuspicious(
  userId: string,
  claimedKm: number,
  v: HikeVerificationLike,
): Promise<string[]> {
  const flags: { kind: string; detail: string }[] = []

  if (!v.hasGpsData && claimedKm >= 12) {
    flags.push({ kind: "no_gps_max_hike", detail: `claimed ${claimedKm.toFixed(1)}km with no GPS` })
  }
  if (v.clustered) {
    flags.push({ kind: "stationary_jitter", detail: `claimed ${claimedKm.toFixed(1)}km but never moved` })
  }
  if (v.hasGpsData && v.excludedRatio > 0.6) {
    flags.push({ kind: "high_excluded_ratio", detail: `${Math.round(v.excludedRatio * 100)}% of route excluded as vehicle/jump` })
  }

  await Promise.all(flags.map((f) => flagSuspicious(userId, f.kind, f.detail)))
  return flags.map((f) => f.kind)
}

/** Flag a workout that the server-time check found implausibly fast. */
export async function flagFastWorkout(userId: string, elapsedSec: number): Promise<void> {
  await flagSuspicious(userId, "fast_workout", `completed in ${Math.round(elapsedSec)}s`)
}
