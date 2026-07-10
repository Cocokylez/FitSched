import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isTokenDeployed, mintFitTokensOnChain, isValidEvmAddress } from "@/lib/fitTokenContract"
import { rateLimitByUser, rateLimitPresets, validateSameOrigin } from "@/lib/security"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

// Minimum FIT required to trigger a claim.
// Prevents dust claims that waste gas and clog the distributor wallet.
const MIN_CLAIM_FIT = 10

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
      db.user.findUnique({ where: { id: userId }, select: { walletAddress: true, banned: true, email: true, emailVerified: true } }),
      db.fitTokenBalance.findUnique({ where: { userId } }),
    ])

    // Banned accounts cannot cash out earned tokens.
    if (user?.banned) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 })
    }

    // ── Sybil resistance: cashing out requires a real, verified account ────────
    // Earning stays open to everyone; only the on-chain claim is gated. Guest
    // accounts are throwaway by design, and unverified emails make scripted
    // multi-account farming nearly free — both are blocked here.
    if (user?.email?.endsWith("@fitsched.guest")) {
      return NextResponse.json(
        { error: "Guest accounts cannot claim FIT. Create a full account to keep your balance.", code: "GUEST_ACCOUNT" },
        { status: 403 },
      )
    }
    if (!user?.emailVerified) {
      return NextResponse.json(
        { error: "Verify your email address to claim FIT.", code: "EMAIL_UNVERIFIED" },
        { status: 403 },
      )
    }

    const walletAddress = user?.walletAddress
    if (!walletAddress || !isValidEvmAddress(walletAddress)) {
      return NextResponse.json({ error: "No wallet address saved on your profile" }, { status: 422 })
    }

    const totalEarned  = new Prisma.Decimal(balance?.amount        ?? 0)
    const totalClaimed = new Prisma.Decimal(balance?.claimedAmount ?? 0)
    const claimable    = totalEarned.minus(totalClaimed)
    const claimableNum = claimable.toNumber()

    if (claimable.lessThanOrEqualTo(0)) {
      return NextResponse.json({ error: "No claimable FIT balance" }, { status: 422 })
    }

    // ── Step 2: Minimum claim check ─────────────────────────────────────────────
    // Protects users from burning gas on tiny claims.
    // The minimum is enforced here (app layer) — the contract stays flexible.
    if (claimableNum < MIN_CLAIM_FIT) {
      return NextResponse.json(
        {
          error: `Minimum claim is ${MIN_CLAIM_FIT} FIT. You have ${claimableNum.toFixed(2)} FIT — keep earning!`,
          code:  "BELOW_MINIMUM",
          have:  claimableNum,
          need:  MIN_CLAIM_FIT,
        },
        { status: 422 },
      )
    }

    // ── Step 3: Optimistic lock — atomically reserve the claimable amount ──────
    //
    // Raw UPDATE with a WHERE condition matching only the claimedAmount we just
    // read. If a concurrent request already updated it, 0 rows match → abort.
    // The contract call happens OUTSIDE any DB transaction so the connection is
    // released immediately and not held during the slow blockchain round-trip.
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
      return NextResponse.json(
        { error: "Another claim is in progress. Please try again in a moment." },
        { status: 409 },
      )
    }

    // ── Step 4: Mint on-chain (outside any DB transaction) ─────────────────────
    let txHash: `0x${string}`
    try {
      const result = await mintFitTokensOnChain(walletAddress, claimableNum, "app_claim")
      txHash = result.txHash
    } catch (contractErr) {
      // Compensate: roll back the reservation so user can retry.
      // Wrapped in its own try/catch — if the rollback itself fails, the user's
      // claimedAmount is incremented but no tokens were minted. Log loudly so
      // it can be corrected manually; never silently swallow this.
      try {
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
      } catch (rollbackErr) {
        // ⚠️ CRITICAL: reservation incremented but tokens never minted.
        // Manual correction required: set claimedAmount back by ${claimableNum} for userId.
        console.error(
          "tokens-claim: CRITICAL — compensation rollback failed. User balance requires manual correction.",
          { userId, claimableNum, contractErr, rollbackErr },
        )
        return NextResponse.json(
          { error: "A critical error occurred processing your claim. Please contact support." },
          { status: 500 },
        )
      }
    }

    // ── Step 5: Store claim receipt (audit trail) ──────────────────────────────
    // Non-fatal — tokens are already on-chain. Don't fail the response if this
    // write fails; just log the error.
    await db.claimReceipt.create({
      data: {
        userId,
        txHash,
        amount:        new Prisma.Decimal(claimableNum),
        walletAddress,
      },
    }).catch((err) => {
      console.error("tokens-claim: failed to write ClaimReceipt (tokens already minted):", err)
    })

    // ── Step 6: Return success ──────────────────────────────────────────────────
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
