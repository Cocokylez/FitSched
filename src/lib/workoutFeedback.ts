export type SessionFeedback = "too_easy" | "just_right" | "too_hard"

type WorkoutFeedbackEntry = {
  workoutLogId: string | null
  date: string
  workoutName: string
  feedback: SessionFeedback
  durationSeconds: number
  exerciseCount: number
  totalSets: number
  totalReps: number
  createdAt: string
}

const STORAGE_KEY = "fitsched-workout-feedback"
const EXPERIENCE_ORDER = ["beginner", "intermediate", "advanced"] as const

type ExperienceLevel = (typeof EXPERIENCE_ORDER)[number]

function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return typeof value === "string" && EXPERIENCE_ORDER.includes(value as ExperienceLevel)
}

export function saveWorkoutFeedback(entry: WorkoutFeedbackEntry) {
  if (typeof window === "undefined") return

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const existing = raw ? JSON.parse(raw) : []
    const entries = Array.isArray(existing) ? existing : []
    const deduped = entries.filter((item: Partial<WorkoutFeedbackEntry>) => {
      if (entry.workoutLogId && item.workoutLogId) return item.workoutLogId !== entry.workoutLogId
      return item.date !== entry.date || item.workoutName !== entry.workoutName
    })

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...deduped].slice(0, 30)))
  } catch {}
}

function getRecentWorkoutFeedback(limit = 5): WorkoutFeedbackEntry[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const entries = raw ? JSON.parse(raw) : []
    return Array.isArray(entries) ? entries.slice(0, limit) : []
  } catch {
    return []
  }
}

export function getFeedbackAdjustedExperienceLevel(value: unknown): ExperienceLevel {
  const base = isExperienceLevel(value) ? value : "intermediate"
  const recent = getRecentWorkoutFeedback()
  if (recent.length < 2) return base

  const score = recent.reduce((total, entry) => {
    if (entry.feedback === "too_easy") return total + 1
    if (entry.feedback === "too_hard") return total - 1
    return total
  }, 0)

  const currentIndex = EXPERIENCE_ORDER.indexOf(base)
  if (score >= 2) return EXPERIENCE_ORDER[Math.min(EXPERIENCE_ORDER.length - 1, currentIndex + 1)]
  if (score <= -2) return EXPERIENCE_ORDER[Math.max(0, currentIndex - 1)]
  return base
}
