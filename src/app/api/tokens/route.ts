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
  hikeLog: { name: string } | null
}) {
  const label =
    transaction.workoutLog?.workoutName ||
    (transaction.hikeLog
      ? `Hike${transaction.hikeLog.name ? `: ${transaction.hikeLog.name}` : ""}`
      : "Workout")
  return {
    id: transaction.id,
    amount: Number(transaction.amount),
    reason: transaction.reason,
    createdAt: transaction.createdAt,
    workoutName: label,
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

    const [balance, transactions, user, receipts] = await Promise.all([
      db.fitTokenBalance.findUnique({
        where: { userId: session.user.id },
      }),
      db.fitToken.findMany({
        where: { userId: session.user.id },
        include: {
          workoutLog: { select: { workoutName: true } },
          hikeLog:    { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: { walletAddress: true, email: true, emailVerified: true },
      }).catch(() => null),
      db.claimReceipt.findMany({
        where:   { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take:    10,
      }).catch(() => []),
    ])

    const totalEarned  = Number(balance?.amount        || 0)
    const totalClaimed = Number(balance?.claimedAmount || 0)
    const claimable    = Math.max(0, totalEarned - totalClaimed)

    return NextResponse.json({
      balance:       totalEarned,
      claimable,
      claimed:       totalClaimed,
      transactions:  transactions.map(formatTransaction),
      walletAddress: (user as any)?.walletAddress ?? null,
      // Why a claim would be rejected — lets the UI explain before the user tries
      claimEligibility: (user as any)?.email?.endsWith("@fitsched.guest") ? "guest_account"
        : !(user as any)?.emailVerified ? "email_unverified"
        : "ok",
      tokenDeployed: Boolean(process.env.FIT_TOKEN_ADDRESS),
      claimReceipts: receipts.map((r) => ({
        id:            r.id,
        txHash:        r.txHash,
        amount:        Number(r.amount),
        walletAddress: r.walletAddress,
        createdAt:     r.createdAt,
      })),
    })
  } catch (error) {
    console.error("FitToken GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch FitTokens" },
      { status: 500 },
    )
  }
}
