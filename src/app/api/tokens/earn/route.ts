import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { awardFitTokensForWorkoutLogTx } from "@/lib/fitTokens"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const { workoutLogId } = await req.json()
    if (!workoutLogId || typeof workoutLogId !== "string") {
      return NextResponse.json(
        { error: "Missing workoutLogId" },
        { status: 400 },
      )
    }

    const reward = await db.$transaction((tx) =>
      awardFitTokensForWorkoutLogTx(tx, userId, workoutLogId),
    )

    return NextResponse.json(reward)
  } catch (error) {
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
