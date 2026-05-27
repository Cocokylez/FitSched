import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText, clampInt, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security"
import { NextResponse } from "next/server"

const WORKOUT_ENVIRONMENTS = new Set(["home_bodyweight", "home_dumbbells", "gym"])
const FITNESS_GOALS = new Set(["lose_weight", "build_muscle", "stay_active", "improve_endurance"])
const EXPERIENCE_LEVELS = new Set(["beginner", "intermediate", "advanced"])

function parseWorkoutEnvironment(value: unknown) {
  return typeof value === "string" && WORKOUT_ENVIRONMENTS.has(value) ? value : null
}

export async function POST(req: Request) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "onboarding:post")
  if (limited) return limited

  let body: any
  try {
    body = await readJsonBody(req)
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    return safeError("Invalid request")
  }
  const heightCmRaw = Number(body.heightCm)
  const weightKgRaw = Number(body.weightKg)
  const heightCm = Number.isFinite(heightCmRaw) && heightCmRaw >= 50 && heightCmRaw <= 260 ? heightCmRaw : null
  const weightKg = Number.isFinite(weightKgRaw) && weightKgRaw >= 20 && weightKgRaw <= 400 ? weightKgRaw : null
  const bmi = heightCm && weightKg
    ? Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10
    : null
  const hasInjury = Boolean(body.hasInjury)
  const workoutEnvironment = parseWorkoutEnvironment(body.workoutEnvironment)
  const fitnessGoal = typeof body.fitnessGoal === "string" && FITNESS_GOALS.has(body.fitnessGoal) ? body.fitnessGoal : "stay_active"
  const experienceLevel = typeof body.experienceLevel === "string" && EXPERIENCE_LEVELS.has(body.experienceLevel) ? body.experienceLevel : "beginner"
  const workoutsPerWeek = clampInt(body.workoutsPerWeek, 1, 6, 3)

  await db.user.update({
    where: { id: session.user.id },
    data: {
      fitnessGoal,
      experienceLevel,
      workoutsPerWeek,
      workoutEnvironment,
      heightCm,
      weightKg,
      bmi,
      hasInjury,
      injuryNotes: hasInjury ? cleanText(body.injuryNotes, 500) : null,
      onboardingCompleted: true,
    },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "onboarding:patch")
  if (limited) return limited

  let body: any
  try {
    body = await readJsonBody(req)
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    return safeError("Invalid request")
  }
  const data: Record<string, unknown> = {}

  if ("workoutEnvironment" in body) {
    const workoutEnvironment = parseWorkoutEnvironment(body.workoutEnvironment)
    if (!workoutEnvironment) return safeError("Invalid workout environment")
    data.workoutEnvironment = workoutEnvironment
  }

  if ("fitnessGoal" in body) {
    const fg = typeof body.fitnessGoal === "string" && FITNESS_GOALS.has(body.fitnessGoal) ? body.fitnessGoal : null
    if (fg) data.fitnessGoal = fg
  }

  if ("experienceLevel" in body) {
    const el = typeof body.experienceLevel === "string" && EXPERIENCE_LEVELS.has(body.experienceLevel) ? body.experienceLevel : null
    if (el) data.experienceLevel = el
  }

  if ("heightCm" in body) {
    const h = Number(body.heightCm)
    if (Number.isFinite(h) && h >= 50 && h <= 260) data.heightCm = h
  }

  if ("weightKg" in body) {
    const w = Number(body.weightKg)
    if (Number.isFinite(w) && w >= 20 && w <= 400) {
      data.weightKg = w
      // Recalculate BMI if we already have a height
      const existingUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { heightCm: true },
      })
      const h = existingUser?.heightCm
      if (h && h > 0) {
        data.bmi = Math.round((w / ((h / 100) ** 2)) * 10) / 10
      }
    }
  }

  if ("workoutsPerWeek" in body) {
    data.workoutsPerWeek = clampInt(body.workoutsPerWeek, 1, 6, 3)
  }

  if ("hasInjury" in body) {
    data.hasInjury = Boolean(body.hasInjury)
    if (!data.hasInjury) data.injuryNotes = null
  }

  if (Object.keys(data).length === 0) return safeError("No valid fields to update")

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: {
      workoutEnvironment: true,
      fitnessGoal: true,
      experienceLevel: true,
      workoutsPerWeek: true,
      heightCm: true,
      weightKg: true,
      hasInjury: true,
    },
  })

  return NextResponse.json(user ? {
    ...user,
    workoutEnvironment: parseWorkoutEnvironment(user.workoutEnvironment) || "gym",
  } : user)
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "onboarding:get")
  if (limited) return limited

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingCompleted: true,
      fitnessGoal: true,
      experienceLevel: true,
      workoutsPerWeek: true,
      workoutEnvironment: true,
      heightCm: true,
      weightKg: true,
      bmi: true,
      hasInjury: true,
      injuryNotes: true,
    },
  })

  return NextResponse.json(user ? {
    ...user,
    workoutEnvironment: parseWorkoutEnvironment(user.workoutEnvironment) || "gym",
  } : user)
}
