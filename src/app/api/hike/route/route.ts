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

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── 3. Overpass trail trace ───────────────────────────────────────────────────
// When routing engines can't find a path (disconnected OSM trails), query
// Overpass for the actual OSM trail geometry in the area and trace it directly.
async function tryOverpassTrail(
  slat: number, slng: number,
  elat: number, elng: number
): Promise<object | null> {
  const pad  = 0.02  // ~2 km padding each side
  const bbox = [
    Math.min(slat, elat) - pad, Math.min(slng, elng) - pad,
    Math.max(slat, elat) + pad, Math.max(slng, elng) + pad,
  ].join(",")

  const query =
    `[out:json][timeout:10];` +
    `way[highway~"^(path|track|footway|steps)$"](${bbox});` +
    `out geom;`

  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!res.ok) return null

  const data = await res.json()
  if (!data.elements?.length) return null

  // Find the way whose nodes come closest to BOTH the start and end points
  let bestWay: any = null
  let bestScore = Infinity
  let bestStartIdx = 0
  let bestEndIdx   = 0
  const SNAP_LIMIT = 400  // metres — ignore ways more than 400m from either pin

  for (const way of data.elements) {
    const nodes: Array<{ lat: number; lon: number }> = way.geometry
    if (!nodes?.length) continue

    let minS = Infinity, sIdx = 0
    let minE = Infinity, eIdx = 0

    nodes.forEach((n, i) => {
      const dS = haversineM(slat, slng, n.lat, n.lon)
      const dE = haversineM(elat, elng, n.lat, n.lon)
      if (dS < minS) { minS = dS; sIdx = i }
      if (dE < minE) { minE = dE; eIdx = i }
    })

    if (minS > SNAP_LIMIT || minE > SNAP_LIMIT) continue
    const score = minS + minE
    if (score < bestScore) {
      bestScore = score; bestWay = way
      bestStartIdx = sIdx; bestEndIdx = eIdx
    }
  }

  if (!bestWay) return null

  // Slice the way geometry between the two closest nodes
  const nodes: Array<{ lat: number; lon: number }> = bestWay.geometry
  const from = Math.min(bestStartIdx, bestEndIdx)
  const to   = Math.max(bestStartIdx, bestEndIdx)
  const seg  = nodes.slice(from, to + 1)
  if (seg.length < 2) return null

  // Preserve direction: if end is before start on the way, reverse
  const coords = bestStartIdx <= bestEndIdx
    ? seg.map(n => [n.lon, n.lat] as [number, number])
    : seg.map(n => [n.lon, n.lat] as [number, number]).reverse()

  // Measure trail distance
  let distM = 0
  for (let i = 1; i < seg.length; i++) {
    distM += haversineM(seg[i - 1].lat, seg[i - 1].lon, seg[i].lat, seg[i].lon)
  }

  const durSec = (distM / 1000 / 3) * 3600  // 3 km/h for mountain hiking

  return {
    code: "Ok",
    source: "osm_trace",
    routes: [{
      distance: distM,
      duration: durSec,
      geometry: { type: "LineString", coordinates: coords },
    }],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy for hike route planning.
// Waterfall: OSRM → Valhalla (trail-aware) → Overpass trail trace → 404
// ─────────────────────────────────────────────────────────────────────────────
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

  const slatN = parseFloat(slat), slngN = parseFloat(slng)
  const elatN = parseFloat(elat), elngN = parseFloat(elng)

  // ── 1. OSRM ────────────────────────────────────────────────────────────────
  try {
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${slng},${slat};${elng},${elat}` +
      `?overview=full&geometries=geojson&radiuses=500;500`

    const osrmRes = await fetch(osrmUrl, {
      headers: { "User-Agent": "FitSched/1.0 (fitsched.vercel.app)" },
      signal: AbortSignal.timeout(8_000),
    })

    if (osrmRes.ok) {
      const data = await osrmRes.json()
      if (data.code === "Ok" && data.routes?.[0]) {
        return NextResponse.json(data, {
          headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
        })
      }
    }
  } catch { /* fall through */ }

  // ── 2. Valhalla — prefers trails over roads ────────────────────────────────
  try {
    const valhallaRes = await fetch("https://valhalla.openstreetmap.de/route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FitSched/1.0 (fitsched.vercel.app)",
      },
      body: JSON.stringify({
        locations: [
          { lon: slngN, lat: slatN, radius: 500 },
          { lon: elngN, lat: elatN, radius: 500 },
        ],
        costing: "pedestrian",
        costing_options: {
          pedestrian: {
            use_tracks: 1.0,
            use_roads:  0.0,   // strongly avoid roads — take trails
            use_hills:  0.8,
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (valhallaRes.ok) {
      const data = await valhallaRes.json()
      const leg = data.trip?.legs?.[0]
      if (leg?.shape) {
        const latlngs = decodePolyline6(leg.shape)
        return NextResponse.json({
          code: "Ok",
          routes: [{
            distance: data.trip.summary.length * 1000,
            duration: data.trip.summary.time,
            geometry: {
              type: "LineString",
              coordinates: latlngs.map(([lat, lng]) => [lng, lat]),
            },
          }],
        }, {
          headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
        })
      }
    }
  } catch { /* fall through */ }

  // ── 3. Overpass trail trace — works on disconnected mountain paths ──────────
  try {
    const osmRoute = await tryOverpassTrail(slatN, slngN, elatN, elngN)
    if (osmRoute) {
      return NextResponse.json(osmRoute, {
        headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
      })
    }
  } catch { /* fall through */ }

  // ── 4. All failed — client will draw straight line ─────────────────────────
  return NextResponse.json({ code: "NoRoute" }, { status: 404 })
}
