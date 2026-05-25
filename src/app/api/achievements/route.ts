import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ACHIEVEMENT_MAP } from "@/lib/achievements"
import { rateLimitByUser, rateLimitPresets } from "@/lib/security"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "achievements:get")
    if (limited) return limited

    const rows = await db.userAchievement.findMany({
      where: { userId: session.user.id },
      orderBy: { unlockedAt: "asc" },
    })

    const achievements = rows
      .map((row) => {
        const def = ACHIEVEMENT_MAP[row.type]
        if (!def) return null
        return {
          type: row.type,
          name: def.name,
          description: def.description,
          svg: def.svg,
          tier: def.tier,
          unlockedAt: row.unlockedAt,
        }
      })
      .filter(Boolean)

    return NextResponse.json(achievements)
  } catch {
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
  }
}
