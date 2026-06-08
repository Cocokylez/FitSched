import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { awardFitTokensForHikeTx } from "@/lib/fitTokens"
import { isUserBanned, flagHikeIfSuspicious } from "@/lib/antiCheat"
import { verifyHikeRoute } from "@/lib/hikeVerification"
import { cleanText, rateLimitByUser, rateLimitPresets, readJsonBody, requestBodyErrorResponse, validateSameOrigin } from "@/lib/security"
import { MIN_HIKE_KM } from "@/lib/hikeUtils"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

// Accept any date within ±38h of now — same window used for workout logs.
// Prevents backdating hikes to farm tokens from past days.
function isValidLoggedAt(raw: unknown): boolean {
  if (!raw) return true // absent = use server time, always valid
  const ms = new Date(raw as string).getTime()
  if (isNaN(ms)) return false
  return Math.abs(Date.now() - ms) < 38 * 60 * 60 * 1000
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "hike:get")
  if (limited) return limited

  const logs = await db.hikeLog.findMany({
    where: { userId: session.user.id },
    orderBy: { loggedAt: "desc" },
    take: 100,
  })

  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.strictWrite, "hike:post")
    if (limited) return limited

    if (await isUserBanned(session.user.id)) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 })
    }

    // routePoints can be up to ~400 waypoints; allow 100 KB for this route
    const body = await readJsonBody(req, 100_000)
    const { name, distanceKm, durationMin, elevationM, locationName, routePoints, notes, loggedAt } = body

    const distKm = Number(distanceKm)
    const durMin = Number(durationMin)

    if (!distKm || distKm <= 0 || !isFinite(distKm))
      return NextResponse.json({ error: "Distance is required" }, { status: 400 })
    if (distKm < MIN_HIKE_KM)
      return NextResponse.json({ error: `Hike too short to save (minimum ${MIN_HIKE_KM * 1000} m)` }, { status: 400 })
    if (!durMin || durMin <= 0 || !isFinite(durMin))
      return NextResponse.json({ error: "Duration is required" }, { status: 400 })
    if (distKm > 200)
      return NextResponse.json({ error: "Distance exceeds maximum (200 km)" }, { status: 400 })
    if (durMin > 1440)
      return NextResponse.json({ error: "Duration exceeds maximum (24 h)" }, { status: 400 })

    // Validate loggedAt is within ±38h — prevents backdating to farm old-day tokens
    if (!isValidLoggedAt(loggedAt)) {
      return NextResponse.json({ error: "Hike date must be today" }, { status: 400 })
    }

    const userId = session.user.id
    const hikeTimestamp = loggedAt ? new Date(loggedAt) : new Date()
    // YYYY-MM-DD of the hike in UTC — used for daily uniqueness check
    const hikeDate = hikeTimestamp.toISOString().split("T")[0]

    // ── Anti-cheat: analyze GPS route before any token award ─────────────────
    // verifyHikeRoute re-calculates distance from waypoints server-side,
    // excludes vehicle-speed segments (> 18 km/h sustained, 3-pt smoothed),
    // and excludes positional jumps (pause → drive → resume exploit).
    const verification = verifyHikeRoute(
      Array.isArray(routePoints) ? routePoints : [],
      distKm,
    )

    const result = await db.$transaction(async (tx) => {
      // Daily uniqueness guard — one hike reward per UTC day
      const existingToday = await tx.hikeLog.findFirst({
        where: {
          userId,
          loggedAt: {
            gte: new Date(`${hikeDate}T00:00:00.000Z`),
            lt:  new Date(`${hikeDate}T24:00:00.000Z`),
          },
        },
      })
      if (existingToday) {
        throw Object.assign(new Error("duplicate_hike"), { code: "DUPLICATE_HIKE" })
      }

      const log = await tx.hikeLog.create({
        data: {
          userId,
          name:         cleanText(name, 120) || "Hike",
          distanceKm:   Math.round(distKm * 100) / 100,
          durationMin:  Math.round(durMin),
          elevationM:   elevationM != null ? Math.round(Number(elevationM)) : null,
          locationName: cleanText(locationName, 120) || null,
          routePoints:  Array.isArray(routePoints) ? routePoints : undefined,
          notes:        cleanText(notes, 500) || null,
          loggedAt:     hikeTimestamp,
        },
      })

      // Award based on server-verified walking km only
      const fitTokenReward = await awardFitTokensForHikeTx(
        tx,
        userId,
        log.id,
        verification.rewardKm,
      )

      return { log, fitTokenReward }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    // Review signals — evaluated after the award so flagging never affects it.
    await flagHikeIfSuspicious(userId, distKm, verification)

    return NextResponse.json(
      {
        ...result.log,
        fitTokenReward: result.fitTokenReward,
        // Verification summary — client uses this to show accurate reward breakdown
        verification: {
          rewardKm:      verification.rewardKm,
          totalKm:       distKm,
          vehicleKm:     verification.vehicleKm,
          jumpKm:        verification.jumpKm,
          excludedRatio: verification.excludedRatio,
          hasGpsData:    verification.hasGpsData,
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    if (error?.code === "DUPLICATE_HIKE") {
      return NextResponse.json({ error: "A hike has already been logged for today" }, { status: 409 })
    }
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    console.error("Hike POST error:", error)
    return NextResponse.json({ error: "Failed to save hike" }, { status: 500 })
  }
}
