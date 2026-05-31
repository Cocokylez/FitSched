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
}

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

// Sunday (UTC day 0) is always a rest day. For other days, the user's
// `workoutsPerWeek` determines how many of [Mon..Sat] are workout days:
//   workoutsPerWeek=3 → Mon, Tue, Wed are workouts; Thu..Sun are rest
//   workoutsPerWeek=6 → Mon..Sat are workouts; Sun is rest
// Treats dates as calendar days (UTC midnight parse) — the workout-vs-rest
// schedule is the user's own weekly plan, not a timezone-dependent thing.
function isRestDay(dateId: string, workoutsPerWeek: number): boolean {
  const day = new Date(`${dateId}T00:00:00Z`).getUTCDay()
  if (day === 0) return true              // Sunday always rest
  return day - 1 >= workoutsPerWeek        // beyond the configured workout block
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
  workoutsPerWeek: number,
): number {
  let streak = 0
  let cursor = fromDate

  for (let i = 0; i < 730; i++) {
    const isRest = isRestDay(cursor, workoutsPerWeek)
    const hasLog = workoutSet.has(cursor)

    if (isRest) {
      if (hasLog) streak++          // bonus workout on a scheduled rest day
      cursor = addDays(cursor, -1)
      continue
    }

    if (hasLog) {
      streak++
      cursor = addDays(cursor, -1)
    } else {
      break
    }
  }

  return streak
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
    db.user.findUnique({ where: { id: userId }, select: { workoutsPerWeek: true } }),
  ])

  // Default = 6 → train Mon–Sat, rest Sunday. Matches the universal
  // "Sunday is rest" rule used elsewhere in the app for users who haven't
  // picked a value during onboarding.
  const workoutsPerWeek = user?.workoutsPerWeek ?? 6

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

  const streak = countStreak(workoutDateSet, startDate, workoutsPerWeek)

  const previousStreak = lastCompletedDate
    ? countStreak(workoutDateSet, lastCompletedDate, workoutsPerWeek)
    : 0

  // Streak broken when the active count is zero but there used to be one.
  // Rest days alone can't cause this — only missed workout days can.
  const streakBroken = streak === 0 && previousStreak > 0

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
  } satisfies StreakData)
}
