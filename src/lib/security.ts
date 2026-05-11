import { NextResponse } from "next/server"

type RateLimitPreset = {
  windowMs: number
  max: number
}

type RateLimitOptions = RateLimitPreset & {
  key: string
  name: string
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

declare global {
  // In-memory limits are useful on a single Node runtime. Configure Redis,
  // Upstash, Vercel KV, or another shared store before relying on this for
  // multi-region production abuse prevention.
  // eslint-disable-next-line no-var
  var __fitschedRateLimits: Map<string, RateLimitBucket> | undefined
}

const buckets = globalThis.__fitschedRateLimits ?? new Map<string, RateLimitBucket>()
globalThis.__fitschedRateLimits = buckets

export const rateLimitPresets = {
  auth: { windowMs: 15 * 60 * 1000, max: 20 },
  unauthenticated: { windowMs: 60 * 1000, max: 20 },
  read: { windowMs: 60 * 1000, max: 120 },
  write: { windowMs: 60 * 1000, max: 40 },
  strictWrite: { windowMs: 60 * 1000, max: 12 },
  expensive: { windowMs: 60 * 60 * 1000, max: 10 },
} satisfies Record<string, RateLimitPreset>

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    forwardedFor ||
    "unknown"
  )
}

export function rateLimit(req: Request, options: RateLimitOptions) {
  const now = Date.now()
  const bucketKey = `${options.name}:${options.key}`
  const current = buckets.get(bucketKey)

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return null
  }

  current.count += 1

  if (current.count <= options.max) return null

  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  logSecurityEvent("rate_limit_hit", {
    route: new URL(req.url).pathname,
    name: options.name,
    retryAfter,
  })

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  )
}

export function rateLimitByIp(req: Request, preset: RateLimitPreset, name: string) {
  return rateLimit(req, {
    ...preset,
    key: getClientIp(req),
    name,
  })
}

export function rateLimitByUser(req: Request, userId: string, preset: RateLimitPreset, name: string) {
  return rateLimit(req, {
    ...preset,
    key: userId,
    name,
  })
}

export function validateSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return null

  const origin = req.headers.get("origin")
  if (!origin) return null

  const host = req.headers.get("host")
  if (!host) return null

  try {
    if (new URL(origin).host === host) return null
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  }

  logSecurityEvent("cross_origin_blocked", {
    route: new URL(req.url).pathname,
  })
  return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
}

export async function readJsonBody(req: Request, maxBytes = 32_000) {
  const contentLength = Number(req.headers.get("content-length") || 0)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("REQUEST_TOO_LARGE")
  }

  try {
    const raw = await req.text()
    if (new TextEncoder().encode(raw).length > maxBytes) {
      throw new Error("REQUEST_TOO_LARGE")
    }
    return JSON.parse(raw)
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_TOO_LARGE") throw error
    throw new Error("INVALID_JSON")
  }
}

export function requestBodyErrorResponse(error: unknown) {
  if (!(error instanceof Error)) return null
  if (error.message === "REQUEST_TOO_LARGE") return safeError("Request body is too large", 413)
  if (error.message === "INVALID_JSON") return safeError("Invalid JSON body")
  return null
}

export function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return ""
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}

export function isDateId(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

export function safeError(message = "Invalid request", status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function logSecurityEvent(event: string, details: Record<string, unknown> = {}) {
  console.warn(`[security] ${event}`, details)
}
