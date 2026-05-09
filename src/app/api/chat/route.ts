import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import OpenAI from "openai";
import { NextResponse } from "next/server";

function getDeepSeek() {
  const key = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: key,
  });
}

const lastCall = new Map<string, number>();

const systemPrompt = `You are FitSched AI, a fitness scheduling assistant.
Be concise. Max 150 words per response.
When recommending workouts, format them exactly like this JSON:
{
  "hasWorkout": true,
  "workout": {
    "name": "Full Body",
    "exercises": [
      { "name": "Push Ups", "sets": 3, "reps": 12 },
      { "name": "Squats", "sets": 3, "reps": 15 }
    ]
  }
}
If not recommending a workout, set hasWorkout: false.`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.email || "anonymous";
    const now = Date.now();
    const last = lastCall.get(userId) || 0;
    if (now - last < 10000) {
      return NextResponse.json(
        { error: "Please wait a moment before sending another message" },
        { status: 429 }
      );
    }
    lastCall.set(userId, now);

    const { messages } = await req.json();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        calendarConnections: true,
      },
    });

    const today = new Date();
    const dayOfWeek = today.getDay();
    const muscleGroups = [
      "Rest",
      "Chest & Triceps",
      "Back & Biceps",
      "Legs",
      "Shoulders & Core",
      "Full Body",
      "Arms & Core",
    ];

    const calendarEvents = user?.calendarConnections?.length
      ? await db.calendarEvent.findMany({
          where: {
            connectionId: user.calendarConnections[0].id,
            startTime: {
              gte: new Date(today.setHours(0, 0, 0, 0)),
            },
            endTime: {
              lte: new Date(today.setHours(23, 59, 59, 999)),
            },
          },
        })
      : [];

    const scheduleContext = calendarEvents
      .map(
        (e) =>
          `${e.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}: ${e.summary}`
      )
      .join("\n");

    let recentContext = "";
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentWorkouts = await db.workoutSchedule.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: weekAgo },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recentWorkouts.length > 0) {
        recentContext = `\nRecent workouts to AVOID repeating: ${recentWorkouts.map((w) => w.workoutName).join(", ")}\nGenerate something completely different from the above.`;
      }
    } catch {}

    const userProfile = user ? `
User profile:
- Goal: ${user.fitnessGoal || "general fitness"}
- Experience: ${user.experienceLevel || "intermediate"}
- Workouts per week: ${user.workoutsPerWeek || 3}` : ""

    const fullSystemPrompt = `${systemPrompt}
Today: ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek]}.
Muscle group: ${muscleGroups[dayOfWeek]}.
${calendarEvents.length ? `User's schedule today:\n${scheduleContext}` : "No calendar connected."}${recentContext}${userProfile}

Generate workouts matching this profile exactly.`;

    const openAiMessages = [
      { role: "system" as const, content: fullSystemPrompt },
      ...messages.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      })),
    ];

    const deepseek = getDeepSeek();
    if (!deepseek) {
      return NextResponse.json({
        message: "AI is not configured — ask about your saved workouts instead!"
      });
    }

    const result = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: openAiMessages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const assistantMessage = result.choices[0]?.message?.content || "";

    await db.chatMessage.createMany({
      data: [
        {
          userId: session.user.id,
          role: "USER",
          content: messages[messages.length - 1].content,
        },
        {
          userId: session.user.id,
          role: "ASSISTANT",
          content: assistantMessage,
        },
      ],
    });

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    const isQuota = error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("insufficient_quota");
    if (isQuota) {
      return NextResponse.json({
        message: "I'm out of requests right now — my quota is used up. Try again later or ask about your saved workouts in the meantime!"
      });
    }
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
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

    const messages = await db.chatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json(
      messages.map((m) => ({
        role: m.role.toLowerCase(),
        content: m.content,
        createdAt: m.createdAt,
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
