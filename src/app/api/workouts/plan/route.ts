import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

function getModel() {
  const key = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { maxOutputTokens: 2000 },
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, prompt, startDate, endDate, goal } = await req.json();

    const exercises = await db.exercise.findMany({
      where: {
        OR: [
          { isSystem: true },
          { userId: session.user.id },
        ],
      },
    });

    const exerciseList = exercises
      .map(
        (e) =>
          `- ${e.name} (${e.muscleGroup}, ${e.equipment}, ${e.difficulty})`
      )
      .join("\n");

    const systemPrompt = `You are a workout plan generator. Create a weekly workout plan in JSON format.
Available exercises:
${exerciseList}

Return ONLY valid JSON with this structure:
{
  "days": [
    {
      "dayOfWeek": 0-6,
      "muscleGroup": "CHEST|BACK|LEGS|SHOULDERS|CORE|ARMS|FULL_BODY|CARDIO|REST",
      "exercises": [
        { "name": "exercise name", "sets": number, "reps": number, "restSeconds": number, "order": number }
      ]
    }
  ]
}`;

    const model = getModel();
    if (!model) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt || `Create a ${goal || "balanced"} workout plan for ${name || "my weekly routine"}.` }],
        },
      ],
    });

    const content = result.response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Invalid AI response" },
        { status: 500 }
      );
    }

    const plan = JSON.parse(jsonMatch[0]);

    const createdPlan = await db.workoutPlan.create({
      data: {
        userId: session.user.id,
        name: name || "AI Generated Plan",
        description: prompt || null,
        startDate: new Date(startDate) || new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isAIGenerated: true,
        aiPrompt: prompt || null,
        days: {
          create: plan.days.map((day: any, i: number) => ({
            dayOfWeek: day.dayOfWeek,
            muscleGroup: day.muscleGroup,
            order: i,
          })),
        },
      },
      include: {
        days: true,
      },
    });

    const dayMap = createdPlan.days.reduce((acc, day) => {
      acc[day.dayOfWeek] = day.id;
      return acc;
    }, {} as Record<number, string>);

    for (const day of plan.days) {
      const dayId = dayMap[day.dayOfWeek];
      for (const ex of day.exercises) {
        const exercise = await db.exercise.findFirst({
          where: { name: ex.name },
        });
        if (exercise) {
          await db.workoutPlanExercise.create({
            data: {
              planId: createdPlan.id,
              dayId,
              exerciseId: exercise.id,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds || 60,
              order: ex.order,
            },
          });
        }
      }
    }

    const fullPlan = await db.workoutPlan.findUnique({
      where: { id: createdPlan.id },
      include: {
        days: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(fullPlan);
  } catch (error) {
    console.error("Workout plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plans = await db.workoutPlan.findMany({
      where: { userId: session.user.id },
      include: {
        days: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
