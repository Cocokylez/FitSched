import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isTokenDeployed, mintFitTokensOnChain, isValidEvmAddress } from "@/lib/fitTokenContract"
import { rateLimitByUser, rateLimitPresets, validateSameOrigin } from "@/lib/security"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  // ── Origin check ────────────────────────────────────────────────────────────
  const originError = validateSameOrigin(req)
  if (originError) return originError

  // ── Auth ────────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // ── Rate limit — one claim attempt per minute ───────────────────────────────
  const limited = await rateLimitByUser(req, userId, rateLimitPresets.write, "tokens-claim:post")
  if (limited) return limited

  // ── Feature flag: token not yet deployed ────────────────────────────────────
  if (!isTokenDeployed()) {
    return NextResponse.json(
      { status: "not_deployed", message: "FitToken is not yet deployed on Base. Check back soon!" },
      { status: 503 },
    )
  }

  try {
    // ── Step 1: Read current state ─────────────────────────────────────────────
    const [user, balance] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { walletAddress: true } }),
      db.fitTokenBalance.findUnique({ where: { userId } }),
    ])

    const walletAddress = user?.walletAddress
    if (!walletAddress || !isValidEvmAddress(walletAddress)) {
      return NextResponse.json({ error: "No wallet address saved on your profile" }, { status: 422 })
    }

    const totalEarned  = new Prisma.Decimal(balance?.amount        ?? 0)
    const totalClaimed = new Prisma.Decimal(balance?.claimedAmount ?? 0)
    const claimable    = totalEarned.minus(totalClaimed)

    if (claimable.lessThanOrEqualTo(0)) {
      return NextResponse.json({ error: "No claimable FIT balance" }, { status: 422 })
    }

    // ── Step 2: Optimistic lock — atomically reserve the claimable amount ──────
    //
    // Uses a raw UPDATE with a WHERE condition that matches only if claimedAmount
    // still equals the value we just read. If a concurrent request already
    // updated it, 0 rows match and we abort — no double-mint.
    //
    // This runs OUTSIDE any db.$transaction() so the DB connection is released
    // immediately, and no Prisma transaction is held open during the slow
    // blockchain call that follows.
    const claimableNum = claimable.toNumber()
    const expectedClaimedNum = totalClaimed.toNumber()

    const reservedRows = await db.$executeRaw`
      UPDATE "FitTokenBalance"
      SET    "claimedAmount" = "claimedAmount" + ${claimableNum}::numeric,
             "updatedAt"     = NOW()
      WHERE  "userId"        = ${userId}
        AND  "claimedAmount" = ${expectedClaimedNum}::numeric
        AND  "amount" - "claimedAmount" > 0
    `

    if (reservedRows === 0) {
      // Another concurrent claim already updated claimedAmount — safe to retry
      return NextResponse.json(
        { error: "Another claim is in progress. Please try again in a moment." },
        { status: 409 },
      )
    }

    // ── Step 3: Mint on-chain (outside any DB transaction) ─────────────────────
    //
    // If this fails, we compensate by rolling back the reservation.
    // The compensation itself is a simple decrement — not wrapped in a
    // transaction — so it won't deadlock even under high concurrency.
    let txHash: `0x${string}`
    try {
      const result = await mintFitTokensOnChain(walletAddress, claimableNum, "app_claim")
      txHash = result.txHash
    } catch (contractErr) {
      // ── Compensate: un-reserve the amount we just locked ────────────────────
      await db.$executeRaw`
        UPDATE "FitTokenBalance"
        SET    "claimedAmount" = "claimedAmount" - ${claimableNum}::numeric,
               "updatedAt"     = NOW()
        WHERE  "userId" = ${userId}
      `
      console.error("tokens-claim: on-chain mint failed, reservation rolled back:", contractErr)
      return NextResponse.json(
        { error: "On-chain mint failed. Your FIT balance is unchanged. Please try again." },
        { status: 500 },
      )
    }

    // ── Step 4: Return success ──────────────────────────────────────────────────
    const updatedBalance = await db.fitTokenBalance.findUnique({ where: { userId } })

    return NextResponse.json({
      ok:                 true,
      txHash,
      claimedAmount:      claimableNum,
      newClaimedTotal:    Number(updatedBalance?.claimedAmount ?? 0),
      remainingClaimable: 0,
      walletAddress,
    })
  } catch (err: any) {
    console.error("tokens-claim POST error:", err)
    return NextResponse.json({ error: "Failed to process claim. Please try again." }, { status: 500 })
  }
}
