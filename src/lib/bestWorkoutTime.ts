// ─────────────────────────────────────────────────────────────────────────────
//  Smart workout-time picker
//
//  Given the timestamps of past completed workouts, guess the time of day the
//  user most likely wants to train. We use the *mode* (most frequent hour) rather
//  than an average: a single odd late-night session shouldn't drag a 7 AM
//  regular's suggestion toward noon. Falls back to a sensible default when the
//  user has little or no history.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIME = "07:00"

/** Returns a "HH:MM" (24h) string for the suggested workout time. */
export function pickBestWorkoutTime(completedAt: Array<string | Date | null | undefined>): string {
  const hours = completedAt
    .map((v) => (v instanceof Date ? v : v ? new Date(v) : null))
    .filter((d): d is Date => d != null && !isNaN(d.getTime()))
    .map((d) => d.getHours())

  if (hours.length === 0) return DEFAULT_TIME

  // Tally how often each hour appears, keep the most common one. Ties resolve to
  // the earlier hour (people tend to prefer the earlier of two habitual slots).
  const counts = new Map<number, number>()
  for (const h of hours) counts.set(h, (counts.get(h) || 0) + 1)

  let bestHour = hours[0]
  let bestCount = 0
  for (const [hour, count] of counts) {
    if (count > bestCount || (count === bestCount && hour < bestHour)) {
      bestHour = hour
      bestCount = count
    }
  }

  return `${String(bestHour).padStart(2, "0")}:00`
}
