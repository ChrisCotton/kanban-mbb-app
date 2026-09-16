import {
  GOAL_AUTO_ARCHIVE_OPTIONS,
  normalizeGoalAutoArchiveDays,
  isCompletedGoalDueForAutoArchive,
  selectGoalsDueForAutoArchive,
} from '../goal-auto-archive'

describe('goal-auto-archive helpers', () => {
  const now = new Date('2026-09-15T12:00:00.000Z')

  it('normalizes allowed values and Off', () => {
    expect(normalizeGoalAutoArchiveDays(30)).toBe(30)
    expect(normalizeGoalAutoArchiveDays(60)).toBe(60)
    expect(normalizeGoalAutoArchiveDays(90)).toBe(90)
    expect(normalizeGoalAutoArchiveDays(null)).toBe(null)
    expect(normalizeGoalAutoArchiveDays(undefined)).toBe(90) // default
    expect(normalizeGoalAutoArchiveDays(45 as any)).toBe(90)
    expect(GOAL_AUTO_ARCHIVE_OPTIONS).toEqual([null, 30, 60, 90])
  })

  it('returns false when auto-archive is Off', () => {
    expect(
      isCompletedGoalDueForAutoArchive(
        {
          status: 'completed',
          completed_at: '2026-01-01T00:00:00.000Z',
        },
        null,
        now
      )
    ).toBe(false)
  })

  it('archives completed goals older than threshold, not on boundary day', () => {
    const completedAt = '2026-08-16T12:00:00.000Z' // exactly 30 days before now
    expect(
      isCompletedGoalDueForAutoArchive(
        { status: 'completed', completed_at: completedAt },
        30,
        now
      )
    ).toBe(false)

    expect(
      isCompletedGoalDueForAutoArchive(
        { status: 'completed', completed_at: '2026-08-15T11:59:59.000Z' },
        30,
        now
      )
    ).toBe(true)
  })

  it('ignores non-completed and missing completed_at', () => {
    expect(
      isCompletedGoalDueForAutoArchive(
        { status: 'active', completed_at: '2020-01-01T00:00:00.000Z' },
        30,
        now
      )
    ).toBe(false)
    expect(
      isCompletedGoalDueForAutoArchive({ status: 'completed', completed_at: null }, 30, now)
    ).toBe(false)
    expect(
      isCompletedGoalDueForAutoArchive(
        { status: 'archived', completed_at: '2020-01-01T00:00:00.000Z' },
        30,
        now
      )
    ).toBe(false)
  })

  it('selects only due completed goals', () => {
    const goals = [
      { id: 'a', status: 'completed' as const, completed_at: '2026-01-01T00:00:00.000Z' },
      { id: 'b', status: 'completed' as const, completed_at: '2026-09-01T00:00:00.000Z' },
      { id: 'c', status: 'active' as const, completed_at: null },
    ]
    expect(selectGoalsDueForAutoArchive(goals, 30, now).map((g) => g.id)).toEqual(['a'])
  })
})
