import { db } from "@/lib/db"
import { hash } from "bcryptjs"
import { NextResponse } from "next/server"
import { rateLimitByIp, rateLimitPresets } from "@/lib/security"

export async function POST(req: Request) {
  const limited = await rateLimitByIp(req, rateLimitPresets.auth, "guest:create")
  if (limited) return limited

  try {
    const guestId = crypto.randomUUID().replace(/-/g, "").slice(0, 14)
    const email = `guest-${guestId}@fitsched.guest`
    const password = crypto.randomUUID()
    const hashed = await hash(password, 10)

    await db.user.create({
      data: {
        email,
        name: "Guest",
        password: hashed,
        onboardingCompleted: true,
        fitnessGoal: "general_fitness",
        experienceLevel: "beginner",
        workoutsPerWeek: 3,
        workoutEnvironment: "gym",
      },
    })

    return NextResponse.json({ email, password })
  } catch {
    return NextResponse.json({ error: "Failed to create guest session" }, { status: 500 })
  }
}
