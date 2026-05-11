import { handlers } from "@/lib/auth"
import { rateLimitByIp, rateLimitPresets, validateSameOrigin } from "@/lib/security"
import type { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const limited = rateLimitByIp(req, rateLimitPresets.unauthenticated, "auth:get")
  if (limited) return limited

  return handlers.GET(req)
}

export async function POST(req: NextRequest) {
  const originError = validateSameOrigin(req)
  if (originError) return originError

  const limited = rateLimitByIp(req, rateLimitPresets.auth, "auth:post")
  if (limited) return limited

  return handlers.POST(req)
}
