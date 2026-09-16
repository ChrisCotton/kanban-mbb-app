import { computeGoalsProgressSummary } from '../goals-progress-summary'

describe('computeGoalsProgressSummary', () => {
  const now = new Date('2026-09-15T15:00:00.000Z') // Tuesday

  const goals = [
    {
      id: 'overdue-1',
      title: 'Old goal',
      status: 'active' as const,
      target_date: '2026-06-01',
      completed_at: null,
    },
    {
      id: 'overdue-2',
      title: 'Older goal',
      status: 'active' as const,
      target_date: '2026-01-01',
      completed_at: null,
    },
    {
      id: 'active-ok',
      title: 'Future',
      status: 'active' as const,
      target_date: '2026-12-01',
      completed_at: null,
    },
    {
      id: 'done-week-ontime',
      title: 'Week win',
      status: 'completed' as const,
      target_date: '2026-09-20',
      completed_at: '2026-09-14T10:00:00.000Z',
    },
    {
      id: 'done-month-late',
      title: 'Late win',
      status: 'completed' as const,
      target_date: '2026-09-01',
      completed_at: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'done-old',
      title: 'Ancient',
      status: 'completed' as const,
      target_date: '2026-01-15',
      completed_at: '2026-01-10T10:00:00.000Z',
    },
    {
      id: 'archived',
      title: 'Hidden',
      status: 'archived' as const,
      target_date: '2026-01-01',
      completed_at: '2025-12-01T00:00:00.000Z',
    },
  ]

  it('computes wins and overdue pace', () => {
    const summary = computeGoalsProgressSummary(goals, now)

    expect(summary.completedThisWeek).toBe(1)
    expect(summary.completedThisMonth).toBe(2)
    expect(summary.onTimeCount).toBe(2) // week win + ancient (Jan 10 <= Jan 15)
    expect(summary.lateCount).toBe(1)
    expect(summary.onTimeRate).toBeCloseTo(2 / 3)
    expect(summary.overdueActiveCount).toBe(2)
    expect(summary.mostOverdue.map((g) => g.id)).toEqual(['overdue-2', 'overdue-1'])
  })

  it('handles empty goals', () => {
    const summary = computeGoalsProgressSummary([], now)
    expect(summary.completedThisWeek).toBe(0)
    expect(summary.overdueActiveCount).toBe(0)
    expect(summary.onTimeRate).toBeNull()
    expect(summary.mostOverdue).toEqual([])
  })
})
