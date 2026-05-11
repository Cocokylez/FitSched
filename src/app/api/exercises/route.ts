import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureSystemExercises } from "@/lib/systemExercises";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const muscleGroup = searchParams.get("muscleGroup");
    const equipment = searchParams.get("equipment");

    const where: any = { isSystem: true };
    if (muscleGroup) where.muscleGroup = muscleGroup;
    if (equipment) where.equipment = equipment;

    await ensureSystemExercises(db);

    let exercises = await db.exercise.findMany({
      where,
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });

    if (session?.user?.id) {
      const userExercises = await db.exercise.findMany({
        where: {
          OR: [{ userId: session.user.id }],
        },
        orderBy: { name: "asc" },
      });
      exercises = [...exercises, ...userExercises];
    }

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Exercises fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercises" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, muscleGroup, equipment, difficulty } =
      await req.json();

    if (!name || !muscleGroup) {
      return NextResponse.json(
        { error: "Name and muscle group required" },
        { status: 400 }
      );
    }

    const exercise = await db.exercise.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        muscleGroup,
        equipment: equipment || "BODYWEIGHT",
        difficulty: difficulty || "BEGINNER",
        isSystem: false,
      },
    });

    return NextResponse.json(exercise);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create exercise" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Exercise ID required" },
        { status: 400 }
      );
    }

    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise || exercise.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system exercises" },
        { status: 403 }
      );
    }

    if (exercise.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.exercise.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete exercise" },
      { status: 500 }
    );
  }
}
