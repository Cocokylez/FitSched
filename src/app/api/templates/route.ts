import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
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
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "templates:get")
    if (limited) return limited

    const templates = await db.workoutTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(templates)
  } catch {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "templates:post")
    if (limited) return limited

    const body = await readJsonBody(req)
    const name = cleanText(body.name, 80)
    if (!name) return safeError("Template name is required")

    if (!Array.isArray(body.exercises) || body.exercises.length === 0) {
      return safeError("Template must include at least one exercise")
    }

    // Validate and normalise exercises
    const exercises = (body.exercises as any[]).slice(0, 20).map((ex) => ({
      name:  cleanText(ex?.name,  100),
      setsReps: cleanText(ex?.setsReps, 20) || "3×12",
    })).filter((ex) => ex.name)

    if (exercises.length === 0) return safeError("No valid exercises found")

    // Enforce per-user template cap (50)
    const count = await db.workoutTemplate.count({ where: { userId: session.user.id } })
    if (count >= 50) return safeError("Template limit reached (max 50)")

    const template = await db.workoutTemplate.create({
      data: { userId: session.user.id, name, exercises },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 })
  }
}
