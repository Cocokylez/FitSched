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
  streakFreezeArmed: boolean
}

function getLocalDateId(offsetDays = 0) {
  const timeZone = process.env.FITSCHED_TIME_ZONE || "Asia/Singapore"
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return `${year}-${month}-${day}`
}

function addDays(dateId: string, days: number) {
  const date = new Date(`${dateId}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split("T")[0]
}

function countStreakFrom(sortedDates: string[], startDate: string, freezeArmed: boolean) {
  let streak = 0
  let freezeUsed = false

  for (let i = 0; i < sortedDates.length; i++) {
    const expected = addDays(startDate, -i)
    if (sortedDates[i] === expected) {
      streak++
    } else if (!freezeUsed && freezeArmed) {
      // Gap of 1 day — freeze covers it, skip ahead and continue counting
      const afterGap = addDays(startDate, -(i + 1))
      if (sortedDates[i] === afterGap) {
        freezeUsed = true
        streak++
        i++ // the date at i was for the gap, next iteration checks i+1
        streak++ // count afterGap date too (already matched above)
      } else {
        break
      }
    } else {
      break
    }
  }

  return { streak, freezeUsed }
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
    db.user.findUnique({ where: { id: userId }, select: { streakFreezeArmed: true } }),
  ])

  const freezeArmed = user?.streakFreezeArmed ?? false

  const uniqueDates = new Set<string>()
  logs.forEach((log) => {
    uniqueDates.add(log.date)
  })

  const sortedDates = Array.from(uniqueDates).sort().reverse()
  const today = getLocalDateId()
  const yesterday = getLocalDateId(-1)
  const lastCompletedDate = sortedDates[0] || null
  const streakAnchor = lastCompletedDate === today || lastCompletedDate === yesterday ? lastCompletedDate : null

  let streak = 0
  let freezeConsumed = false

  if (streakAnchor) {
    const result = countStreakFrom(sortedDates, streakAnchor, freezeArmed)
    streak = result.streak
    freezeConsumed = result.freezeUsed
  } else if (freezeArmed && lastCompletedDate === addDays(yesterday, -1)) {
    // Missed yesterday AND the day before was the last workout; freeze covers yesterday
    const result = countStreakFrom(sortedDates, yesterday, true)
    streak = result.streak
    freezeConsumed = result.freezeUsed
  }

  const previousStreak = lastCompletedDate ? countStreakFrom(sortedDates, lastCompletedDate, false).streak : 0
  const streakBroken = Boolean(lastCompletedDate && lastCompletedDate < yesterday)

  // Consume the freeze if it was used
  let currentFreezeArmed = freezeArmed
  if (freezeConsumed && freezeArmed) {
    await db.user.update({ where: { id: userId }, data: { streakFreezeArmed: false } })
    currentFreezeArmed = false
  }

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
              title: `🔥 ${ms}-day streak!`,
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
    streakFreezeArmed: currentFreezeArmed,
  } satisfies StreakData)
}
