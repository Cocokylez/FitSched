import { db } from "@/lib/db"
import { verifyBearerSecret } from "@/lib/security"
import { NextResponse } from "next/server"

// Manual moderation endpoint — ban or unban an account.
// Protected by ADMIN_SECRET (Bearer), same pattern as the cron routes.
//
//   curl -X POST https://fitsched.vercel.app/api/admin/ban \
//     -H "Authorization: Bearer $ADMIN_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"email":"cheater@example.com","banned":true,"reason":"token farming"}'
//
// Enforcement lives in: dashboard layout (redirects to /banned), and the
// earning/claim routes (isUserBanned → 403).
export async function POST(req: Request) {
  if (!verifyBearerSecret(req.headers.get("authorization"), process.env.ADMIN_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { userId?: string; email?: string; banned?: boolean; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const banned = body.banned !== false // default to ban=true unless explicitly false
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 200) : null
  const where =
    typeof body.userId === "string" && body.userId
      ? { id: body.userId }
      : typeof body.email === "string" && body.email
        ? { email: body.email.toLowerCase() }
        : null

  if (!where) {
    return NextResponse.json({ error: "userId or email required" }, { status: 400 })
  }

  try {
    const user = await db.user.update({
      where,
      data: {
        banned,
        bannedAt: banned ? new Date() : null,
        bannedReason: banned ? reason : null,
      },
      select: { id: true, email: true, banned: true, bannedReason: true },
    })
    return NextResponse.json({ ok: true, user })
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
}
