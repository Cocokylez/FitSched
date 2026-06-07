import { db } from "@/lib/db"
import { sendPushToUser } from "@/lib/pushNotify"
import { NextResponse } from "next/server"

// "17:44" → "5:44 PM". Returns null for anything that isn't a valid HH:MM.
function to12h(time: string | null): string | null {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null
  const [h, m] = time.split(":").map(Number)
  if (h > 23 || m > 59) return null
  const suffix = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`
}

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

    // Pull today's scheduled workouts so the reminder can name the actual
    // session (and the time the user picked) instead of a generic nudge.
    const todayStr = now.toISOString().split("T")[0]
    const todaySchedules = await db.workoutSchedule.findMany({
      where: { userId: { in: toRemind }, date: todayStr },
      orderBy: { createdAt: "desc" },
      select: { userId: true, workoutName: true, exercises: true },
    })
    // Keep the first (most recent) schedule per user.
    const scheduleByUser = new Map<string, { name: string; time: string | null }>()
    for (const s of todaySchedules) {
      if (scheduleByUser.has(s.userId)) continue
      const first = Array.isArray(s.exercises) ? (s.exercises[0] as { time?: string } | undefined) : undefined
      const rawTime = typeof first?.time === "string" ? first.time : null
      scheduleByUser.set(s.userId, { name: s.workoutName || "your workout", time: rawTime })
    }

    // Personalise by last activity date — users who haven't worked out in a while
    // get a slightly different nudge
    const recentLogs = await db.workoutSessionLog.findMany({
      where: {
        userId: { in: toRemind },
        completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { userId: true },
      distinct: ["userId"],
    })
    const activeRecently = new Set(recentLogs.map((r) => r.userId))

    const messages = [
      { title: "Time to move 💪", body: "Your workout is waiting. Let's get it done!" },
      { title: "Stay consistent 🔥", body: "Every session counts. Log one today!" },
      { title: "You've got this 🏃", body: "Don't let today slip by — a quick workout is all it takes." },
    ]

    let sent = 0
    await Promise.allSettled(
      toRemind.map(async (userId) => {
        const scheduled = scheduleByUser.get(userId)
        let msg: { title: string; body: string }

        if (scheduled) {
          // They scheduled something today — name it and include the time.
          const pretty = to12h(scheduled.time)
          msg = {
            title: scheduled.name,
            body: pretty
              ? `Scheduled for ${pretty} today — tap to start.`
              : "On your plan for today — tap to start.",
          }
        } else if (activeRecently.has(userId)) {
          msg = { title: "Keep the streak alive 🔥", body: "You've been on a roll — don't stop now!" }
        } else {
          msg = messages[Math.floor(Math.random() * messages.length)]
        }

        await sendPushToUser(userId, { title: msg.title, body: msg.body, url: "/workout" })
        sent++
      })
    )

    return NextResponse.json({ sent })
  } catch (err) {
    console.error("Workout reminder cron error:", err)
    return NextResponse.json({ error: "Cron failed" }, { status: 500 })
  }
}
