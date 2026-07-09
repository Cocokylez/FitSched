import { db } from "@/lib/db"
import { sendPushToUser } from "@/lib/pushNotify"
import { verifyBearerSecret } from "@/lib/security"
import { NextResponse } from "next/server"

// Called by Vercel Cron every Monday at 09:00 UTC (configurable in vercel.json).
// Sends each user with push subscriptions a summary of their past week.

function getWeekRange() {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = new Date(now)
  start.setDate(now.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

export async function GET(req: Request) {
  // Vercel Cron sends an Authorization header with the CRON_SECRET
  if (!verifyBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { start, end } = getWeekRange()

  try {
    // Find all users who have at least one push subscription
    const subscribers = await db.pushSubscription.findMany({
      select: { userId: true },
      distinct: ["userId"],
    })

    const userIds = subscribers.map((s) => s.userId)
    if (userIds.length === 0) return NextResponse.json({ sent: 0 })

    // For each user, fetch their workout + hike activity in the past 7 days
    const [sessionLogs, hikeLogs] = await Promise.all([
      db.workoutSessionLog.findMany({
        where: {
          userId: { in: userIds },
          completedAt: { gte: start, lte: end },
        },
        select: { userId: true },
      }),
      db.hikeLog.findMany({
        where: {
          userId: { in: userIds },
          loggedAt: { gte: start, lte: end },
        },
        select: { userId: true, distanceKm: true },
      }),
    ])

    // Group by user
    const workoutCount = new Map<string, number>()
    for (const log of sessionLogs) {
      workoutCount.set(log.userId, (workoutCount.get(log.userId) ?? 0) + 1)
    }

    const hikeKm = new Map<string, number>()
    for (const hike of hikeLogs) {
      hikeKm.set(hike.userId, (hikeKm.get(hike.userId) ?? 0) + hike.distanceKm)
    }

    let sent = 0

    await Promise.allSettled(
      userIds.map(async (userId) => {
        const workouts = workoutCount.get(userId) ?? 0
        const km = hikeKm.get(userId) ?? 0

        if (workouts === 0 && km === 0) {
          // Encourage users who skipped the whole week
          await sendPushToUser(userId, {
            title: "Week recap 📅",
            body: "No activity logged this week — a fresh start is just one workout away!",
            url: "/workout",
          })
        } else {
          const parts: string[] = []
          if (workouts > 0) parts.push(`${workouts} workout${workouts > 1 ? "s" : ""}`)
          if (km > 0) parts.push(`${km.toFixed(1)} km hiked`)
          const summary = parts.join(" · ")
          await sendPushToUser(userId, {
            title: "Week recap 🏅",
            body: `Last 7 days: ${summary}. Keep the momentum going!`,
            url: "/profile",
          })
        }
        sent++
      })
    )

    return NextResponse.json({ sent })
  } catch (err) {
    console.error("Weekly summary cron error:", err)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }
}
