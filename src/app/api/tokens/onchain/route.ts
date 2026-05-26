import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isTokenDeployed, getOnChainFitBalance } from "@/lib/fitTokenContract"
import { rateLimitByUser, rateLimitPresets } from "@/lib/security"
import { NextResponse } from "next/server"

/**
 * GET /api/tokens/onchain
 *
 * Returns the live on-chain FIT balance for the authenticated user's wallet.
 * Only makes an RPC call when:
 *   a) FIT_TOKEN_ADDRESS is set (token is deployed), AND
 *   b) The user has a wallet address saved
 *
 * Returns { balance: null } in all other cases — callers should treat null as
 * "not available yet" rather than "zero".
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "tokens-onchain:get")
    if (limited) return limited

    // ── Feature flag ────────────────────────────────────────────────────────────
    if (!isTokenDeployed()) {
      return NextResponse.json({ balance: null, reason: "not_deployed" })
    }

    // ── Wallet required ─────────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where:  { id: session.user.id },
      select: { walletAddress: true },
    })

    if (!user?.walletAddress) {
      return NextResponse.json({ balance: null, reason: "no_wallet" })
    }

    // ── Live RPC call ───────────────────────────────────────────────────────────
    const balance = await getOnChainFitBalance(user.walletAddress)

    return NextResponse.json({ balance })
  } catch (err) {
    console.error("tokens-onchain GET error:", err)
    // Return null instead of 500 — the UI handles null gracefully
    return NextResponse.json({ balance: null, reason: "rpc_error" })
  }
}
