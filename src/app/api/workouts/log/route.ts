import { getServerSession, authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exerciseId, date, sets, duration, notes, rating } = await req.json();

    const log = await db.workoutLog.create({
      data: {
        userId: session.user.id,
        exerciseId,
        date: new Date(date) || new Date(),
        duration: duration || null,
        notes: notes || null,
        rating: rating || null,
        sets: {
          create: sets.map((s: any, i: number) => ({
            setNumber: i + 1,
            reps: s.reps,
            weight: s.weight || null,
            duration: s.duration || null,
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
    console.error("Workout log error:", error);
    return NextResponse.json(
      { error: "Failed to log workout" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const exerciseId = searchParams.get("exerciseId");

    const where: any = { userId: session.user.id };
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };
    if (exerciseId) where.exerciseId = exerciseId;

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
