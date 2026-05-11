import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanText, clampInt, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req);
    if (originError) return originError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "legacy-workout-log:post");
    if (limited) return limited;

    const body = await readJsonBody(req);
    const exerciseId = cleanText(body.exerciseId, 80);
    const date = new Date(body.date || Date.now());
    const sets = Array.isArray(body.sets) ? body.sets.slice(0, 20) : [];
    const duration = body.duration ? clampInt(body.duration, 1, 24 * 60, 30) : null;
    const notes = cleanText(body.notes, 500) || null;
    const rating = body.rating ? clampInt(body.rating, 1, 5, 3) : null;

    if (!exerciseId || Number.isNaN(date.getTime()) || sets.length === 0) {
      return safeError("Missing or invalid workout log fields");
    }

    const exercise = await db.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ isSystem: true }, { userId: session.user.id }],
      },
      select: { id: true },
    });

    if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

    const log = await db.workoutLog.create({
      data: {
        userId: session.user.id,
        exerciseId,
        date,
        duration,
        notes,
        rating,
        sets: {
          create: sets.map((s: any, i: number) => ({
            setNumber: i + 1,
            reps: clampInt(s.reps, 1, 200, 10),
            weight: Number.isFinite(Number(s.weight)) ? Math.max(0, Math.min(1000, Number(s.weight))) : null,
            duration: s.duration ? clampInt(s.duration, 1, 3600, 60) : null,
            completed: s.completed !== false,
          })),
        },
      },
      include: {
        sets: true,
        exercise: true,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error);
    if (bodyError) return bodyError;

    console.error("Workout log error:", error);
    return NextResponse.json(
      { error: "Failed to log workout" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.read, "legacy-workout-log:get");
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const exerciseId = searchParams.get("exerciseId");

    const where: any = { userId: session.user.id };
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (Number.isNaN(parsedStart.getTime())) return safeError("Invalid date range");
      where.date = { gte: parsedStart };
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) return safeError("Invalid date range");
      where.date = { ...where.date, lte: parsedEnd };
    }
    if (exerciseId) where.exerciseId = cleanText(exerciseId, 80);

    const logs = await db.workoutLog.findMany({
      where,
      include: {
        sets: true,
        exercise: true,
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
