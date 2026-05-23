import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Valhalla returns encoded polyline6 — decode to [lat, lng] pairs
function decodePolyline6(encoded: string): [number, number][] {
  const result: [number, number][] = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, val = 0
    do { b = encoded.charCodeAt(index++) - 63; val |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (val & 1) ? ~(val >> 1) : (val >> 1); shift = 0; val = 0
    do { b = encoded.charCodeAt(index++) - 63; val |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (val & 1) ? ~(val >> 1) : (val >> 1)
    result.push([lat / 1e6, lng / 1e6])
  }
  return result
}

// Proxy for OSRM walking directions (router.project-osrm.org).
// Falls back to Valhalla (valhalla.openstreetmap.de) if OSRM finds no route —
// Valhalla's pedestrian profile routes on tracks/paths OSRM ignores.
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

  // ── 1. Try OSRM ───────────────────────────────────────────────────────────
  try {
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${slng},${slat};${elng},${elat}?overview=full&geometries=geojson`

    const osrmRes = await fetch(osrmUrl, {
      headers: { "User-Agent": "FitSched/1.0 (fitsched.vercel.app)" },
      signal: AbortSignal.timeout(8000),
    })

    if (osrmRes.ok) {
      const data = await osrmRes.json()
      if (data.code === "Ok" && data.routes?.[0]) {
        return NextResponse.json(data, {
          headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
        })
      }
    }
  } catch {
    // OSRM timed out or failed — try Valhalla below
  }

  // ── 2. Fall back to Valhalla (routes on tracks/paths OSRM skips) ──────────
  try {
    const valhallaRes = await fetch("https://valhalla.openstreetmap.de/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FitSched/1.0 (fitsched.vercel.app)",
      },
      body: JSON.stringify({
        locations: [
          { lon: parseFloat(slng), lat: parseFloat(slat) },
          { lon: parseFloat(elng), lat: parseFloat(elat) },
        ],
        costing: "pedestrian",
        costing_options: {
          pedestrian: { use_tracks: 1.0, use_roads: 0.5 },
        },
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (valhallaRes.ok) {
      const data = await valhallaRes.json()
      const leg = data.trip?.legs?.[0]
      if (leg?.shape) {
        const latlngs = decodePolyline6(leg.shape)
        // Return OSRM-compatible shape so the client needs no changes
        return NextResponse.json({
          code: "Ok",
          routes: [{
            distance: data.trip.summary.length * 1000,  // km → m
            duration: data.trip.summary.time,
            geometry: {
              type: "LineString",
              coordinates: latlngs.map(([lat, lng]) => [lng, lat]),  // GeoJSON = [lng, lat]
            },
          }],
        }, {
          headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
        })
      }
    }
  } catch {
    // Valhalla also failed — client will fall back to straight line
  }

  return NextResponse.json({ code: "NoRoute" }, { status: 404 })
}
