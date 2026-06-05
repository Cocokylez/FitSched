import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import {
  cleanText,
  logSecurityEvent,
  rateLimitByUser,
  rateLimitPresets,
  readJsonBody,
  requestBodyErrorResponse,
  safeError,
  validateSameOrigin,
} from "@/lib/security"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "profile:get")
    if (limited) return limited

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true, email: true, createdAt: true, walletAddress: true },
    })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.write, "profile:patch")
    if (limited) return limited

    const body = await readJsonBody(req)
    const data: { name?: string; image?: string | null; walletAddress?: string | null } = {}

    if ("name" in body) {
      const name = cleanText(body.name, 100)
      if (name) data.name = name
    }

    if ("image" in body) {
      const img = body.image
      if (typeof img === "string") {
        if (img === "") {
          data.image = null
        } else if (
          img.startsWith("data:image/jpeg") ||
          img.startsWith("data:image/png") ||
          img.startsWith("data:image/webp")
        ) {
          if (img.length > 220_000) return safeError("Image too large — max ~150 KB")
          data.image = img
        }
      }
    }

    if ("walletAddress" in body) {
      const addr = body.walletAddress
      if (addr === null || addr === "") {
        // Clearing a wallet doesn't redirect any payout, so it isn't gated.
        data.walletAddress = null
      } else if (typeof addr === "string") {
        // Validate EVM address: 0x + 40 hex chars
        if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
          return safeError("Invalid wallet address — must be a valid EVM address (0x…)")
        }
        const normalized = addr.toLowerCase()
        const current = await db.user.findUnique({
          where: { id: session.user.id },
          select: { walletAddress: true, password: true },
        })
        // Setting / redirecting the payout wallet is the one change an attacker
        // with a hijacked session would make, so require the password for it.
        if (normalized !== current?.walletAddress) {
          if (!current?.password) {
            return NextResponse.json(
              { error: "Set a password first to change your wallet.", code: "NO_PASSWORD" },
              { status: 409 },
            )
          }
          const pwd = typeof body.password === "string" ? body.password : ""
          if (!pwd) {
            return NextResponse.json(
              { error: "Password required to change wallet address", code: "PASSWORD_REQUIRED" },
              { status: 401 },
            )
          }
          const ok = await compare(pwd, current.password)
          if (!ok) {
            logSecurityEvent("wallet_change_bad_password", { userId: session.user.id })
            return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
          }
        }
        data.walletAddress = normalized
      }
    }

    if (Object.keys(data).length === 0) return safeError("Nothing to update")

    const updated = await db.user.update({
      where: { id: session.user.id },
      data,
      select: { name: true, image: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
