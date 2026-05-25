import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, validateSameOrigin } from "@/lib/security"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_workout_history",
      description: "Get the user's recent workout history and stats",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of recent workouts to fetch (1-20, default 7)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_fitness_profile",
      description: "Get the user's fitness profile including goal, experience, and environment",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_workout",
      description: "Schedule a workout for today or a specific date",
      parameters: {
        type: "object",
        required: ["workoutName", "exercises"],
        properties: {
          workoutName: { type: "string", description: "Name of the workout (e.g. 'Push Day', 'Full Body')" },
          exercises: {
            type: "array",
            description: "List of exercises",
            items: {
              type: "object",
              required: ["name", "sets", "reps"],
              properties: {
                name: { type: "string" },
                sets: { type: "number" },
                reps: { type: "number" },
              },
            },
          },
          date: { type: "string", description: "Date in YYYY-MM-DD format (defaults to today)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_streak_info",
      description: "Get the user's current workout streak and weekly progress",
      parameters: { type: "object", properties: {} },
    },
  },
]

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    if (name === "get_workout_history") {
      const limit = Math.min(Math.max(Number(args.limit) || 7, 1), 20)
      const logs = await db.workoutSessionLog.findMany({
        where: { userId },
        orderBy: { completedAt: "desc" },
        take: limit,
      })
      if (logs.length === 0) return "No workout history found. Suggest starting with a beginner workout today!"
      const formatted = logs.map((l) => {
        const exs = (l.exercises as Array<{ name: string; sets: number; reps: number; weight?: number }>) || []
        return `• ${l.workoutName} on ${l.date} — ${exs.map((e) => `${e.name} ${e.sets}×${e.reps}${e.weight ? ` @${e.weight}kg` : ""}`).join(", ")}`
      })
      return `Last ${logs.length} workouts:\n${formatted.join("\n")}`
    }

    if (name === "get_fitness_profile") {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { fitnessGoal: true, experienceLevel: true, workoutEnvironment: true, workoutsPerWeek: true, hasInjury: true, heightCm: true, weightKg: true, bmi: true },
      })
      if (!user) return "Profile not found."
      return JSON.stringify({
        goal: user.fitnessGoal ?? "not set",
        experience: user.experienceLevel ?? "not set",
        environment: user.workoutEnvironment ?? "not set",
        workoutsPerWeek: user.workoutsPerWeek ?? 3,
        hasInjury: user.hasInjury,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        bmi: user.bmi,
      })
    }

    if (name === "schedule_workout") {
      const workoutName = String(args.workoutName || "AI Workout").slice(0, 100)
      const exercises = (Array.isArray(args.exercises) ? args.exercises : []).slice(0, 10).map((e: unknown) => ({
        name: String((e as any).name || "Exercise").slice(0, 100),
        sets: Math.min(Math.max(Number((e as any).sets) || 3, 1), 10),
        reps: Math.min(Math.max(Number((e as any).reps) || 12, 1), 100),
      }))
      if (exercises.length === 0) return "Error: No exercises provided."
      const today = new Date().toISOString().split("T")[0]
      const date = typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : today
      const existing = await db.workoutSchedule.findFirst({ where: { userId, date } })
      if (existing) {
        await db.workoutSchedule.update({ where: { id: existing.id }, data: { workoutName, exercises, source: "ai" } })
      } else {
        await db.workoutSchedule.create({ data: { userId, date, workoutName, exercises, source: "ai" } })
      }
      return `✅ Scheduled "${workoutName}" for ${date} with ${exercises.length} exercises: ${exercises.map((e) => e.name).join(", ")}.`
    }

    if (name === "get_streak_info") {
      const [streakData, logs] = await Promise.all([
        db.user.findUnique({ where: { id: userId }, select: { streakFreezeArmed: true, ftBoostArmed: true } }),
        db.workoutSessionLog.findMany({ where: { userId }, select: { completedAt: true, date: true }, orderBy: { completedAt: "desc" }, take: 40 }),
      ])
      const uniqueDates = new Set(logs.map((l) => l.date))
      const today = new Date(); today.setHours(0, 0, 0, 0)
      let streak = 0
      for (let i = 0; i < 365; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i)
        const id = d.toISOString().split("T")[0]
        if (!uniqueDates.has(id)) break
        streak++
      }
      const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay())
      const weeklyCount = logs.filter((l) => new Date(l.completedAt) >= startOfWeek).length
      return `Current streak: ${streak} days. Workouts this week: ${weeklyCount}. Freeze armed: ${streakData?.streakFreezeArmed ?? false}. Token boost armed: ${streakData?.ftBoostArmed ?? false}.`
    }

    return "Unknown tool."
  } catch (err) {
    console.error(`Tool ${name} error:`, err)
    return `Error executing ${name}: ${err instanceof Error ? err.message : "unknown error"}`
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "chat:post")
    if (limited) return limited

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI chat is not configured. Add OPENAI_API_KEY to your environment." }, { status: 503 })
    }

    const body = await readJsonBody(req)
    const rawMessages = Array.isArray(body.messages) ? body.messages : []
    if (rawMessages.length === 0) return NextResponse.json({ error: "No messages provided" }, { status: 400 })

    // Only allow user messages; strip any injected system/tool messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = rawMessages
      .filter((m: unknown) => (m as any).role === "user" || (m as any).role === "assistant")
      .slice(-20) // keep last 20 turns max
      .map((m: unknown) => ({
        role: (m as any).role as "user" | "assistant",
        content: String((m as any).content || "").slice(0, 2000),
      }))

    const systemPrompt = `You are FitAI, a friendly and knowledgeable fitness assistant inside the FitSched app.
You help users with workout planning, recovery advice, and fitness goals.
You have access to the user's workout history, profile, and scheduling tools.
When a user asks you to schedule or plan a workout, use the schedule_workout tool to actually add it to their calendar.
Keep responses concise and actionable. Use markdown for formatting.
Don't make up specific data — use tools to get real data.`

    // Agentic loop: run up to 5 tool-call rounds
    const allMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ]

    let finalContent = ""
    let toolsUsed: string[] = []

    for (let round = 0; round < 5; round++) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: allMessages,
        tools: TOOLS,
        tool_choice: "auto",
        max_tokens: 800,
      })

      const choice = completion.choices[0]
      if (!choice) break

      allMessages.push(choice.message)

      if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
        const toolResults: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = []
        for (const call of choice.message.tool_calls) {
          // Only handle function-type tool calls
          if (call.type !== "function") continue
          const fn = (call as OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { function: { name: string; arguments: string } }).function
          let args: Record<string, unknown> = {}
          try { args = JSON.parse(fn.arguments) } catch {}
          const result = await executeTool(fn.name, args, session.user.id)
          toolsUsed.push(fn.name)
          toolResults.push({ role: "tool", tool_call_id: call.id, content: result })
        }
        allMessages.push(...toolResults)
        continue
      }

      finalContent = typeof choice.message.content === "string" ? choice.message.content : ""
      break
    }

    return NextResponse.json({ content: finalContent, toolsUsed })
  } catch (err) {
    const bodyError = requestBodyErrorResponse(err)
    if (bodyError) return bodyError
    console.error("Chat POST error:", err)
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 })
  }
}
