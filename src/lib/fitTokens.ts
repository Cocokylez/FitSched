import { Prisma } from "@prisma/client"

const BASE_WORKOUT_REWARD = new Prisma.Decimal(1)

type TokenTransaction = {
  amount: number
  reason: string
}

function toDateId(date: Date) {
  return date.toISOString().split("T")[0]
}

function calculateStreakBonus(streak: number) {
  if (streak <= 0) return new Prisma.Decimal(0)
  if (streak === 1) return new Prisma.Decimal(0.2)

  if (streak <= 7) {
    return new Prisma.Decimal(0.2 - ((streak - 1) * (0.1 / 6)))
  }

  if (streak <= 14) {
    return new Prisma.Decimal(0.1 - ((streak - 7) * (0.04 / 7)))
  }

  if (streak <= 30) {
    return new Prisma.Decimal(0.06 - ((streak - 14) * (0.04 / 16)))
  }

  return new Prisma.Decimal(0.02)
}

async function calculateCurrentStreak(tx: Prisma.TransactionClient, userId: string) {
  const logs = await tx.workoutSessionLog.findMany({
    where: { userId },
    select: { completedAt: true },
    orderBy: { completedAt: "desc" },
    take: 370,
  })

  const uniqueDates = new Set(logs.map((log) => toDateId(log.completedAt)))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  for (let i = 0; i < 365; i++) {
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    if (!uniqueDates.has(toDateId(expected))) break
    streak++
  }

  return streak
}

export async function awardFitTokensForWorkoutLogTx(
  tx: Prisma.TransactionClient,
  userId: string,
  workoutLogId: string,
  verificationScore = 1.0,
) {
  const workoutLog = await tx.workoutSessionLog.findFirst({
    where: { id: workoutLogId, userId },
    select: { id: true },
  })

  if (!workoutLog) {
    throw new Error("Workout log not found")
  }

  const existingReward = await tx.fitToken.findUnique({
    where: {
      userId_workoutLogId_reason: {
        userId,
        workoutLogId,
        reason: "workout_complete",
      },
    },
  })

  if (existingReward) {
    const balance = await tx.fitTokenBalance.findUnique({ where: { userId } })
    return {
      awarded: false,
      amount: 0,
      balance: Number(balance?.amount || 0),
      transactions: [] as TokenTransaction[],
    }
  }

  const streak = await calculateCurrentStreak(tx, userId)
  const streakBonus = calculateStreakBonus(streak)

  // Verification multiplier: ≥0.55 → full, 0.25–0.55 → half, <0.25 → no tokens
  const multiplier =
    verificationScore >= 0.55 ? new Prisma.Decimal(1)
    : verificationScore >= 0.25 ? new Prisma.Decimal(0.5)
    : new Prisma.Decimal(0)

  if (multiplier.equals(0)) {
    const balance = await tx.fitTokenBalance.findUnique({ where: { userId } })
    return {
      awarded: false,
      amount: 0,
      balance: Number(balance?.amount || 0),
      transactions: [] as TokenTransaction[],
    }
  }

  const scaledBase = BASE_WORKOUT_REWARD.times(multiplier).toDecimalPlaces(2)
  const scaledBonus = streakBonus.times(multiplier).toDecimalPlaces(2)
  const totalAward = scaledBase.plus(scaledBonus).toDecimalPlaces(2)

  const transactions: TokenTransaction[] = [
    { amount: scaledBase.toNumber(), reason: "workout_complete" },
  ]

  await tx.fitToken.create({
    data: {
      userId,
      workoutLogId,
      amount: scaledBase,
      reason: "workout_complete",
    },
  })

  if (scaledBonus.greaterThan(0)) {
    transactions.push({ amount: scaledBonus.toNumber(), reason: "streak_bonus" })

    await tx.fitToken.create({
      data: {
        userId,
        workoutLogId,
        amount: scaledBonus,
        reason: "streak_bonus",
      },
    })
  }

  const balance = await tx.fitTokenBalance.upsert({
    where: { userId },
    create: { userId, amount: totalAward },
    update: { amount: { increment: totalAward } },
  })

  return {
    awarded: true,
    amount: totalAward.toNumber(),
    balance: Number(balance.amount),
    transactions,
  }
}
