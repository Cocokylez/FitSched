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

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, password: true, accounts: { select: { provider: true }, take: 1 } },
  })

  if (!user) return NextResponse.json({ success: true })

  if (!user.password) {
    // Google (or other OAuth) account — tell the client so it can show the right message
    const provider = user.accounts[0]?.provider ?? "google"
    return NextResponse.json({ googleAccount: true, provider })
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
