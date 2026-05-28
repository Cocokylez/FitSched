import { db } from "@/lib/db"
import { sendPushToUser } from "@/lib/pushNotify"
import { NextResponse } from "next/server"

// Called by Vercel Cron every day at 08:00 UTC.
// Sends a workout reminder to every subscriber who hasn't already
// logged a workout or hike today.

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setUTCHours(23, 59, 59, 999)

    // All users with at least one push subscription
    const subscribers = await db.pushSubscription.findMany({
      select: { userId: true },
      distinct: ["userId"],
    })

    const userIds = subscribers.map((s) => s.userId)
    if (userIds.length === 0) return NextResponse.json({ sent: 0 })

    // Users who already logged a workout or hike today
    const [alreadyWorkedOut, alreadyHiked] = await Promise.all([
      db.workoutSessionLog.findMany({
        where: { userId: { in: userIds }, completedAt: { gte: todayStart, lte: todayEnd } },
        select: { userId: true },
      }),
      db.hikeLog.findMany({
        where: { userId: { in: userIds }, loggedAt: { gte: todayStart, lte: todayEnd } },
        select: { userId: true },
      }),
    ])

    const doneToday = new Set([
      ...alreadyWorkedOut.map((r) => r.userId),
      ...alreadyHiked.map((r) => r.userId),
    ])

    // Only remind users who haven't done anything yet today
    const toRemind = userIds.filter((id) => !doneToday.has(id))
    if (toRemind.length === 0) return NextResponse.json({ sent: 0 })

    // Fetch streak info to personalise the message
    const streaks = await db.streak.findMany({
      where: { userId: { in: toRemind } },
      select: { userId: true, current: true },
    })
    const streakMap = new Map(streaks.map((s) => [s.userId, s.current]))

    let sent = 0
    await Promise.allSettled(
      toRemind.map(async (userId) => {
        const streak = streakMap.get(userId) ?? 0

        let title = "Time to move 💪"
        let body: string

        if (streak >= 7) {
          body = `${streak}-day streak on the line — don't break the chain!`
        } else if (streak >= 3) {
          body = `You're on a ${streak}-day streak. Keep it going today!`
        } else if (streak === 0) {
          body = "Start fresh today — every streak begins with one workout."
        } else {
          body = "Your workout is waiting. Let's get it done!"
        }

        await sendPushToUser(userId, { title, body, url: "/workout" })
        sent++
      })
    )

    return NextResponse.json({ sent })
  } catch (err) {
    console.error("Workout reminder cron error:", err)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }
}
