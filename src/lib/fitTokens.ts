import { Prisma } from "@prisma/client"

const BASE_WORKOUT_REWARD = new Prisma.Decimal(1)

type TokenTransaction = {
  amount: number
  reason: string
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
    // Use the client-submitted `date` field (local YYYY-MM-DD) instead of
    // `completedAt` (UTC timestamp). toDateId(completedAt) produces a UTC date
    // that disagrees with the streak API for UTC+N users between midnight and
    // UTC-offset local time (e.g. 00:00-08:00 SGT = prior UTC day).
    select: { date: true },
    orderBy: { completedAt: "desc" },
    take: 370,
  })

  const uniqueDates = new Set(logs.map((log) => log.date))

  // Build a UTC reference axis for "today" and walk backwards.
  // The date strings in uniqueDates are local YYYY-MM-DD; because the client
  // always submits the correct local date, comparing against UTC-based day keys
  // is fine as long as we treat both as opaque YYYY-MM-DD strings.
  const todayUTC = new Date()
  todayUTC.setUTCHours(0, 0, 0, 0)

  let streak = 0
  for (let i = 0; i < 365; i++) {
    const expected = new Date(todayUTC)
    expected.setUTCDate(todayUTC.getUTCDate() - i)
    const key = expected.toISOString().split("T")[0]
    if (!uniqueDates.has(key)) break
    streak++
  }

  return streak
}

// ── Hike reward: 0.5 FT per km, capped at 50 km per hike ─────────────────────
export async function awardFitTokensForHikeTx(
  tx: Prisma.TransactionClient,
  userId: string,
  hikeLogId: string,
  distanceKm: number,
) {
  // Idempotency guard
  const existing = await tx.fitToken.findUnique({
    where: { userId_hikeLogId_reason: { userId, hikeLogId, reason: "hike_complete" } },
  })
  if (existing) {
    const balance = await tx.fitTokenBalance.findUnique({ where: { userId } })
    return { awarded: false, amount: 0, balance: Number(balance?.amount ?? 0) }
  }

  // 0.5 FT per km; cap single-hike reward at 25 FT (50 km)
  const clampedKm = Math.min(Math.max(distanceKm, 0), 50)
  const award = new Prisma.Decimal(clampedKm * 0.5).toDecimalPlaces(2)

  if (award.isZero()) {
    const balance = await tx.fitTokenBalance.findUnique({ where: { userId } })
    return { awarded: false, amount: 0, balance: Number(balance?.amount ?? 0) }
  }

  await tx.fitToken.create({
    data: { userId, hikeLogId, amount: award, reason: "hike_complete" },
  })

  const balance = await tx.fitTokenBalance.upsert({
    where: { userId },
    create: { userId, amount: award },
    update: { amount: { increment: award } },
  })

  return { awarded: true, amount: award.toNumber(), balance: Number(balance.amount) }
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
