import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets, validateSameOrigin } from "@/lib/security"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

const BOOST_COST = new Prisma.Decimal(3)

export async function POST(req: Request) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const limited = await rateLimitByUser(req, userId, rateLimitPresets.write, "tokens-boost:post")
  if (limited) return limited

  try {
    const result = await db.$transaction(async (tx) => {
      const [user, balance] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { ftBoostArmed: true } }),
        tx.fitTokenBalance.findUnique({ where: { userId } }),
      ])

      if (user?.ftBoostArmed) {
        throw Object.assign(new Error("already_armed"), { code: "ALREADY_ARMED" })
      }

      // Check spendable balance (earned minus already-claimed on-chain) to prevent
      // spending tokens that have already been withdrawn, which corrupts claimable.
      const earned    = new Prisma.Decimal(balance?.amount        ?? 0)
      const claimed   = new Prisma.Decimal(balance?.claimedAmount ?? 0)
      const spendable = earned.minus(claimed)
      if (spendable.lessThan(BOOST_COST)) {
        throw Object.assign(new Error("insufficient_balance"), { code: "INSUFFICIENT_BALANCE" })
      }

      const newBalance = await tx.fitTokenBalance.update({
        where: { userId },
        data: { amount: { decrement: BOOST_COST } },
      })

      await tx.user.update({
        where: { id: userId },
        data: { ftBoostArmed: true },
      })

      return { balance: Number(newBalance.amount) }
    })

    return NextResponse.json({ ok: true, balance: result.balance, ftBoostArmed: true })
  } catch (err: any) {
    if (err?.code === "ALREADY_ARMED") {
      return NextResponse.json({ error: "Token boost already active" }, { status: 409 })
    }
    if (err?.code === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Insufficient FitToken balance" }, { status: 402 })
    }
    console.error("tokens-boost POST error:", err)
    return NextResponse.json({ error: "Failed to activate token boost" }, { status: 500 })
  }
}
