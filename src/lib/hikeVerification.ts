/**
 * Server-side anti-cheat analysis for hike routes.
 *
 * Strategy:
 *  1. Re-compute distance from GPS waypoints server-side (ignore client claim).
 *  2. Smooth per-segment speeds with a 3-point rolling average to absorb GPS jitter.
 *  3. Exclude segments where smoothed speed > MAX_HUMAN_KMH — those are vehicles.
 *  4. Exclude large positional jumps (pause → drive → resume exploit).
 *  5. rewardKm = only the walking/running distance, capped at client claim.
 *
 * Thresholds are intentionally generous to avoid false-positives against fast
 * trail runners or poor GPS signal in narrow valleys.
 */

import { haversineKm } from "./hikeUtils"

// ─── Thresholds ──────────────────────────────────────────────────────────────

/** km/h — smoothed speed above this is classified as vehicle / cycling. */
const MAX_HUMAN_KMH = 18

/**
 * km — maximum plausible jump between two consecutive GPS waypoints.
 * Covers the pause→drive→resume exploit: no matter how long the pause,
 * a hiker can't teleport more than this between two real steps.
 */
const MAX_JUMP_KM = 0.5

/** Minimum waypoints needed for meaningful speed analysis. */
const MIN_POINTS = 4

/** Cap on claimed distance when no GPS data is provided (sanity limit). */
const NO_GPS_KM_CAP = 12

/**
 * km — bounding-box diagonal below which all GPS points are considered to
 * be clustered around one location (i.e. the user never actually moved).
 * Defeats the patched-client variant of the shake-jitter exploit even when
 * the client uploads many points with valid timestamps.
 */
const CLUSTER_DIAMETER_KM = 0.05  // 50 meters

/**
 * km — only run the cluster check when claimed/server distance exceeds
 * this threshold. Short, legitimate strolls inside a small park or
 * around a viewpoint shouldn't trip the heuristic.
 */
const MIN_DISTANCE_FOR_CLUSTER_CHECK_KM = 0.3  // 300 meters

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidPoint { lat: number; lng: number; ts: number }

export interface HikeVerification {
  /** km that count toward token rewards (walking/running only, ≤ claimed km). */
  rewardKm:     number
  /** Total km server-calculated from GPS points. */
  serverKm:     number
  /** km excluded because speed exceeded MAX_HUMAN_KMH. */
  vehicleKm:    number
  /** km excluded because of suspiciously large positional jumps. */
  jumpKm:       number
  /** Fraction of distance (0–1) that was excluded as vehicle / jump / cluster. */
  excludedRatio: number
  /** Whether meaningful route data was present. */
  hasGpsData:   boolean
  /** True when all GPS points clustered within CLUSTER_DIAMETER_KM (jitter fraud). */
  clustered:    boolean
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function verifyHikeRoute(
  rawPoints: unknown,
  claimedKm: number,
): HikeVerification {
  const points = parsePoints(rawPoints)

  if (points.length < MIN_POINTS) {
    // No GPS data — apply a conservative cap and penalty multiplier so
    // manually entered / GPS-denied hikes earn less than tracked ones.
    const capped = Math.min(claimedKm, NO_GPS_KM_CAP)
    return {
      rewardKm:     parseFloat((capped * 0.7).toFixed(3)),
      serverKm:     claimedKm,
      vehicleKm:    0,
      jumpKm:       0,
      excludedRatio: 0,
      hasGpsData:   false,
      clustered:    false,
    }
  }

  // Sort ascending by timestamp (defensive; tracker should already deliver in order)
  points.sort((a, b) => a.ts - b.ts)

  // ── Build segment list ─────────────────────────────────────────────────────
  interface Seg { distKm: number; speedKmh: number; isJump: boolean }
  const segs: Seg[] = []
  let serverKm = 0

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1]
    const p2 = points[i]
    const distKm  = haversineKm(p1.lat, p1.lng, p2.lat, p2.lng)
    const timeSec = (p2.ts - p1.ts) / 1000

    if (distKm < 0 || timeSec <= 0) continue
    serverKm += distKm

    const speedKmh = (distKm / timeSec) * 3600
    const isJump   = distKm > MAX_JUMP_KM

    segs.push({ distKm, speedKmh, isJump })
  }

  // ── 3-point rolling average on speed (absorbs single GPS jitter spikes) ────
  let walkingKm = 0
  let vehicleKm = 0
  let jumpKm    = 0

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]

    // Positional jump always excluded regardless of apparent speed
    if (seg.isJump) {
      jumpKm += seg.distKm
      continue
    }

    const prev     = i > 0               ? segs[i - 1].speedKmh : seg.speedKmh
    const next     = i < segs.length - 1 ? segs[i + 1].speedKmh : seg.speedKmh
    const smoothed = (prev + seg.speedKmh + next) / 3

    if (smoothed > MAX_HUMAN_KMH) {
      vehicleKm += seg.distKm
    } else {
      walkingKm += seg.distKm
    }
  }

  // ── Cluster check — defeats stationary-jitter fraud ────────────────────────
  // If all waypoints fit inside a tiny bounding box but the cumulative segment
  // distance is non-trivial, the user never actually moved. Zero out the
  // walking distance entirely so no reward is paid.
  const boundingDiameterKm = maxBoundingDiameterKm(points)
  const clustered =
    serverKm > MIN_DISTANCE_FOR_CLUSTER_CHECK_KM &&
    boundingDiameterKm < CLUSTER_DIAMETER_KM

  if (clustered) {
    walkingKm = 0
  }

  const totalTracked = walkingKm + vehicleKm + jumpKm + (clustered ? serverKm : 0)
  const excludedRatio = totalTracked > 0
    ? (vehicleKm + jumpKm + (clustered ? serverKm : 0)) / totalTracked
    : 0

  // Reward only the walking portion; cap at what client claimed to prevent
  // GPS drift inflation (long hikes in open terrain can accumulate ghost km).
  const rewardKm = parseFloat(Math.min(walkingKm, claimedKm).toFixed(3))

  return {
    rewardKm,
    serverKm:     parseFloat(serverKm.toFixed(3)),
    vehicleKm:    parseFloat(vehicleKm.toFixed(3)),
    jumpKm:       parseFloat(jumpKm.toFixed(3)),
    excludedRatio: parseFloat(excludedRatio.toFixed(4)),
    hasGpsData:   true,
    clustered,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Diagonal of the lat/lng bounding box containing every point, in km.
 * Upper bound on how far the user ever got from any other waypoint —
 * if this is small, the user effectively never moved.
 */
function maxBoundingDiameterKm(points: ValidPoint[]): number {
  if (points.length < 2) return 0
  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return haversineKm(minLat, minLng, maxLat, maxLng)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePoints(raw: unknown): ValidPoint[] {
  if (!Array.isArray(raw)) return []
  const out: ValidPoint[] = []
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue
    const p   = item as Record<string, unknown>
    const lat = Number(p.lat)
    const lng = Number(p.lng)
    const ts  = Number(p.ts)
    if (!isFinite(lat) || !isFinite(lng) || !isFinite(ts)) continue
    if (lat < -90  || lat > 90)   continue
    if (lng < -180 || lng > 180)  continue
    if (ts < 1_000_000_000_000)   continue  // before year 2001 — invalid
    out.push({ lat, lng, ts })
  }
  return out
}
