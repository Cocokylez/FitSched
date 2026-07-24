/**
 * Canonical streak computation — the ONLY place streaks are counted.
 *
 * This logic used to exist twice: once in `api/streak/route.ts` (correct) and once
 * in `lib/fitTokens.ts` (rest-day-blind, freeze-blind, raw UTC). The second one set
 * real FitToken payouts, so the number users saw and the number they were paid on
 * disagreed — a 3x/week user on a genuine 30-day streak was paid the streak-1 bonus,
 * roughly 8x too much. Both callers now import from here.
 *
 * If you add a third caller, import it. Do not re-derive.
 */

import type { Prisma } from "@prisma/client"

/**
 * Each calendar month a user gets this many "streak freezes": a missed workout day
 * is automatically forgiven (the streak survives) up to this many times per month.
 * The 3rd miss in a month breaks the streak.
 */
export const MAX_STREAK_FREEZE_PER_MONTH = 2

export const STREAK_MILESTONES = [3, 7, 14, 30] as const

/** Hard cap on the backward walk (~2 years) so a bad rest policy can't run away. */
const MAX_WALK_DAYS = 730

/**
 * Day IDs are `YYYY-MM-DD` strings in FITSCHED_TIME_ZONE — never UTC, never device-local.
 *
 * The timezone projection happens BEFORE the day offset. Applying the offset to a UTC
 * Date first was wrong: for UTC+N zones the UTC date can differ from the local date, so
 * the shifted result lands on the wrong local calendar day (e.g. just past midnight in
 * a UTC+8 environment). This has caused two prior incidents — don't reorder it.
 */
export function getLocalDateId(offsetDays = 0): string {
  const timeZone = process.env.FITSCHED_TIME_ZONE || "Asia/Singapore"

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year  = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  const day   = parts.find((p) => p.type === "day")?.value
  const todayId = `${year}-${month}-${day}`

  return offsetDays === 0 ? todayId : addDays(todayId, offsetDays)
}

/** Shift a `YYYY-MM-DD` day ID by N days. Parses at UTC midnight to stay calendar-exact. */
export function addDays(dateId: string, days: number): string {
  const date = new Date(`${dateId}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split("T")[0]
}

/**
 * Rest days are anchored to the user's OWN cycle, not the calendar week: the anchor is
 * the weekday they registered, and the first `workoutsPerWeek` days of each personal
 * 7-day cycle are workout days.
 *
 * ⚠️ The anchor MUST be derived with `getAnchorDayOfWeek` below. The client used to
 * derive it with device-local `.getDay()` while the server used `.getUTCDay()`, which
 * shifted the whole rest-day calendar by a day for users who registered between
 * midnight and their UTC offset — the UI said "rest day" while the server recorded a
 * miss and silently burned a freeze.
 */
export function isRestDay(dateId: string, anchorDayOfWeek: number, workoutsPerWeek: number): boolean {
  const day = new Date(`${dateId}T00:00:00Z`).getUTCDay()
  const cycleIndex = (((day - anchorDayOfWeek) % 7) + 7) % 7
  return cycleIndex >= workoutsPerWeek
}

/** The one correct way to derive a user's rest-day anchor from their registration date. */
export function getAnchorDayOfWeek(createdAt: Date | string | null | undefined): number {
  if (!createdAt) return 0
  return new Date(createdAt).getUTCDay()
}

/**
 * Walks backward from `fromDate`, counting consecutive completed workout days.
 *
 * Rest days are transparent — they neither break nor increment. A workout logged on a
 * rest day counts as a +1 bonus. A missed workout day spends a freeze for that day's
 * month if any remain; once exhausted, the streak ends there.
 */
export function countStreak(
  workoutSet: Set<string>,
  fromDate: string,
  anchorDayOfWeek: number,
  workoutsPerWeek: number,
): { streak: number; freezesUsedByMonth: Record<string, number> } {
  let streak = 0
  let cursor = fromDate
  const freezesUsedByMonth: Record<string, number> = {}

  for (let i = 0; i < MAX_WALK_DAYS; i++) {
    const isRest = isRestDay(cursor, anchorDayOfWeek, workoutsPerWeek)
    const hasLog = workoutSet.has(cursor)

    if (isRest) {
      if (hasLog) streak++
      cursor = addDays(cursor, -1)
      continue
    }

    if (hasLog) {
      streak++
      cursor = addDays(cursor, -1)
      continue
    }

    const month = cursor.slice(0, 7) // "YYYY-MM"
    const used = freezesUsedByMonth[month] ?? 0
    if (used < MAX_STREAK_FREEZE_PER_MONTH) {
      freezesUsedByMonth[month] = used + 1
      cursor = addDays(cursor, -1)
      continue
    }
    break
  }

  return { streak, freezesUsedByMonth }
}

export type StreakResult = {
  streak: number
  previousStreak: number
  streakBroken: boolean
  lastCompletedDate: string | null
  freezeLimit: number
  freezesRemainingThisMonth: number
}

/**
 * Compute a user's streak from the database.
 *
 * Accepts either the shared `db` client or a transaction client, so token awarding can
 * read the same streak inside its own transaction (and therefore sees the workout log
 * that was just written).
 */
export async function computeStreak(
  client: Prisma.TransactionClient,
  userId: string,
): Promise<StreakResult> {
  // Only fetch what the walk can actually reach. This was previously an unbounded
  // findMany over every log the user had ever written, on a hot path hit by both the
  // schedule and report pages.
  const earliestRelevant = getLocalDateId(-(MAX_WALK_DAYS + 10))

  const [logs, user] = await Promise.all([
    client.workoutSessionLog.findMany({
      where: { userId, date: { gte: earliestRelevant } },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    client.user.findUnique({
      where: { id: userId },
      select: { workoutsPerWeek: true, createdAt: true },
    }),
  ])

  // Default = 6 workouts/week for users who haven't picked a value yet.
  const workoutsPerWeek = user?.workoutsPerWeek ?? 6
  const anchorDayOfWeek = getAnchorDayOfWeek(user?.createdAt)

  const workoutDateSet = new Set<string>(logs.map((log) => log.date))
  const sortedDates = Array.from(workoutDateSet).sort().reverse()

  const today = getLocalDateId()
  const yesterday = getLocalDateId(-1)
  const lastCompletedDate = sortedDates[0] || null

  // Grace for today: if today has no log yet, start from yesterday so the user doesn't
  // see streak=0 before they've had a chance to train.
  const startDate = workoutDateSet.has(today) ? today : yesterday

  const { streak, freezesUsedByMonth } = countStreak(
    workoutDateSet, startDate, anchorDayOfWeek, workoutsPerWeek,
  )

  const previousStreak = lastCompletedDate
    ? countStreak(workoutDateSet, lastCompletedDate, anchorDayOfWeek, workoutsPerWeek).streak
    : 0

  // Broken when the active count is zero but there used to be one. Rest days alone
  // can't cause this — only missed workout days can.
  const streakBroken = streak === 0 && previousStreak > 0

  const currentMonth = today.slice(0, 7)
  const freezesUsedThisMonth = freezesUsedByMonth[currentMonth] ?? 0
  const freezesRemainingThisMonth = Math.max(0, MAX_STREAK_FREEZE_PER_MONTH - freezesUsedThisMonth)

  return {
    streak,
    previousStreak,
    streakBroken,
    lastCompletedDate,
    freezeLimit: MAX_STREAK_FREEZE_PER_MONTH,
    freezesRemainingThisMonth,
  }
}
