import { db } from "@/lib/db"
import { rateLimitByIp, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security"
import { hash } from "bcryptjs"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const limited = await rateLimitByIp(req, rateLimitPresets.auth, "reset-password")
  if (limited) return limited

  let body: any
  try { body = await readJsonBody(req) } catch (e) {
    return requestBodyErrorResponse(e) ?? safeError()
  }

  const token = typeof body.token === "string" ? body.token.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!token) return safeError("Invalid token")
  if (password.length < 8) return safeError("Password must be at least 8 characters")
  if (password.length > 128) return safeError("Password too long")

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true } } },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return safeError("This link has expired or already been used", 410)
  }

  const hashed = await hash(password, 12)

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashed,
        tokenVersion: { increment: 1 }, // Invalidate all existing JWTs
      },
    }),
    db.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ])

  return NextResponse.json({ success: true })
}
