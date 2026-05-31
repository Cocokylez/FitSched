import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import {
  logSecurityEvent,
  rateLimitByUser,
  rateLimitPresets,
  readJsonBody,
  requestBodyErrorResponse,
  safeError,
  validateSameOrigin,
} from "@/lib/security"
import { NextResponse } from "next/server"

// Verifies the authenticated user's current password. Used as a guard before
// sensitive actions (withdraw, profile edit). On success returns 200 with
// { ok: true }; on bad password returns 401 with { error }. If the user has
// no password yet (Google-only signup) returns 409 with code NO_PASSWORD so
// the client can switch to the "set initial password" flow.
export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Strict rate limit — protects against online password guessing.
    const limited = await rateLimitByUser(req, userId, rateLimitPresets.auth, "verify-password:post")
    if (limited) return limited

    const body = await readJsonBody(req, 8_000)
    const password = typeof body?.password === "string" ? body.password : ""
    if (!password || password.length > 128) return safeError("Password is required")

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })

    if (!user?.password) {
      return NextResponse.json(
        { error: "No password set", code: "NO_PASSWORD" },
        { status: 409 },
      )
    }

    const valid = await compare(password, user.password)
    if (!valid) {
      logSecurityEvent("verify_password_failed", { userId })
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError

    console.error("verify-password POST error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
