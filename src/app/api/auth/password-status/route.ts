import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets } from "@/lib/security"
import { NextResponse } from "next/server"

// Returns whether the authenticated user has a password set. Used by client
// flows that need to choose between "verify existing password" vs
// "create initial password" (Google-only signups have no password).
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "password-status:get")
  if (limited) return limited

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })

  return NextResponse.json({ hasPassword: Boolean(user?.password) })
}
