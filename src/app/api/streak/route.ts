import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendPushToUser } from "@/lib/pushNotify"
import { rateLimitByUser, rateLimitPresets } from "@/lib/security"
import { computeStreak, STREAK_MILESTONES } from "@/lib/streak"
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

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const limited = await rateLimitByUser(req, userId, rateLimitPresets.read, "streak:get")
  if (limited) return limited

  const result = await computeStreak(db, userId)

  let newMilestone: number | null = null
  const reached = STREAK_MILESTONES.filter((ms) => result.streak >= ms)

  if (reached.length > 0) {
    try {
      // One read for every reached milestone instead of a findUnique per milestone.
      // This is a hot path — both the schedule and report pages hit it on load.
      const existing = await db.streakMilestone.findMany({
        where: { userId, milestone: { in: [...reached] } },
        select: { milestone: true },
      })
      const alreadyAwarded = new Set(existing.map((row) => row.milestone))

      for (const ms of reached) {
        if (alreadyAwarded.has(ms)) continue

        await db.streakMilestone.create({ data: { userId, milestone: ms } })
        newMilestone = ms
        sendPushToUser(userId, {
          title: `${ms}-day streak!`,
          body: ms >= 30 ? "Incredible! One month of consistent training."
            : ms >= 14 ? "Two weeks strong! You're building a habit."
            : ms >= 7 ? "One week down. You're on a roll!"
            : "3 days in a row — the habit is forming!",
          url: "/report",
        }).catch(() => {})
      }
    } catch {
      // milestone write is best-effort — don't fail the streak read
    }
  }

  return NextResponse.json({
    ...result,
    newMilestone,
  } satisfies StreakData)
}
