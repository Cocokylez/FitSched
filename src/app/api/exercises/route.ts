import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureSystemExercises } from "@/lib/systemExercises";
import { cleanText, rateLimitByIp, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security";
import { NextResponse } from "next/server";

const MUSCLE_GROUPS = new Set(["CHEST", "BACK", "LEGS", "SHOULDERS", "CORE", "ARMS", "FULL_BODY", "CARDIO", "REST"]);
const EQUIPMENT = new Set(["BODYWEIGHT", "DUMBBELLS", "BARBELL", "MACHINE", "CABLES", "BANDS", "KETTLEBELL"]);
const DIFFICULTY = new Set(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export async function GET(req: Request) {
  try {
    const session = await auth();
    const limited = session?.user?.id
      ? rateLimitByUser(req, session.user.id, rateLimitPresets.read, "exercises:get")
      : rateLimitByIp(req, rateLimitPresets.unauthenticated, "exercises:get:unauth");
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const muscleGroup = searchParams.get("muscleGroup");
    const equipment = searchParams.get("equipment");

    const where: any = { isSystem: true };
    if (muscleGroup) {
      if (!MUSCLE_GROUPS.has(muscleGroup)) return safeError("Invalid muscle group");
      where.muscleGroup = muscleGroup;
    }
    if (equipment) {
      if (!EQUIPMENT.has(equipment)) return safeError("Invalid equipment");
      where.equipment = equipment;
    }

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
    const originError = validateSameOrigin(req);
    if (originError) return originError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "exercises:post");
    if (limited) return limited;

    const body = await readJsonBody(req);
    const name = cleanText(body.name, 80);
    const description = cleanText(body.description, 500);
    const muscleGroup = typeof body.muscleGroup === "string" ? body.muscleGroup : "";
    const equipment = typeof body.equipment === "string" ? body.equipment : "BODYWEIGHT";
    const difficulty = typeof body.difficulty === "string" ? body.difficulty : "BEGINNER";

    if (!name || !MUSCLE_GROUPS.has(muscleGroup)) {
      return safeError("Name and valid muscle group required");
    }
    if (!EQUIPMENT.has(equipment) || !DIFFICULTY.has(difficulty)) return safeError("Invalid exercise metadata");

    const exercise = await db.exercise.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        muscleGroup,
        equipment,
        difficulty,
        isSystem: false,
      },
    });

    return NextResponse.json(exercise);
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error);
    if (bodyError) return bodyError;

    return NextResponse.json(
      { error: "Failed to create exercise" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const originError = validateSameOrigin(req);
    if (originError) return originError;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = rateLimitByUser(req, session.user.id, rateLimitPresets.write, "exercises:delete");
    if (limited) return limited;

    const { searchParams } = new URL(req.url);
    const id = cleanText(searchParams.get("id"), 80);

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
