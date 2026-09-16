export const GOAL_AUTO_ARCHIVE_OPTIONS = [null, 30, 60, 90] as const

export type GoalAutoArchiveDays = (typeof GOAL_AUTO_ARCHIVE_OPTIONS)[number]

export function normalizeGoalAutoArchiveDays(value: unknown): GoalAutoArchiveDays {
  if (value === null) return null
  if (value === 30 || value === 60 || value === 90) return value
  if (value === '30' || value === '60' || value === '90') {
    return Number(value) as 30 | 60 | 90
  }
  if (value === 'off' || value === '') return null
  // Default when missing / invalid
  return 90
}

type GoalLike = {
  status: string
  completed_at?: string | null
}

export function isCompletedGoalDueForAutoArchive(
  goal: GoalLike,
  days: GoalAutoArchiveDays,
  now: Date = new Date()
): boolean {
  if (days === null) return false
  if (goal.status !== 'completed') return false
  if (!goal.completed_at) return false

  const completedAt = new Date(goal.completed_at)
  if (Number.isNaN(completedAt.getTime())) return false

  const thresholdMs = days * 24 * 60 * 60 * 1000
  return now.getTime() - completedAt.getTime() > thresholdMs
}

export function selectGoalsDueForAutoArchive<T extends GoalLike & { id: string }>(
  goals: T[],
  days: GoalAutoArchiveDays,
  now: Date = new Date()
): T[] {
  return goals.filter((g) => isCompletedGoalDueForAutoArchive(g, days, now))
}
