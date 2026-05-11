import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText, clampInt, isDateId, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security"
import { NextResponse } from "next/server"

const SOURCES = new Set(["ai", "manual", "calendar", "workout"])

function normalizeScheduleExercises(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null

  return value.map((exercise) => ({
    name: cleanText((exercise as any)?.name, 100),
    description: cleanText((exercise as any)?.description, 500),
    time: cleanText((exercise as any)?.time, 20),
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
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.read, "workout-schedule:get")
    if (limited) return limited

    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")
    const days = searchParams.get("days")

    if (days) {
      const numDays = clampInt(days, 1, 90, 7)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - numDays)
      const startStr = startDate.toISOString().split("T")[0]

      const workouts = await db.workoutSchedule.findMany({
        where: {
          userId: session.user.id,
          date: { gte: startStr },
        },
        orderBy: { date: "desc" },
      })

      return NextResponse.json(workouts)
    }

    if (date) {
      if (!isDateId(date)) return safeError("Invalid date")
      const workouts = await db.workoutSchedule.findMany({
        where: {
          userId: session.user.id,
          date: date,
        },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json(workouts)
    }

    return NextResponse.json([])
  } catch (error) {
    console.error("Workout schedule GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch workout schedule" },
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
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "workout-schedule:post")
    if (limited) return limited

    const body = await readJsonBody(req)
    const date = body.date
    const workoutName = cleanText(body.workoutName, 100)
    const exercises = normalizeScheduleExercises(body.exercises)
    const source = typeof body.source === "string" && SOURCES.has(body.source) ? body.source : "ai"

    if (!isDateId(date) || !workoutName || !exercises?.length) {
      return safeError("Missing or invalid schedule fields")
    }

    const workout = await db.workoutSchedule.create({
      data: {
        userId: session.user.id,
        date,
        workoutName,
        exercises,
        source,
      },
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError

    console.error("Workout schedule POST error:", error)
    return NextResponse.json(
      { error: "Failed to save workout schedule" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "workout-schedule:patch")
    if (limited) return limited

    const body = await readJsonBody(req)
    const id = cleanText(body.id, 80)
    const date = body.date
    const workoutName = cleanText(body.workoutName, 100)
    const exercises = normalizeScheduleExercises(body.exercises)
    const source = typeof body.source === "string" && SOURCES.has(body.source) ? body.source : "manual"

    if (!id || !isDateId(date) || !workoutName || !exercises?.length) {
      return safeError("Missing or invalid schedule fields")
    }

    const existing = await db.workoutSchedule.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const workout = await db.workoutSchedule.update({
      where: { id },
      data: {
        date,
        workoutName,
        exercises,
        source,
      },
    })

    return NextResponse.json(workout)
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError

    console.error("Workout schedule PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update workout schedule" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "workout-schedule:delete")
    if (limited) return limited

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      )
    }

    const workout = await db.workoutSchedule.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!workout) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    await db.workoutSchedule.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Workout schedule DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete workout schedule" },
      { status: 500 }
    )
  }
}
