import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
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

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [balance, transactions] = await Promise.all([
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
        take: 5,
      }),
    ])

    return NextResponse.json({
      balance: Number(balance?.amount || 0),
      transactions: transactions.map(formatTransaction),
    })
  } catch (error) {
    console.error("FitToken GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch FitTokens" },
      { status: 500 },
    )
  }
}
