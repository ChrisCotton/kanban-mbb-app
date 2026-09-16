export type GoalsProgressGoal = {
  id: string
  title: string
  status: 'active' | 'completed' | 'archived' | string
  target_date?: string | null
  completed_at?: string | null
}

export type GoalsProgressSummary = {
  completedThisWeek: number
  completedThisMonth: number
  onTimeCount: number
  lateCount: number
  /** onTime / (onTime + late); null when no completed goals with target_date */
  onTimeRate: number | null
  overdueActiveCount: number
  mostOverdue: GoalsProgressGoal[]
}

function startOfUtcWeek(d: Date): Date {
  // Monday-start week in UTC
  const day = d.getUTCDay() // 0 Sun .. 6 Sat
  const diff = day === 0 ? 6 : day - 1
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - diff)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

function dateOnlyUtc(isoOrDate: string): Date {
  // target_date is typically YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) {
    const [y, m, day] = isoOrDate.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, day))
  }
  const d = new Date(isoOrDate)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function todayUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export function computeGoalsProgressSummary(
  goals: GoalsProgressGoal[],
  now: Date = new Date()
): GoalsProgressSummary {
  const weekStart = startOfUtcWeek(now)
  const monthStart = startOfUtcMonth(now)
  const today = todayUtc(now)

  let completedThisWeek = 0
  let completedThisMonth = 0
  let onTimeCount = 0
  let lateCount = 0

  const overdueActive: GoalsProgressGoal[] = []

  for (const goal of goals) {
    if (goal.status === 'completed' && goal.completed_at) {
      const completedAt = new Date(goal.completed_at)
      if (!Number.isNaN(completedAt.getTime())) {
        if (completedAt >= weekStart) completedThisWeek += 1
        if (completedAt >= monthStart) completedThisMonth += 1

        if (goal.target_date) {
          const target = dateOnlyUtc(goal.target_date)
          const completedDay = dateOnlyUtc(goal.completed_at)
          if (completedDay.getTime() <= target.getTime()) onTimeCount += 1
          else lateCount += 1
        }
      }
    }

    if (goal.status === 'active' && goal.target_date) {
      const target = dateOnlyUtc(goal.target_date)
      if (target.getTime() < today.getTime()) {
        overdueActive.push(goal)
      }
    }
  }

  overdueActive.sort((a, b) => {
    const ta = dateOnlyUtc(a.target_date!).getTime()
    const tb = dateOnlyUtc(b.target_date!).getTime()
    return ta - tb // oldest due date first = most overdue
  })

  const withTarget = onTimeCount + lateCount

  return {
    completedThisWeek,
    completedThisMonth,
    onTimeCount,
    lateCount,
    onTimeRate: withTarget === 0 ? null : onTimeCount / withTarget,
    overdueActiveCount: overdueActive.length,
    mostOverdue: overdueActive.slice(0, 3),
  }
}
