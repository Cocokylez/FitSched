import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { awardFitTokensForWorkoutLogTx } from "@/lib/fitTokens"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

function isDateId(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isSerializableConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")

    const logs = await db.workoutSessionLog.findMany({
      where: {
        userId: session.user.id,
        ...(date ? { date } : {}),
      },
      orderBy: { completedAt: "desc" },
      take: date ? 10 : 365,
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

    if (!isDateId(date) || !workoutName || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: date, workoutName, exercises" },
        { status: 400 }
      )
    }

    const result = await db.$transaction(async (tx) => {
      const existingLog = await tx.workoutSessionLog.findFirst({
        where: {
          userId,
          date,
        },
        orderBy: { completedAt: "desc" },
      })

      if (existingLog) {
        return {
          alreadyCompleted: true,
          log: existingLog,
          fitTokenReward: {
            awarded: false,
            amount: 0,
            balance: 0,
            transactions: [],
          },
        }
      }

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
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })

    if (result.alreadyCompleted) {
      return NextResponse.json(
        {
          error: "Workout already completed for this date",
          alreadyCompleted: true,
          log: result.log,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ ...result.log, fitTokenReward: result.fitTokenReward }, { status: 201 })
  } catch (error) {
    if (isSerializableConflict(error)) {
      return NextResponse.json(
        { error: "Workout completion is already being processed", alreadyCompleted: true },
        { status: 409 }
      )
    }

    console.error("Workout log POST error:", error)
    return NextResponse.json(
      { error: "Failed to save workout log" },
      { status: 500 }
    )
  }
}
