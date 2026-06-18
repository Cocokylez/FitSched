/**
 * Shared utilities for hike tracking and display.
 * Used by HikeTracker, HikeRouteDetail, and the hike log page.
 */

/**
 * Minimum distance (km) a hike must cover to be saveable. Below this it's
 * indistinguishable from GPS jitter while standing still, so we reject it on
 * both the client (friendly message) and the server (authoritative guard) —
 * this is what stops "finish without moving" from saving an empty log.
 */
export const MIN_HIKE_KM = 0.1

/** Great-circle distance in kilometres between two coordinates (Haversine). */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Format a minute count as "45m", "1h", or "1h 20m". */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Walking pace as "M:SS" per km — e.g. 5.5 min/km → "5:30".
 *
 * Single source of truth for both the live tracker pill and the saved-hike
 * detail view (which previously each had their own copy with mismatched
 * signatures). Pass `km` covered and `minutes` of moving time.
 *
 * Returns "--:--" under 10 m, where pace is numerically meaningless.
 */
export function formatPace(km: number, minutes: number): string {
  if (km < 0.01 || minutes <= 0) return "--:--"
  const minPerKm = minutes / km
  // Round to whole seconds first, then split — so a seconds value that rounds
  // up to 60 carries into the minute automatically (12.999 → "13:00").
  const totalSec = Math.round(minPerKm * 60)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}
