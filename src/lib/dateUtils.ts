export function toDateId(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function getWeekId(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const monday = new Date(date.setDate(date.getDate() - day + (day === 0 ? -6 : 1)))
  monday.setHours(0, 0, 0, 0)
  return toDateId(monday)
}

export function formatLocalDate(date: Date): string {
  return date.toLocaleDateString("en-CA") // YYYY-MM-DD in local time
}

export function calculateLongestStreak(logs: Array<{ completedAt: string }>): number {
  const timestamps = Array.from(
    new Set(logs.map((log) => {
      const d = new Date(log.completedAt)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }))
  ).sort((a, b) => a - b)

  let best = 0, current = 0, previous: number | null = null
  const oneDay = 86_400_000
  for (const ts of timestamps) {
    current = previous !== null && ts - previous === oneDay ? current + 1 : 1
    if (current > best) best = current
    previous = ts
  }
  return best
}
