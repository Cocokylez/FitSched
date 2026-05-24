import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets, validateSameOrigin } from "@/lib/security"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

const FREEZE_COST = new Prisma.Decimal(2)

export async function POST(req: Request) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const limited = await rateLimitByUser(req, userId, rateLimitPresets.write, "streak-freeze:post")
  if (limited) return limited

  try {
    const result = await db.$transaction(async (tx) => {
      const [user, balance] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { streakFreezeArmed: true } }),
        tx.fitTokenBalance.findUnique({ where: { userId } }),
      ])

      if (user?.streakFreezeArmed) {
        throw Object.assign(new Error("already_armed"), { code: "ALREADY_ARMED" })
      }

      const currentBalance = new Prisma.Decimal(balance?.amount ?? 0)
      if (currentBalance.lessThan(FREEZE_COST)) {
        throw Object.assign(new Error("insufficient_balance"), { code: "INSUFFICIENT_BALANCE" })
      }

      const newBalance = await tx.fitTokenBalance.update({
        where: { userId },
        data: { amount: { decrement: FREEZE_COST } },
      })

      await tx.user.update({
        where: { id: userId },
        data: { streakFreezeArmed: true },
      })

      return { balance: Number(newBalance.amount) }
    })

    return NextResponse.json({ ok: true, balance: result.balance, streakFreezeArmed: true })
  } catch (err: any) {
    if (err?.code === "ALREADY_ARMED") {
      return NextResponse.json({ error: "Streak freeze already active" }, { status: 409 })
    }
    if (err?.code === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Insufficient FitToken balance" }, { status: 402 })
    }
    console.error("streak-freeze POST error:", err)
    return NextResponse.json({ error: "Failed to activate streak freeze" }, { status: 500 })
  }
}
