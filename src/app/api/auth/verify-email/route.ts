import { db } from "@/lib/db"
import { rateLimitByIp, rateLimitPresets, safeError } from "@/lib/security"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const limited = await rateLimitByIp(req, rateLimitPresets.auth, "verify-email")
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")?.trim()

  if (!token) return safeError("Missing token")

  const record = await db.emailVerificationToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, emailVerified: true } } },
  })

  if (!record) return safeError("Invalid or expired link", 410)
  if (record.expiresAt < new Date()) {
    await db.emailVerificationToken.delete({ where: { token } }).catch(() => {})
    return safeError("This link has expired. Please request a new one.", 410)
  }

  if (!record.user.emailVerified) {
    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
      db.emailVerificationToken.delete({ where: { token } }),
    ])
  }

  return NextResponse.json({ success: true })
}
