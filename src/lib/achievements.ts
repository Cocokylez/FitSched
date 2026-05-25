// ── Achievement definitions ────────────────────────────────────────────────────
//
// Each achievement has:
//   type        — unique string key stored in UserAchievement.type
//   name        — display name
//   description — one-line description
//   svg         — inline SVG HTML string used as the badge icon
//   tier        — "bronze" | "silver" | "gold" | "platinum"

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum"

export interface AchievementDef {
  type: string
  name: string
  description: string
  svg: string
  tier: AchievementTier
}

// Helper — wraps inner SVG paths in a consistent outer <svg> tag
const icon = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block">${paths}</svg>`

// Named SVG icon strings
const ICONS = {
  dumbbell:   icon(`<circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><line x1="8" y1="12" x2="16" y2="12" stroke-width="2.5"/>`),
  flame:      icon(`<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`),
  activity:   icon(`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`),
  zap:        icon(`<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`),
  award:      icon(`<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>`),
  trophy:     icon(`<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>`),
  star:       icon(`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`),
  sun:        icon(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`),
  mapPin:     icon(`<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`),
  map:        icon(`<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>`),
  mountain:   icon(`<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>`),
  navigation: icon(`<polygon points="3 11 22 2 13 21 11 13 3 11"/>`),
  scale:      icon(`<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 21V7"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>`),
  barChart:   icon(`<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>`),
  coin:       icon(`<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>`),
  dollar:     icon(`<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`),
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Workout milestones ──────────────────────────────────────────────────────
  {
    type: "first_workout",
    name: "First Rep",
    description: "Completed your very first workout",
    svg: ICONS.dumbbell,
    tier: "bronze",
  },
  {
    type: "workouts_5",
    name: "Getting Warmed Up",
    description: "Completed 5 workouts",
    svg: ICONS.flame,
    tier: "bronze",
  },
  {
    type: "workouts_10",
    name: "Double Digits",
    description: "Completed 10 workouts",
    svg: ICONS.activity,
    tier: "silver",
  },
  {
    type: "workouts_25",
    name: "Quarter Century",
    description: "Completed 25 workouts",
    svg: ICONS.zap,
    tier: "silver",
  },
  {
    type: "workouts_50",
    name: "Halfway Hero",
    description: "Completed 50 workouts",
    svg: ICONS.award,
    tier: "gold",
  },
  {
    type: "workouts_100",
    name: "Centurion",
    description: "Completed 100 workouts",
    svg: ICONS.trophy,
    tier: "platinum",
  },

  // ── Streak milestones ───────────────────────────────────────────────────────
  {
    type: "streak_3",
    name: "Habit Forming",
    description: "Maintained a 3-day workout streak",
    svg: ICONS.flame,
    tier: "bronze",
  },
  {
    type: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day workout streak",
    svg: ICONS.star,
    tier: "silver",
  },
  {
    type: "streak_14",
    name: "Two Week Terror",
    description: "Maintained a 14-day workout streak",
    svg: ICONS.sun,
    tier: "gold",
  },
  {
    type: "streak_30",
    name: "Iron Will",
    description: "Maintained a 30-day workout streak",
    svg: ICONS.trophy,
    tier: "platinum",
  },

  // ── Hike milestones ─────────────────────────────────────────────────────────
  {
    type: "first_hike",
    name: "Trail Starter",
    description: "Logged your first hike",
    svg: ICONS.mapPin,
    tier: "bronze",
  },
  {
    type: "hike_km_10",
    name: "10K Hiker",
    description: "Hiked a cumulative 10 km",
    svg: ICONS.map,
    tier: "bronze",
  },
  {
    type: "hike_km_50",
    name: "Half-Century Trekker",
    description: "Hiked a cumulative 50 km",
    svg: ICONS.mountain,
    tier: "silver",
  },
  {
    type: "hike_km_100",
    name: "Century Walker",
    description: "Hiked a cumulative 100 km",
    svg: ICONS.navigation,
    tier: "gold",
  },

  // ── Weight log ──────────────────────────────────────────────────────────────
  {
    type: "first_weight_log",
    name: "Measured Up",
    description: "Logged your body weight for the first time",
    svg: ICONS.scale,
    tier: "bronze",
  },
  {
    type: "weight_log_7",
    name: "Consistent Tracker",
    description: "Logged your weight 7 times",
    svg: ICONS.barChart,
    tier: "silver",
  },

  // ── FitToken milestones ─────────────────────────────────────────────────────
  {
    type: "tokens_10",
    name: "Token Collector",
    description: "Earned 10 FitTokens in total",
    svg: ICONS.coin,
    tier: "bronze",
  },
  {
    type: "tokens_50",
    name: "FitToken Investor",
    description: "Earned 50 FitTokens in total",
    svg: ICONS.dollar,
    tier: "silver",
  },
]

// Lookup map for quick access
export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((d) => [d.type, d])
)

export const TIER_COLORS: Record<AchievementTier, { bg: string; border: string; color: string }> = {
  bronze:   { bg: "rgba(180,112,60,0.14)",  border: "rgba(180,112,60,0.35)",  color: "#b4703c" },
  silver:   { bg: "rgba(148,158,170,0.14)", border: "rgba(148,158,170,0.35)", color: "#8a9aa8" },
  gold:     { bg: "rgba(212,180,80,0.14)",  border: "rgba(212,180,80,0.35)",  color: "#c8a832" },
  platinum: { bg: "rgba(107,191,184,0.14)", border: "rgba(107,191,184,0.35)", color: "#6bbfb8" },
}
