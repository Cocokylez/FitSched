import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { rateLimitByUser, rateLimitPresets } from "@/lib/security"
import { randomBytes } from "crypto"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.strictWrite, "send-verification")
  if (limited) return limited

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  })

  if (!user?.email) return NextResponse.json({ error: "No email on account" }, { status: 400 })
  if (user.emailVerified) return NextResponse.json({ alreadyVerified: true })

  // Skip guest accounts
  if (user.email.endsWith("@fitsched.guest")) {
    return NextResponse.json({ error: "Guest accounts cannot verify email" }, { status: 400 })
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await db.emailVerificationToken.create({ data: { userId: session.user.id, token, expiresAt } })

  try {
    await sendVerificationEmail(user.email, token)
  } catch (err) {
    console.error("Failed to send verification email:", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
