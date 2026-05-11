import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets } from "@/lib/security"
import { NextResponse } from "next/server"

interface StreakData {
  streak: number
  newMilestone: number | null
}

const cache = new Map<string, { data: StreakData; expiresAt: number }>()
const CACHE_TTL = 30_000

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const limited = rateLimitByUser(req, userId, rateLimitPresets.read, "streak:get")
  if (limited) return limited

  const cached = cache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  const logs = await db.workoutSessionLog.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  })

  const uniqueDates = new Set<string>()
  logs.forEach((log) => {
    uniqueDates.add(log.completedAt.toISOString().split("T")[0])
  })

  const sortedDates = Array.from(uniqueDates).sort().reverse()

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)
    if (sortedDates[i] === expected.toISOString().split("T")[0]) {
      streak++
    } else {
      break
    }
  }

  const MILESTONES = [3, 7, 14, 30]
  let newMilestone: number | null = null

  if (streak > 0) {
    for (const ms of MILESTONES) {
      if (streak >= ms) {
        const existing = await db.streakMilestone.findUnique({
          where: { userId_milestone: { userId, milestone: ms } },
        })
        if (!existing) {
          await db.streakMilestone.create({
            data: { userId, milestone: ms },
          })
          newMilestone = ms
        }
      }
    }
  }

  const result: StreakData = { streak, newMilestone }
  cache.set(userId, { data: result, expiresAt: Date.now() + CACHE_TTL })

  return NextResponse.json(result)
}
