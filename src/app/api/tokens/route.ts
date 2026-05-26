import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimitByUser, rateLimitPresets } from "@/lib/security"
import { NextResponse } from "next/server"

function formatTransaction(transaction: {
  id: string
  amount: unknown
  reason: string
  createdAt: Date
  workoutLog: { workoutName: string } | null
}) {
  return {
    id: transaction.id,
    amount: Number(transaction.amount),
    reason: transaction.reason,
    createdAt: transaction.createdAt,
    workoutName: transaction.workoutLog?.workoutName || "Workout",
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "tokens:get")
    if (limited) return limited

    const [balance, transactions, user] = await Promise.all([
      db.fitTokenBalance.findUnique({
        where: { userId: session.user.id },
      }),
      db.fitToken.findMany({
        where: { userId: session.user.id },
        include: {
          workoutLog: {
            select: { workoutName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: { ftBoostArmed: true, walletAddress: true },
      }).catch(() => null),
    ])

    const totalEarned  = Number(balance?.amount        || 0)
    const totalClaimed = Number(balance?.claimedAmount || 0)
    const claimable    = Math.max(0, totalEarned - totalClaimed)

    return NextResponse.json({
      balance:       totalEarned,
      claimable,
      claimed:       totalClaimed,
      transactions:  transactions.map(formatTransaction),
      ftBoostArmed:  (user as any)?.ftBoostArmed  ?? false,
      walletAddress: (user as any)?.walletAddress ?? null,
      tokenDeployed: Boolean(process.env.FIT_TOKEN_ADDRESS),
    })
  } catch (error) {
    console.error("FitToken GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch FitTokens" },
      { status: 500 },
    )
  }
}
