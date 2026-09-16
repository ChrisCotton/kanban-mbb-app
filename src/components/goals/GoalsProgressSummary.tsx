import React from 'react'
import type { GoalsProgressSummary as Summary } from '../../lib/goals-progress-summary'

interface GoalsProgressSummaryProps {
  summary: Summary
  onOverdueClick?: (goalId: string) => void
  className?: string
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}

const GoalsProgressSummary: React.FC<GoalsProgressSummaryProps> = ({
  summary,
  onOverdueClick,
  className = '',
}) => {
  const noActivePressure =
    summary.overdueActiveCount === 0 && summary.mostOverdue.length === 0

  return (
    <div
      className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 md:p-5 mb-6 ${className}`}
      data-testid="goals-progress-summary"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60 mb-3">
            Wins
          </h2>
          <div className="flex flex-wrap gap-4 text-white">
            <div>
              <div className="text-2xl font-bold">{summary.completedThisWeek}</div>
              <div className="text-xs text-white/60">Completed this week</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.completedThisMonth}</div>
              <div className="text-xs text-white/60">Completed this month</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatRate(summary.onTimeRate)}</div>
              <div className="text-xs text-white/60">
                On-time rate
                {summary.onTimeCount + summary.lateCount > 0 && (
                  <span className="text-white/40">
                    {' '}
                    ({summary.onTimeCount} on time / {summary.lateCount} late)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60 mb-3">
            Pace
          </h2>
          {summary.overdueActiveCount > 0 ? (
            <>
              <p className="text-white mb-2">
                <span className="text-2xl font-bold text-red-300">
                  {summary.overdueActiveCount}
                </span>{' '}
                <span className="text-white/70">overdue active goal
                  {summary.overdueActiveCount === 1 ? '' : 's'}
                </span>
              </p>
              <ul className="space-y-1">
                {summary.mostOverdue.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => onOverdueClick?.(g.id)}
                      className="text-left text-sm text-red-200 hover:text-white underline-offset-2 hover:underline"
                    >
                      {g.title}
                      {g.target_date ? ` · due ${g.target_date}` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-white/70 text-sm">
              {noActivePressure
                ? 'No overdue goals — ready for the next one when you are.'
                : 'All active goals are on track.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default GoalsProgressSummary
