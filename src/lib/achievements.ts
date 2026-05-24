// ── Achievement definitions ────────────────────────────────────────────────────
//
// Each achievement has:
//   type        — unique string key stored in UserAchievement.type
//   name        — display name
//   description — one-line description
//   emoji       — badge icon
//   tier        — "bronze" | "silver" | "gold" | "platinum"

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum"

export interface AchievementDef {
  type: string
  name: string
  description: string
  emoji: string
  tier: AchievementTier
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── Workout milestones ──────────────────────────────────────────────────────
  {
    type: "first_workout",
    name: "First Rep",
    description: "Completed your very first workout",
    emoji: "🏋️",
    tier: "bronze",
  },
  {
    type: "workouts_5",
    name: "Getting Warmed Up",
    description: "Completed 5 workouts",
    emoji: "🔥",
    tier: "bronze",
  },
  {
    type: "workouts_10",
    name: "Double Digits",
    description: "Completed 10 workouts",
    emoji: "💪",
    tier: "silver",
  },
  {
    type: "workouts_25",
    name: "Quarter Century",
    description: "Completed 25 workouts",
    emoji: "⚡",
    tier: "silver",
  },
  {
    type: "workouts_50",
    name: "Halfway Hero",
    description: "Completed 50 workouts",
    emoji: "🥈",
    tier: "gold",
  },
  {
    type: "workouts_100",
    name: "Centurion",
    description: "Completed 100 workouts",
    emoji: "🏆",
    tier: "platinum",
  },

  // ── Streak milestones ───────────────────────────────────────────────────────
  {
    type: "streak_3",
    name: "Habit Forming",
    description: "Maintained a 3-day workout streak",
    emoji: "🔥",
    tier: "bronze",
  },
  {
    type: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day workout streak",
    emoji: "🌟",
    tier: "silver",
  },
  {
    type: "streak_14",
    name: "Two Week Terror",
    description: "Maintained a 14-day workout streak",
    emoji: "⭐",
    tier: "gold",
  },
  {
    type: "streak_30",
    name: "Iron Will",
    description: "Maintained a 30-day workout streak",
    emoji: "🥇",
    tier: "platinum",
  },

  // ── Hike milestones ─────────────────────────────────────────────────────────
  {
    type: "first_hike",
    name: "Trail Starter",
    description: "Logged your first hike",
    emoji: "🥾",
    tier: "bronze",
  },
  {
    type: "hike_km_10",
    name: "10K Hiker",
    description: "Hiked a cumulative 10 km",
    emoji: "🌄",
    tier: "bronze",
  },
  {
    type: "hike_km_50",
    name: "Half-Century Trekker",
    description: "Hiked a cumulative 50 km",
    emoji: "🏔️",
    tier: "silver",
  },
  {
    type: "hike_km_100",
    name: "Century Walker",
    description: "Hiked a cumulative 100 km",
    emoji: "🗺️",
    tier: "gold",
  },

  // ── Weight log ──────────────────────────────────────────────────────────────
  {
    type: "first_weight_log",
    name: "Measured Up",
    description: "Logged your body weight for the first time",
    emoji: "⚖️",
    tier: "bronze",
  },
  {
    type: "weight_log_7",
    name: "Consistent Tracker",
    description: "Logged your weight 7 times",
    emoji: "📊",
    tier: "silver",
  },

  // ── FitToken milestones ─────────────────────────────────────────────────────
  {
    type: "tokens_10",
    name: "Token Collector",
    description: "Earned 10 FitTokens in total",
    emoji: "🪙",
    tier: "bronze",
  },
  {
    type: "tokens_50",
    name: "FitToken Investor",
    description: "Earned 50 FitTokens in total",
    emoji: "💰",
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
