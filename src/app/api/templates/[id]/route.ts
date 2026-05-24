import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets, validateSameOrigin } from "@/lib/security"
import { NextResponse } from "next/server"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "templates:delete")
    if (limited) return limited

    const { id } = await params

    const existing = await db.workoutTemplate.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db.workoutTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
  }
}
