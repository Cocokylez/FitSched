/**
 * Single source of truth for streak flame tiers.
 *
 * Before this module the tier ladder and its palettes were duplicated between
 * `getFlameColors()` (FlameIcon) and `getFirePalette()` (StreakWelcomeCard) — same
 * thresholds, subtly different colors, and only one of them knew about the broken
 * state. Every flame surface now imports from here, so a tier change is one edit.
 *
 * Ladder and palettes come from the "Animated streak fire" design
 * (claude.ai/design → Streak Fire.dc.html). Note this REPLACED the old 0/10/20/50
 * ladder with 0/10/25/50 and renamed the tiers.
 *
 * Deliberately independent of two other ladders that tell the user different stories:
 *   - `[3, 7, 14, 30]`  milestones      → api/streak/route.ts + lib/achievements.ts
 *   - `1/7/14/30`       token bonus     → lib/fitTokens.ts
 * Don't merge them without deciding what each one means to the user.
 */

export type StreakTierId = "broken" | "kindling" | "ablaze" | "inferno" | "radiant"

export type StreakTier = {
  id: StreakTierId
  /** Display name, e.g. "Ablaze". */
  name: string
  /** Short supporting line under the tier name. */
  sub: string
  /** Flame gradient, top → bottom. c1 is the hottest tip, c3 the deep base. */
  c1: string
  c2: string
  c3: string
  /** Ambient radial glow behind the flame. */
  glow: string
  /** Accent for tier labels, progress fill, and day-strip marks. */
  acc: string
  /** Lowest streak value in this tier. */
  floor: number
  /** Streak value that promotes to the next tier, or null at the top. */
  next: number | null
}

/** Ordered high → low so `getStreakTier` can return the first match. */
export const STREAK_TIERS: readonly StreakTier[] = [
  {
    id: "radiant",
    name: "Radiant",
    sub: "50+ day plasma flame",
    c1: "#ffffff", c2: "#b78bff", c3: "#6d3cff",
    glow: "#8a5cff", acc: "#c9a8ff",
    floor: 50, next: null,
  },
  {
    id: "inferno",
    name: "Inferno",
    sub: "You are on fire",
    c1: "#ffe0ec", c2: "#ff3d8b", c3: "#c0143f",
    glow: "#ff2f6e", acc: "#ff77ad",
    floor: 25, next: 50,
  },
  {
    id: "ablaze",
    name: "Ablaze",
    sub: "Burning bright",
    c1: "#d6f2ff", c2: "#38bdf8", c3: "#1257e6",
    glow: "#1c86ff", acc: "#5cc8ff",
    floor: 10, next: 25,
  },
  {
    id: "kindling",
    name: "Kindling",
    sub: "Keep it lit",
    c1: "#ffe6a3", c2: "#ff8a1e", c3: "#d63808",
    glow: "#ff6a12", acc: "#ffb84d",
    floor: 0, next: 10,
  },
] as const

/**
 * The "your streak just broke" state — a cold, burnt-out flame.
 *
 * TODO(human): pick the palette for this state.
 *
 * The values below are the old ash greys ported straight over from
 * `getFirePalette`'s broken branch, so everything compiles and renders today.
 * But they were designed against the OLD tier palettes, which were muted and
 * desaturated. The new tiers are vivid (#ff8a1e, #38bdf8, #ff3d8b, #6d3cff) —
 * against those, flat grey risks reading as "the image failed to load" rather
 * than "you lost something you had."
 *
 * Fill in c1 / c2 / c3 / glow / acc below. Keep the same field meanings as the
 * tiers above (c1 = hottest tip → c3 = deep base; glow = ambient halo; acc =
 * label + progress color). `name` and `sub` are yours to reword too.
 */
export const BROKEN_TIER: StreakTier = {
  id: "broken",
  name: "Burnt out",
  sub: "Your streak went cold",
  c1: "#c5cdd0", c2: "#8a9498", c3: "#3c4548",
  glow: "#6c7880", acc: "#aebcc0",
  floor: 0, next: null,
}

/** Resolve the tier for a streak value. `broken` always wins. */
export function getStreakTier(streak: number, broken = false): StreakTier {
  if (broken) return BROKEN_TIER
  return STREAK_TIERS.find((tier) => streak >= tier.floor) ?? STREAK_TIERS[STREAK_TIERS.length - 1]
}

/**
 * Progress toward the next tier, for the bar + "N days to Inferno" caption.
 * Returns `pct: 100` and a max-tier label once there's nothing left to climb.
 */
export function getTierProgress(streak: number, broken = false): { pct: number; label: string } {
  const tier = getStreakTier(streak, broken)

  if (broken) return { pct: 0, label: "Train today to relight it" }
  if (tier.next === null) return { pct: 100, label: "Max tier reached — keep it going" }

  const span = tier.next - tier.floor
  // Floor at 4% so a freshly-promoted tier still shows a sliver of fill.
  const pct = Math.max(4, Math.min(100, Math.round(((streak - tier.floor) / span) * 100)))
  const remaining = tier.next - streak
  const nextName = getStreakTier(tier.next).name

  return { pct, label: `${remaining} ${remaining === 1 ? "day" : "days"} to ${nextName}` }
}
