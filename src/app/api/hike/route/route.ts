import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Proxy for OSRM walking directions (router.project-osrm.org).
// Keeps the upstream URL server-side and adds auth + caching.
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const slat = searchParams.get("slat")
  const slng = searchParams.get("slng")
  const elat = searchParams.get("elat")
  const elng = searchParams.get("elng")

  if (!slat || !slng || !elat || !elng)
    return NextResponse.json({ error: "Missing params" }, { status: 400 })

  const url =
    `https://router.project-osrm.org/route/v1/foot/` +
    `${slng},${slat};${elng},${elat}?overview=full&geometries=geojson`

  const upstream = await fetch(url, {
    headers: { "User-Agent": "FitSched/1.0 (fitsched.vercel.app)" },
  })

  if (!upstream.ok)
    return NextResponse.json({ error: "Routing service unavailable" }, { status: 502 })

  const data = await upstream.json()
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  })
}
