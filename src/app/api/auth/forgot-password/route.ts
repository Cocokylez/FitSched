import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import { rateLimitByIp, rateLimitPresets, readJsonBody, requestBodyErrorResponse, safeError, validateSameOrigin } from "@/lib/security"
import { randomBytes } from "crypto"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const limited = await rateLimitByIp(req, rateLimitPresets.auth, "forgot-password")
  if (limited) return limited

  let body: any
  try { body = await readJsonBody(req) } catch (e) {
    return requestBodyErrorResponse(e) ?? safeError()
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : ""
  if (!email) return safeError("Email is required")

  // Always return success to avoid email enumeration
  const user = await db.user.findUnique({ where: { email }, select: { id: true, password: true } })
  if (!user?.password) {
    // No credentials account — silently succeed (user signed up with Google)
    return NextResponse.json({ success: true })
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } })

  try {
    await sendPasswordResetEmail(email, token)
  } catch (err) {
    console.error("Failed to send reset email:", err)
  }

  return NextResponse.json({ success: true })
}
