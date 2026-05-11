import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

const WORKOUT_ENVIRONMENTS = new Set(["home_bodyweight", "home_dumbbells", "gym"])

function parseWorkoutEnvironment(value: unknown) {
  return typeof value === "string" && WORKOUT_ENVIRONMENTS.has(value) ? value : null
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const heightCm = Number(body.heightCm) || null
  const weightKg = Number(body.weightKg) || null
  const bmi = heightCm && weightKg
    ? Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10
    : null
  const hasInjury = Boolean(body.hasInjury)
  const workoutEnvironment = parseWorkoutEnvironment(body.workoutEnvironment)

  await db.user.update({
    where: { id: session.user.id },
    data: {
      fitnessGoal: body.fitnessGoal,
      experienceLevel: body.experienceLevel,
      workoutsPerWeek: body.workoutsPerWeek,
      workoutEnvironment,
      heightCm,
      weightKg,
      bmi,
      hasInjury,
      injuryNotes: hasInjury ? String(body.injuryNotes || "").slice(0, 500) : null,
      onboardingCompleted: true,
    },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const data: { workoutEnvironment?: string } = {}

  if ("workoutEnvironment" in body) {
    const workoutEnvironment = parseWorkoutEnvironment(body.workoutEnvironment)
    if (!workoutEnvironment) {
      return NextResponse.json({ error: "Invalid workout environment" }, { status: 400 })
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

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  return NextResponse.json(user)
}
