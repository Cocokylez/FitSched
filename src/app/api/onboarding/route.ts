import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  await db.user.update({
    where: { id: session.user.id },
    data: {
      fitnessGoal: body.fitnessGoal,
      experienceLevel: body.experienceLevel,
      workoutsPerWeek: body.workoutsPerWeek,
      onboardingCompleted: true,
    },
  })

  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      onboardingCompleted: true,
      fitnessGoal: true,
      experienceLevel: true,
      workoutsPerWeek: true,
    },
  })

  return NextResponse.json(user)
}
