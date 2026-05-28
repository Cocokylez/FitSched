import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { cleanText, rateLimitByUser, rateLimitPresets, readJsonBody, validateSameOrigin } from "@/lib/security"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "push:unsubscribe")
  if (limited) return limited

  try {
    const body = await readJsonBody(req, 4_000)
    const endpoint = cleanText(body.endpoint, 2_000)
    if (!endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
    }

    // Only delete if it belongs to this user
    await db.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("push:unsubscribe error:", err)
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 })
  }
}
