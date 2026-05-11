import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { awardFitTokensForWorkoutLogTx } from "@/lib/fitTokens"
import { cleanText, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id
    const limited = rateLimitByUser(req, userId, rateLimitPresets.strictWrite, "tokens:earn")
    if (limited) return limited

    const body = await readJsonBody(req)
    const workoutLogId = cleanText(body.workoutLogId, 80)
    if (!workoutLogId) return safeError("Missing workoutLogId")

    const reward = await db.$transaction((tx) =>
      awardFitTokensForWorkoutLogTx(tx, userId, workoutLogId),
    )

    return NextResponse.json(reward)
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ awarded: false }, { status: 200 })
    }

    console.error("FitToken earn error:", error)
    return NextResponse.json(
      { error: "Failed to award FitTokens" },
      { status: 500 },
    )
  }
}
