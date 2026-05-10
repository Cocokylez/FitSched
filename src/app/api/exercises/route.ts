import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const SYSTEM_EXERCISES = [
  { name: "Push-ups", muscleGroup: "CHEST", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Classic bodyweight chest exercise" },
  { name: "Diamond Push-ups", muscleGroup: "CHEST", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Close-grip push-ups for triceps" },
  { name: "Tricep Dips", muscleGroup: "CHEST", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Bench or chair dips" },
  { name: "Pull-ups", muscleGroup: "BACK", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Overhand grip pull-ups" },
  { name: "Bicep Curls", muscleGroup: "ARMS", equipment: "DUMBBELLS", difficulty: "BEGINNER", description: "Standard dumbbell bicep curls" },
  { name: "Hammer Curls", muscleGroup: "ARMS", equipment: "DUMBBELLS", difficulty: "BEGINNER", description: "Neutral grip curls" },
  { name: "Superman Hold", muscleGroup: "BACK", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Lower back hold exercise" },
  { name: "Squats", muscleGroup: "LEGS", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Bodyweight squats" },
  { name: "Lunges", muscleGroup: "LEGS", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Forward lunges" },
  { name: "Glute Bridges", muscleGroup: "LEGS", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Hip bridge exercise" },
  { name: "Wall Sit", muscleGroup: "LEGS", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Isometric wall hold" },
  { name: "Pike Push-ups", muscleGroup: "SHOULDERS", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Elevated push-ups for shoulders" },
  { name: "Plank", muscleGroup: "CORE", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Front plank hold" },
  { name: "Russian Twist", muscleGroup: "CORE", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Seated rotational core exercise" },
  { name: "Mountain Climbers", muscleGroup: "CORE", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Dynamic plank exercise" },
  { name: "Burpees", muscleGroup: "FULL_BODY", equipment: "BODYWEIGHT", difficulty: "ADVANCED", description: "Full body explosive exercise" },
  { name: "Jump Squats", muscleGroup: "LEGS", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Explosive squat variation" },
  { name: "High Knees", muscleGroup: "CARDIO", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Running in place with high knees" },
  { name: "Calf Raises", muscleGroup: "LEGS", equipment: "BODYWEIGHT", difficulty: "BEGINNER", description: "Standing calf raises" },
  { name: "Leg Raises", muscleGroup: "CORE", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Lying leg raises" },
  { name: "Bicycle Crunches", muscleGroup: "CORE", equipment: "BODYWEIGHT", difficulty: "INTERMEDIATE", description: "Alternating crunch with rotation" },
  { name: "Curl to Press", muscleGroup: "ARMS", equipment: "DUMBBELLS", difficulty: "INTERMEDIATE", description: "Bicep curl into overhead press" },
  { name: "Tricep Extension", muscleGroup: "ARMS", equipment: "DUMBBELLS", difficulty: "BEGINNER", description: "Overhead tricep extension" },
  { name: "Lateral Raises", muscleGroup: "SHOULDERS", equipment: "DUMBBELLS", difficulty: "BEGINNER", description: "Side dumbbell raises" },
];

export async function GET(req: Request) {
  try {
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const muscleGroup = searchParams.get("muscleGroup");
    const equipment = searchParams.get("equipment");

    const where: any = { isSystem: true };
    if (muscleGroup) where.muscleGroup = muscleGroup;
    if (equipment) where.equipment = equipment;

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

    if (exercises.length === 0) {
      const created = await Promise.all(
        SYSTEM_EXERCISES.map((ex) =>
          db.exercise.create({
            data: {
              name: ex.name,
              muscleGroup: ex.muscleGroup as any,
              equipment: ex.equipment as any,
              difficulty: ex.difficulty as any,
              description: ex.description,
              isSystem: true,
            },
          })
        )
      );
      exercises = created;
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
