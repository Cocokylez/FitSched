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
  const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "onboarding:post")
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
  const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "onboarding:patch")
  if (limited) return limited

  let body: any
  try {
    body = await readJsonBody(req)
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    return safeError("Invalid request")
  }
  const data: { workoutEnvironment?: string } = {}

  if ("workoutEnvironment" in body) {
    const workoutEnvironment = parseWorkoutEnvironment(body.workoutEnvironment)
    if (!workoutEnvironment) {
      return safeError("Invalid workout environment")
    }
    data.workoutEnvironment = workoutEnvironment
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: {
      workoutEnvironment: true,
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
  const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.read, "onboarding:get")
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
