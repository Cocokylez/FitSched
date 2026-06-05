import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendPushToUser } from "@/lib/pushNotify"
import { rateLimitByUser, rateLimitPresets } from "@/lib/security"
import { NextResponse } from "next/server"

interface StreakData {
  streak: number
  previousStreak: number
  streakBroken: boolean
  lastCompletedDate: string | null
  newMilestone: number | null
  freezeLimit: number
  freezesRemainingThisMonth: number
}

// Each calendar month a user gets this many "streak freezes": a missed workout
// day is automatically forgiven (the streak survives) up to this many times per
// month. The 3rd miss in a month breaks the streak.
const MAX_STREAK_FREEZE_PER_MONTH = 2

function getLocalDateId(offsetDays = 0) {
  const timeZone = process.env.FITSCHED_TIME_ZONE || "Asia/Singapore"

  // Project NOW into the target timezone first, THEN apply the day offset.
  // Applying the offset on the UTC Date before timezone projection was wrong:
  // for UTC+N timezones the UTC date can differ from the local date, causing
  // the shifted result to land on the wrong local calendar day (e.g. just
  // past midnight local time in a UTC+8 server env).
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

function addDays(dateId: string, days: number) {
  const date = new Date(`${dateId}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split("T")[0]
}

// Rest days are anchored to the user's OWN cycle, not the calendar week. The
// anchor is the weekday they started (createdAt); the first `workoutsPerWeek`
// days of each personal 7-day cycle are workouts, the rest are rest days. This
// keeps the streak's rest definition in lockstep with the plan the user sees
// (resolveDaySplit on the client) so new rest days never break a streak.
// Treats dates as calendar days (UTC midnight parse), matching anchorDayOfWeek
// which is also derived in UTC below.
function isRestDay(dateId: string, anchorDayOfWeek: number, workoutsPerWeek: number): boolean {
  const day = new Date(`${dateId}T00:00:00Z`).getUTCDay()
  const cycleIndex = (((day - anchorDayOfWeek) % 7) + 7) % 7
  return cycleIndex >= workoutsPerWeek
}

/**
 * Walks backward from `fromDate` day-by-day, counting consecutive completed
 * workout days. Rest days are transparent — they neither break nor increment
 * the streak. A workout logged on a rest day counts as a +1 bonus. A missed
 * workout day breaks the streak immediately.
 *
 * Hard-capped at 730 iterations (~2 years) so a misconfigured rest policy
 * can't run away.
 */
function countStreak(
  workoutSet: Set<string>,
  fromDate: string,
  anchorDayOfWeek: number,
  workoutsPerWeek: number,
): { streak: number; freezesUsedByMonth: Record<string, number> } {
  let streak = 0
  let cursor = fromDate
  // YYYY-MM -> freezes spent that month while walking this streak back.
  const freezesUsedByMonth: Record<string, number> = {}

  for (let i = 0; i < 730; i++) {
    const isRest = isRestDay(cursor, anchorDayOfWeek, workoutsPerWeek)
    const hasLog = workoutSet.has(cursor)

    if (isRest) {
      if (hasLog) streak++          // bonus workout on a scheduled rest day
      cursor = addDays(cursor, -1)
      continue
    }

    if (hasLog) {
      streak++
      cursor = addDays(cursor, -1)
      continue
    }

    // Missed a scheduled workout day. Spend a streak freeze for that day's
    // month if any remain — the streak survives (but doesn't increment). Once
    // a month's freezes are exhausted, the streak ends here.
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

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const limited = await rateLimitByUser(req, userId, rateLimitPresets.read, "streak:get")
  if (limited) return limited

  const [logs, user] = await Promise.all([
    db.workoutSessionLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { workoutsPerWeek: true, createdAt: true } }),
  ])

  // Default = 6 workouts/week for users who haven't picked a value yet.
  const workoutsPerWeek = user?.workoutsPerWeek ?? 6
  // Anchor the rest-day cycle to the weekday the user started (UTC basis to
  // match isRestDay). Falls back to 0 if createdAt is somehow missing.
  const anchorDayOfWeek = user?.createdAt ? new Date(user.createdAt).getUTCDay() : 0

  const workoutDateSet = new Set<string>()
  logs.forEach((log) => {
    workoutDateSet.add(log.date)
  })

  const sortedDates = Array.from(workoutDateSet).sort().reverse()
  const today = getLocalDateId()
  const yesterday = getLocalDateId(-1)
  const lastCompletedDate = sortedDates[0] || null

  // Grace for today: if today has no log yet, start counting from yesterday so
  // the user doesn't see streak=0 before they've had a chance to train today.
  const startDate = workoutDateSet.has(today) ? today : yesterday

  const { streak, freezesUsedByMonth } = countStreak(workoutDateSet, startDate, anchorDayOfWeek, workoutsPerWeek)

  const previousStreak = lastCompletedDate
    ? countStreak(workoutDateSet, lastCompletedDate, anchorDayOfWeek, workoutsPerWeek).streak
    : 0

  // Streak broken when the active count is zero but there used to be one.
  // Rest days alone can't cause this — only missed workout days can.
  const streakBroken = streak === 0 && previousStreak > 0

  // Freezes left this calendar month (how many more missed days the streak can survive).
  const currentMonth = today.slice(0, 7)
  const freezesUsedThisMonth = freezesUsedByMonth[currentMonth] ?? 0
  const freezesRemainingThisMonth = Math.max(0, MAX_STREAK_FREEZE_PER_MONTH - freezesUsedThisMonth)

  const MILESTONES = [3, 7, 14, 30]
  let newMilestone: number | null = null

  if (streak > 0) {
    for (const ms of MILESTONES) {
      if (streak >= ms) {
        try {
          const existing = await db.streakMilestone.findUnique({
            where: { userId_milestone: { userId, milestone: ms } },
          })
          if (!existing) {
            await db.streakMilestone.create({ data: { userId, milestone: ms } })
            newMilestone = ms
            sendPushToUser(userId, {
              title: `${ms}-day streak!`,
              body: ms >= 30 ? "Incredible! One month of consistent training." : ms >= 14 ? "Two weeks strong! You're building a habit." : ms >= 7 ? "One week down. You're on a roll!" : "3 days in a row — the habit is forming!",
              url: "/report",
            }).catch(() => {})
          }
        } catch {
          // milestone write is best-effort — don't fail the streak read
        }
      }
    }
  }

  return NextResponse.json({
    streak,
    previousStreak,
    streakBroken,
    lastCompletedDate,
    newMilestone,
    freezeLimit: MAX_STREAK_FREEZE_PER_MONTH,
    freezesRemainingThisMonth,
  } satisfies StreakData)
}
