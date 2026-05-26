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
    const result = await db.$transaction(async (tx) => {
      // ── Load user wallet + balance in one shot ──────────────────────────────
      const [user, balance] = await Promise.all([
        tx.user.findUnique({
          where:  { id: userId },
          select: { walletAddress: true },
        }),
        tx.fitTokenBalance.findUnique({ where: { userId } }),
      ])

      // ── Wallet address required ─────────────────────────────────────────────
      const walletAddress = user?.walletAddress
      if (!walletAddress || !isValidEvmAddress(walletAddress)) {
        throw Object.assign(
          new Error("No wallet address set"),
          { code: "NO_WALLET" },
        )
      }

      // ── Must have something to claim ────────────────────────────────────────
      const totalEarned  = new Prisma.Decimal(balance?.amount        ?? 0)
      const totalClaimed = new Prisma.Decimal(balance?.claimedAmount ?? 0)
      const claimable    = totalEarned.minus(totalClaimed)

      if (claimable.lessThanOrEqualTo(0)) {
        throw Object.assign(
          new Error("Nothing to claim"),
          { code: "NOTHING_TO_CLAIM" },
        )
      }

      // ── Mint on-chain (may throw if RPC fails) ──────────────────────────────
      const { txHash } = await mintFitTokensOnChain(
        walletAddress,
        claimable.toNumber(),
        "app_claim",
      )

      // ── Record claim in DB ──────────────────────────────────────────────────
      const updated = await tx.fitTokenBalance.update({
        where: { userId },
        data:  { claimedAmount: { increment: claimable } },
      })

      return {
        txHash,
        claimedAmount: claimable.toNumber(),
        newClaimedTotal: Number(updated.claimedAmount),
        remainingClaimable: 0,
        walletAddress,
      }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    if (err?.code === "NO_WALLET") {
      return NextResponse.json({ error: "No wallet address saved on your profile" }, { status: 422 })
    }
    if (err?.code === "NOTHING_TO_CLAIM") {
      return NextResponse.json({ error: "No claimable FIT balance" }, { status: 422 })
    }
    console.error("tokens-claim POST error:", err)
    return NextResponse.json({ error: "Failed to process claim. Please try again." }, { status: 500 })
  }
}
