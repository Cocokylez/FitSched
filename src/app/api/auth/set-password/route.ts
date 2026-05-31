import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"
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

// Sets an initial password for a user who has none (typically Google-only
// signups). Refuses to overwrite an existing password — the reset-password
// flow handles that path with email verification.
export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const limited = await rateLimitByUser(req, userId, rateLimitPresets.strictWrite, "set-password:post")
    if (limited) return limited

    const body = await readJsonBody(req, 8_000)
    const password = typeof body?.password === "string" ? body.password : ""
    if (password.length < 8) return safeError("Password must be at least 8 characters")
    if (password.length > 128) return safeError("Password too long")

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })

    if (user?.password) {
      return NextResponse.json(
        { error: "Password already set. Use the reset flow to change it.", code: "PASSWORD_EXISTS" },
        { status: 409 },
      )
    }

    const hashed = await hash(password, 12)
    await db.user.update({
      where: { id: userId },
      data: { password: hashed },
    })

    logSecurityEvent("initial_password_set", { userId })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError

    console.error("set-password POST error:", error)
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 })
  }
}
