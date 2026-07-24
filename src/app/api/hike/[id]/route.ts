import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets, validateSameOrigin } from "@/lib/security"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "hike:get")
  if (limited) return limited

  const { id } = await params

  const log = await db.hikeLog.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(log)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Reject cross-site requests: this DELETE deletes a hike and decrements the
  // user's FitToken balance, so a forged request is real data loss. Mirrors the
  // guards on weight/[id] and templates/[id].
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const limited = await rateLimitByUser(req, userId, rateLimitPresets.write, "hike:delete")
  if (limited) return limited

  const { id } = await params

  // Decrement FitTokenBalance by the sum of tokens awarded for this hike
  // before cascading the delete, so balance stays consistent.
  try {
    await db.$transaction(async (tx) => {
      const tokens = await tx.fitToken.findMany({
        where: { hikeLogId: id, userId },
        select: { amount: true },
      })
      const total = tokens.reduce(
        (s, t) => s.plus(new Prisma.Decimal(t.amount as unknown as string)),
        new Prisma.Decimal(0)
      )
      if (total.greaterThan(0)) {
        const balance = await tx.fitTokenBalance.findUnique({ where: { userId } })
        const earned  = new Prisma.Decimal(balance?.amount        ?? 0)
        const claimed = new Prisma.Decimal(balance?.claimedAmount ?? 0)

        // On-chain FIT can't be un-minted — block deletes that would drop
        // earnings below what's already been claimed (mirrors workout-log).
        if (earned.minus(total).lessThan(claimed)) {
          throw Object.assign(new Error("tokens_claimed"), { code: "TOKENS_CLAIMED" })
        }

        await tx.fitTokenBalance.updateMany({
          where: { userId },
          data: { amount: { decrement: total } },
        })
      }
      await tx.hikeLog.deleteMany({ where: { id, userId } })
    })
  } catch (error) {
    if ((error as any)?.code === "TOKENS_CLAIMED") {
      return NextResponse.json(
        { error: "This hike's tokens were already claimed on-chain, so the log can't be deleted." },
        { status: 409 },
      )
    }
    console.error("Hike DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete hike" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
