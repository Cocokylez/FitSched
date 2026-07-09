import { createHmac, timingSafeEqual } from "crypto"

interface SessionPayload {
  userId: string
  date: string
  startedAt: number
}

function secret() {
  // SESSION_TOKEN_SECRET takes precedence; falls back to NEXTAUTH_SECRET so no
  // deployment change is required. An empty-key HMAC would make tokens forgeable
  // by anyone who notices the env var is missing, so fail loud instead.
  const value = process.env.SESSION_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!value) throw new Error("sessionToken: SESSION_TOKEN_SECRET / NEXTAUTH_SECRET / AUTH_SECRET not set")
  return value
}

export function signSessionToken(payload: SessionPayload): string {
  const data = JSON.stringify(payload)
  const sig = createHmac("sha256", secret()).update(data).digest("hex")
  return Buffer.from(data).toString("base64url") + "." + sig
}

export function verifySessionToken(token: string, expectedUserId: string): SessionPayload | null {
  try {
    const dot = token.lastIndexOf(".")
    if (dot === -1) return null

    const dataB64 = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const data = Buffer.from(dataB64, "base64url").toString("utf8")

    const expected = createHmac("sha256", secret()).update(data).digest()
    const provided = Buffer.from(sig, "hex")
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null  // tampered

    const payload = JSON.parse(data) as SessionPayload
    if (payload.userId !== expectedUserId) return null
    if (Date.now() - payload.startedAt > 4 * 60 * 60 * 1000) return null  // 4hr max session

    return payload
  } catch {
    return null
  }
}
