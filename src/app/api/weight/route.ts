import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { unlockAchievementsForUser } from "@/lib/unlockAchievements"
import {
  cleanText,
  rateLimitByUser,
  rateLimitPresets,
  readJsonBody,
  requestBodyErrorResponse,
  safeError,
  validateSameOrigin,
} from "@/lib/security"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "weight:get")
    if (limited) return limited

    const logs = await db.weightLog.findMany({
      where: { userId: session.user.id },
      orderBy: { loggedAt: "asc" },
      take: 365,
    })

    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: "Failed to fetch weight logs" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "weight:post")
    if (limited) return limited

    const body = await readJsonBody(req)
    const rawWeight = Number(body.weightKg)
    if (!isFinite(rawWeight) || rawWeight < 20 || rawWeight > 500) {
      return safeError("Weight must be between 20 and 500 kg")
    }
    const weightKg = Math.round(rawWeight * 10) / 10
    const notes = cleanText(body.notes, 200) || null

    const log = await db.weightLog.create({
      data: { userId: session.user.id, weightKg, notes },
    })

    // Fire-and-forget achievement check
    unlockAchievementsForUser(db as any, session.user.id).catch(() => {})

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    return NextResponse.json({ error: "Failed to save weight log" }, { status: 500 })
  }
}
