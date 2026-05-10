import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")
    const days = searchParams.get("days")

    if (days) {
      const numDays = parseInt(days)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - numDays)
      const startStr = startDate.toISOString().split("T")[0]

      const workouts = await db.workoutSchedule.findMany({
        where: {
          userId: session.user.id,
          date: { gte: startStr },
        },
        orderBy: { date: "desc" },
      })

      return NextResponse.json(workouts)
    }

    if (date) {
      const workouts = await db.workoutSchedule.findMany({
        where: {
          userId: session.user.id,
          date: date,
        },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json(workouts)
    }

    return NextResponse.json([])
  } catch (error) {
    console.error("Workout schedule GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch workout schedule" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { date, workoutName, exercises, source } = await req.json()

    if (!date || !workoutName || !exercises) {
      return NextResponse.json(
        { error: "Missing required fields: date, workoutName, exercises" },
        { status: 400 }
      )
    }

    const workout = await db.workoutSchedule.create({
      data: {
        userId: session.user.id,
        date,
        workoutName,
        exercises,
        source: source || "ai",
      },
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    console.error("Workout schedule POST error:", error)
    return NextResponse.json(
      { error: "Failed to save workout schedule" },
      { status: 500 }
    )
  }
}
