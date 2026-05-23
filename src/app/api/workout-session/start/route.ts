import { auth } from "@/lib/auth"
import { signSessionToken } from "@/lib/sessionToken"
import {
  isDateId,
  rateLimitByUser,
  rateLimitPresets,
  readJsonBody,
  requestBodyErrorResponse,
  validateSameOrigin,
} from "@/lib/security"
import { NextResponse } from "next/server"

function getTodayDateId() {
  const tz = process.env.FITSCHED_TIME_ZONE || "Asia/Singapore"
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value
  return `${y}-${m}-${d}`
}

export async function POST(req: Request) {
  try {
    const originError = validateSameOrigin(req)
    if (originError) return originError

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const limited = await rateLimitByUser(req, session.user.id, rateLimitPresets.read, "workout-session:start")
    if (limited) return limited

    const body = await readJsonBody(req)
    const date = body.date

    if (!isDateId(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 })
    if (date !== getTodayDateId()) return NextResponse.json({ error: "Session must be for today" }, { status: 403 })

    const sessionToken = signSessionToken({
      userId: session.user.id,
      date,
      startedAt: Date.now(),
    })

    return NextResponse.json({ sessionToken })
  } catch (error) {
    const bodyError = requestBodyErrorResponse(error)
    if (bodyError) return bodyError
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
