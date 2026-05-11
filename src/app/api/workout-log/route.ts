import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { awardFitTokensForWorkoutLogTx } from "@/lib/fitTokens"
import { cleanText, clampInt, isDateId, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

function getTodayDateId() {
  const timeZone = process.env.FITSCHED_TIME_ZONE || "Asia/Singapore"
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return `${year}-${month}-${day}`
}

function isSerializableConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
}

function normalizeCompletedExercises(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null

  return value.map((exercise) => ({
    name: cleanText((exercise as any)?.name, 100),
    sets: clampInt((exercise as any)?.sets, 1, 10, 3),
    reps: clampInt((exercise as any)?.reps, 1, 200, 12),
  })).filter((exercise) => exercise.name)
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.read, "workout-log:get")
    if (limited) return limited

    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")
    if (date && !isDateId(date)) return safeError("Invalid date")

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
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const limited = rateLimitByUser(req, userId, rateLimitPresets.strictWrite, "workout-log:post")
    if (limited) return limited

    const body = await readJsonBody(req)
    const date = body.date
    const workoutName = cleanText(body.workoutName, 100)
    const exercises = normalizeCompletedExercises(body.exercises)

    if (!isDateId(date) || !workoutName || !exercises?.length) {
      return safeError("Missing or invalid workout log fields")
    }

    if (date !== getTodayDateId()) {
      return NextResponse.json(
        { error: "Only today's workout can earn FitTokens", todayOnly: true },
        { status: 403 }
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
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError

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
