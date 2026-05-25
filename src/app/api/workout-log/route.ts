import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { awardFitTokensForWorkoutLogTx } from "@/lib/fitTokens"
import { sendPushToUser } from "@/lib/pushNotify"
import { unlockAchievementsForUser } from "@/lib/unlockAchievements"
import { cleanText, clampInt, isDateId, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security"
import { verifySessionToken } from "@/lib/sessionToken"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

// Accept any date that could legitimately be "today" in any timezone (UTC-12 to UTC+14).
// The client sends its local YYYY-MM-DD date; we verify it's within ±38h of server UTC
// so users outside Asia/Singapore can still earn tokens without being able to backdate old workouts.
function isValidTodayDate(clientDate: string): boolean {
  const clientNoon = new Date(`${clientDate}T12:00:00Z`).getTime()
  return Math.abs(Date.now() - clientNoon) < 38 * 60 * 60 * 1000
}

function isSerializableConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"
}

function normalizeCompletedExercises(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null

  return value.map((exercise) => {
    const rawWeight = (exercise as any)?.weight
    const weight =
      typeof rawWeight === "number" && isFinite(rawWeight) && rawWeight > 0 && rawWeight <= 1000
        ? Math.round(rawWeight * 10) / 10
        : null
    return {
      name: cleanText((exercise as any)?.name, 100),
      sets: clampInt((exercise as any)?.sets, 1, 10, 3),
      reps: clampInt((exercise as any)?.reps, 1, 200, 12),
      ...(weight !== null ? { weight } : {}),
    }
  }).filter((exercise) => exercise.name)
}

type NormalizedExercise = { name: string; sets: number; reps: number; weight?: number }

async function detectPersonalRecords(
  tx: Parameters<Parameters<typeof import("@/lib/db")["db"]["$transaction"]>[0]>[0],
  userId: string,
  exercises: NormalizedExercise[],
): Promise<Array<{ exerciseName: string; weight: number; prevBest?: number }>> {
  const withWeight = exercises.filter((ex) => ex.weight != null && ex.weight > 0)
  if (withWeight.length === 0) return []

  // Query all historical logs to build a max-weight map
  const pastLogs = await tx.workoutSessionLog.findMany({
    where: { userId },
    select: { exercises: true },
    orderBy: { completedAt: "desc" },
    take: 300,
  })

  const maxWeightMap: Record<string, number> = {}
  for (const log of pastLogs) {
    const exs = log.exercises as Array<{ name?: string; weight?: number | null }>
    if (!Array.isArray(exs)) continue
    for (const ex of exs) {
      if (ex.name && ex.weight != null && ex.weight > 0) {
        if (!maxWeightMap[ex.name] || ex.weight > maxWeightMap[ex.name]) {
          maxWeightMap[ex.name] = ex.weight
        }
      }
    }
  }

  const prs: Array<{ exerciseName: string; weight: number; prevBest?: number }> = []
  for (const ex of withWeight) {
    const prevBest = maxWeightMap[ex.name!]
    if (prevBest == null || ex.weight! > prevBest) {
      prs.push({ exerciseName: ex.name!, weight: ex.weight!, prevBest })
    }
  }

  return prs
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "workout-log:get")
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

export async function PATCH(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "workout-log:patch")
    if (limited) return limited

    const body = await readJsonBody(req)
    const id = typeof body.id === "string" ? body.id.trim() : null
    if (!id) return safeError("Missing log id")

    const notes = cleanText(body.notes, 500) || null

    const updated = await db.workoutSessionLog.updateMany({
      where: { id, userId: session.user.id },
      data: { notes },
    })

    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    return NextResponse.json({ error: "Failed to update workout log" }, { status: 500 })
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
    const limited = await rateLimitByUser(req, userId, rateLimitPresets.strictWrite, "workout-log:post")
    if (limited) return limited

    const body = await readJsonBody(req)
    const date = body.date
    const workoutName = cleanText(body.workoutName, 100)
    const exercises = normalizeCompletedExercises(body.exercises)

    // Client-side verification score (0–1). Defaults to 1.0 when absent (desktop / old clients).
    const rawScore = body.verificationScore
    let verificationScore =
      typeof rawScore === "number" && isFinite(rawScore) && rawScore >= 0 && rawScore <= 1
        ? rawScore
        : 1.0

    if (!isDateId(date) || !workoutName || !exercises?.length) {
      return safeError("Missing or invalid workout log fields")
    }

    // Server-side session validation — client cannot spoof elapsed time if token is present.
    // Token is signed with HMAC so it can't be tampered. Missing token = no server-time check
    // (desktop users / old clients fall through with their client score unchanged).
    const rawToken = typeof body.sessionToken === "string" ? body.sessionToken : null
    const sessionData = rawToken ? verifySessionToken(rawToken, userId) : null

    if (sessionData) {
      const serverElapsedSec = (Date.now() - sessionData.startedAt) / 1000
      // Minimum expected time: 25s per set (one set + brief rest, conservative floor)
      const minExpectedSec = exercises.reduce((sum, ex) => sum + ex.sets * 25, 0)

      if (serverElapsedSec < 60) {
        // Under 1 minute total — near-certain instant-complete cheat
        verificationScore = Math.min(verificationScore, 0.1)
      } else if (minExpectedSec > 0 && serverElapsedSec < minExpectedSec * 0.5) {
        // Finished in less than half the minimum plausible time for this exercise set
        verificationScore = Math.min(verificationScore, 0.3)
      }
    }

    if (!isValidTodayDate(date)) {
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
          newPRs: [] as Array<{ exerciseName: string; weight: number; prevBest?: number }>,
        }
      }

      // Detect PRs before creating the new log so history doesn't include this session
      const newPRs = await detectPersonalRecords(tx, userId, exercises as NormalizedExercise[])

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
        verificationScore,
      )

      return { log: createdLog, fitTokenReward: reward, newPRs }
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

    const earned = Number(result.fitTokenReward?.amount ?? 1).toFixed(2)
    sendPushToUser(userId, {
      title: "Workout complete! 💪",
      body: `You earned +${earned} FT. Keep it up!`,
      url: "/schedule",
    }).catch(() => {})

    // Check achievements (awaited so we can return newly unlocked ones)
    let newAchievements: string[] = []
    try { newAchievements = await unlockAchievementsForUser(db as any, userId) } catch {}

    return NextResponse.json({
      ...result.log,
      fitTokenReward: result.fitTokenReward,
      newAchievements,
      newPRs: result.newPRs ?? [],
    }, { status: 201 })
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
