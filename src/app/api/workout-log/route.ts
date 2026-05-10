import { getServerSession, authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const logs = await db.workoutSessionLog.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: "desc" },
      take: 30,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Workout log GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch workout logs" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { date, workoutName, exercises } = await req.json()

    if (!date || !workoutName || !exercises) {
      return NextResponse.json(
        { error: "Missing required fields: date, workoutName, exercises" },
        { status: 400 }
      )
    }

    const log = await db.workoutSessionLog.create({
      data: {
        userId: session.user.id,
        date,
        workoutName,
        exercises,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error("Workout log POST error:", error)
    return NextResponse.json(
      { error: "Failed to save workout log" },
      { status: 500 }
    )
  }
}
