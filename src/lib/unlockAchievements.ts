import type { PrismaClient } from "@prisma/client"
import { ACHIEVEMENT_DEFS } from "@/lib/achievements"

// Runs inside a Prisma transaction (or outside — both work).
// Returns array of newly unlocked achievement types.
export async function unlockAchievementsForUser(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  userId: string
): Promise<string[]> {
  // Load everything we need in parallel
  const [sessionLogs, hikeLogs, tokenBalance, weightLogs, existing] = await Promise.all([
    tx.workoutSessionLog.findMany({ where: { userId }, select: { completedAt: true } }),
    tx.hikeLog.findMany({ where: { userId }, select: { distanceKm: true } }),
    tx.fitTokenBalance.findUnique({ where: { userId }, select: { amount: true } }),
    tx.weightLog.findMany({ where: { userId }, select: { id: true } }),
    tx.userAchievement.findMany({ where: { userId }, select: { type: true } }),
  ])

  const alreadyUnlocked = new Set(existing.map((a) => a.type))
  const totalWorkouts = sessionLogs.length
  const totalHikeKm = hikeLogs.reduce((s, h) => s + h.distanceKm, 0)
  const totalTokens = Number(tokenBalance?.amount ?? 0)
  const totalWeightLogs = weightLogs.length

  // Calculate current streak from completedAt dates
  const uniqueDates = new Set(
    sessionLogs.map((l) => l.completedAt.toISOString().slice(0, 10))
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let currentStreak = 0
  for (let i = 0; i < 400; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (!uniqueDates.has(key)) break
    currentStreak++
  }

  // Determine which achievements should now be unlocked
  const shouldBeUnlocked = new Set<string>()

  if (totalWorkouts >= 1)   shouldBeUnlocked.add("first_workout")
  if (totalWorkouts >= 5)   shouldBeUnlocked.add("workouts_5")
  if (totalWorkouts >= 10)  shouldBeUnlocked.add("workouts_10")
  if (totalWorkouts >= 25)  shouldBeUnlocked.add("workouts_25")
  if (totalWorkouts >= 50)  shouldBeUnlocked.add("workouts_50")
  if (totalWorkouts >= 100) shouldBeUnlocked.add("workouts_100")

  if (currentStreak >= 3)  shouldBeUnlocked.add("streak_3")
  if (currentStreak >= 7)  shouldBeUnlocked.add("streak_7")
  if (currentStreak >= 14) shouldBeUnlocked.add("streak_14")
  if (currentStreak >= 30) shouldBeUnlocked.add("streak_30")

  if (hikeLogs.length >= 1)   shouldBeUnlocked.add("first_hike")
  if (totalHikeKm >= 10)   shouldBeUnlocked.add("hike_km_10")
  if (totalHikeKm >= 50)   shouldBeUnlocked.add("hike_km_50")
  if (totalHikeKm >= 100)  shouldBeUnlocked.add("hike_km_100")

  if (totalWeightLogs >= 1) shouldBeUnlocked.add("first_weight_log")
  if (totalWeightLogs >= 7) shouldBeUnlocked.add("weight_log_7")

  if (totalTokens >= 10)  shouldBeUnlocked.add("tokens_10")
  if (totalTokens >= 50)  shouldBeUnlocked.add("tokens_50")

  // Only valid achievement types (guards against stale ACHIEVEMENT_DEFS keys)
  const validTypes = new Set(ACHIEVEMENT_DEFS.map((d) => d.type))

  const newTypes = [...shouldBeUnlocked].filter(
    (t) => validTypes.has(t) && !alreadyUnlocked.has(t)
  )

  if (newTypes.length > 0) {
    await tx.userAchievement.createMany({
      data: newTypes.map((type) => ({ userId, type })),
      skipDuplicates: true,
    })
  }

  return newTypes
}
