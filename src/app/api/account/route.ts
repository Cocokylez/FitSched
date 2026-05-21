import { auth, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets, validateSameOrigin } from "@/lib/security"
import { NextResponse } from "next/server"

export async function DELETE(req: Request) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.strictWrite, "account:delete")
  if (limited) return limited

  await db.user.delete({ where: { id: session.user.id } })

  await signOut({ redirect: false })

  return NextResponse.json({ success: true })
}
