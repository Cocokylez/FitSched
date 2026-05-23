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
// Queries OSM for trail ways, builds a mini routing graph, and BFS-finds
// a path through connected way segments — handles disconnected mountain trails
// that span multiple OSM ways.
async function tryOverpassTrail(
  slat: number, slng: number,
  elat: number, elng: number
): Promise<object | null> {
  const pad  = 0.05  // ~5 km padding each side
  const bbox = [
    Math.min(slat, elat) - pad, Math.min(slng, elng) - pad,
    Math.max(slat, elat) + pad, Math.max(slng, elng) + pad,
  ].join(",")

  // Broad tag coverage: named path types + sac_scale + trail_visibility tagged ways
  const query =
    `[out:json][timeout:25];` +
    `(` +
    `way[highway~"^(path|track|footway|steps|bridleway)$"](${bbox});` +
    `way[sac_scale](${bbox});` +
    `way[trail_visibility](${bbox});` +
    `);` +
    `out geom;`

  const res = await fetch(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(25_000) }
  )
  if (!res.ok) return null

  const data = await res.json()
  const ways: Array<{ geometry: Array<{ lat: number; lon: number }> }> =
    (data.elements ?? []).filter((e: any) => e.geometry?.length >= 2)
  if (!ways.length) return null

  // Build a mini routing graph from all trail way nodes.
  // Node key = "lat5dp,lon5dp" — 5 decimal places ≈ 1 m resolution, so shared
  // endpoints of adjacent OSM ways collapse to the same key automatically.
  type GNode = { lat: number; lon: number; neighbors: Set<string> }
  const graph = new Map<string, GNode>()

  const getOrAdd = (lat: number, lon: number): string => {
    const k = `${lat.toFixed(5)},${lon.toFixed(5)}`
    if (!graph.has(k)) graph.set(k, { lat, lon, neighbors: new Set() })
    return k
  }

  for (const way of ways) {
    const keys = way.geometry.map(n => getOrAdd(n.lat, n.lon))
    for (let i = 0; i < keys.length - 1; i++) {
      graph.get(keys[i])!.neighbors.add(keys[i + 1])
      graph.get(keys[i + 1])!.neighbors.add(keys[i])
    }
  }

  // Snap start and end pins to the closest graph node (within SNAP_LIMIT)
  const SNAP_LIMIT = 1500  // metres — generous for mountain trails

  let startKey = "", startDist = Infinity
  let endKey   = "", endDist   = Infinity

  for (const [k, node] of graph) {
    const dS = haversineM(slat, slng, node.lat, node.lon)
    const dE = haversineM(elat, elng, node.lat, node.lon)
    if (dS < startDist) { startDist = dS; startKey = k }
    if (dE < endDist)   { endDist   = dE; endKey   = k }
  }

  if (startDist > SNAP_LIMIT || endDist > SNAP_LIMIT) return null
  if (startKey === endKey) return null

  // BFS through the graph to find a path from start pin to end pin
  const parent = new Map<string, string>()
  const queue: string[] = [startKey]
  const visited = new Set<string>([startKey])

  bfs: while (queue.length) {
    const cur = queue.shift()!
    for (const nb of graph.get(cur)!.neighbors) {
      if (!visited.has(nb)) {
        visited.add(nb)
        parent.set(nb, cur)
        if (nb === endKey) break bfs
        queue.push(nb)
      }
    }
  }

  if (!visited.has(endKey)) return null  // no connected path

  // Reconstruct path from parent map
  const path: string[] = []
  for (let cur = endKey; cur; cur = parent.get(cur) ?? "") path.unshift(cur)

  const coords = path.map(k => {
    const n = graph.get(k)!
    return [n.lon, n.lat] as [number, number]
  })

  let distM = 0
  for (let i = 1; i < path.length; i++) {
    const a = graph.get(path[i - 1])!
    const b = graph.get(path[i])!
    distM += haversineM(a.lat, a.lon, b.lat, b.lon)
  }

  const durSec = (distM / 1000 / 3) * 3600  // 3 km/h hiking pace

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
// Waterfall: OSRM → Valhalla (trail-aware) → Overpass graph trace → 404
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

  // Straight-line distance between the two pins — used to detect bad OSRM snaps
  const straightM = haversineM(slatN, slngN, elatN, elngN)

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
        const wp = data.waypoints as Array<{ distance: number }> | undefined
        // Reject if either pin was snapped >150 m from its placed position,
        // or if the route is implausibly shorter than the straight-line distance
        // (both indicate OSRM pulled pins onto a nearby road).
        const badSnap   = wp && (wp[0]?.distance > 150 || wp[1]?.distance > 150)
        const tooShort  = data.routes[0].distance < straightM * 0.6
        if (!badSnap && !tooShort) {
          return NextResponse.json(data, {
            headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
          })
        }
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
            use_roads:  0.0,
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
        const routeDistM = (data.trip.summary.length ?? 0) * 1000
        // Same sanity check: reject if Valhalla also snapped to a road shortcut
        if (routeDistM >= straightM * 0.6) {
          const latlngs = decodePolyline6(leg.shape)
          return NextResponse.json({
            code: "Ok",
            routes: [{
              distance: routeDistM,
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
    }
  } catch { /* fall through */ }

  // ── 3. Overpass graph trace — works on disconnected mountain paths ──────────
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
