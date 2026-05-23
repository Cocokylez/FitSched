import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
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

function countStreakFrom(sortedDates: string[], startDate: string) {
  let streak = 0

  for (let i = 0; i < sortedDates.length; i++) {
    const expected = addDays(startDate, -i)
    if (sortedDates[i] === expected) {
      streak++
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

  const logs = await db.workoutSessionLog.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  })

  const uniqueDates = new Set<string>()
  logs.forEach((log) => {
    uniqueDates.add(log.date)
  })

  const sortedDates = Array.from(uniqueDates).sort().reverse()
  const today = getLocalDateId()
  const yesterday = getLocalDateId(-1)
  const lastCompletedDate = sortedDates[0] || null
  const streakAnchor = lastCompletedDate === today || lastCompletedDate === yesterday ? lastCompletedDate : null
  const streak = streakAnchor ? countStreakFrom(sortedDates, streakAnchor) : 0
  const previousStreak = lastCompletedDate ? countStreakFrom(sortedDates, lastCompletedDate) : 0
  const streakBroken = Boolean(lastCompletedDate && lastCompletedDate < yesterday)

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
