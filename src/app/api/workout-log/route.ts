import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { awardFitTokensForWorkoutLogTx } from "@/lib/fitTokens"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const logs = await db.workoutSessionLog.findMany({
      where: { userId: session.user.id },
      orderBy: { completedAt: "desc" },
      take: 365,
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
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const { date, workoutName, exercises } = await req.json()

    if (!date || !workoutName || !exercises) {
      return NextResponse.json(
        { error: "Missing required fields: date, workoutName, exercises" },
        { status: 400 }
      )
    }

    const { log, fitTokenReward } = await db.$transaction(async (tx) => {
      const createdLog = await tx.workoutSessionLog.create({
        data: {
          userId,
          date,
          workoutName,
          exercises,
        },
      })

      const reward = await awardFitTokensForWorkoutLogTx(
        tx,
        userId,
        createdLog.id,
      )

      return { log: createdLog, fitTokenReward: reward }
    })

    return NextResponse.json({ ...log, fitTokenReward }, { status: 201 })
  } catch (error) {
    console.error("Workout log POST error:", error)
    return NextResponse.json(
      { error: "Failed to save workout log" },
      { status: 500 }
    )
  }
}
