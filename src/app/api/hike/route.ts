import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const logs = await db.hikeLog.findMany({
    where: { userId: session.user.id },
    orderBy: { loggedAt: "desc" },
    take: 100,
  })

  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, distanceKm, durationMin, elevationM, notes, loggedAt } = body

  if (!distanceKm || Number(distanceKm) <= 0)
    return NextResponse.json({ error: "Distance is required" }, { status: 400 })
  if (!durationMin || Number(durationMin) <= 0)
    return NextResponse.json({ error: "Duration is required" }, { status: 400 })

  const log = await db.hikeLog.create({
    data: {
      userId: session.user.id,
      name: typeof name === "string" && name.trim() ? name.trim() : "Hike",
      distanceKm: Number(distanceKm),
      durationMin: Number(durationMin),
      elevationM: elevationM ? Number(elevationM) : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
    },
  })

  return NextResponse.json(log, { status: 201 })
}
