import React, { useCallback, useEffect } from 'react'
import { useTimerContext } from '../../contexts/TimerContext'
import TimerControls from './TimerControls'
import { useCategories } from '../../hooks/useCategories'

interface ActiveTask {
  id: string
  title: string
  category_id?: string | null
  category?: {
    id: string
    name: string
    hourly_rate_usd: number
    hourly_rate?: number  // Legacy fallback
    color?: string
  }
}

interface MBBTimerSectionProps {
  activeTask?: ActiveTask | null
  onTaskSelect?: () => void
  className?: string
  userId?: string // Add userId prop for database operations
}

export const MBBTimerSection: React.FC<MBBTimerSectionProps> = ({
  activeTask,
  onTaskSelect,
  className = '',
  userId
}) => {
  const lastAutoStartTaskIdRef = React.useRef<string | null>(null)
  const { getCategoryById } = useCategories()
  
  // Use global timer context for persistent timers across pages
  const {
    timers,
    totalEarnings,
    totalActiveTimers,
    startTimer,
    pauseTimer,
    pauseAllTimers,
    resumeTimer,
    stopTimer,
    stopAllTimers,
    resetTimer,
    resetAllTimers,
    deleteTimer,
    deleteAllTimers,
    setUserId,
  } = useTimerContext()

  // Resolve category from ID
  const resolveCategoryById = useCallback((categoryId: string) => {
    if (!getCategoryById) return undefined
    const category = getCategoryById(categoryId)
    if (!category) return undefined

    return {
      id: category.id,
      name: category.name,
      hourly_rate_usd: (category as any).hourly_rate_usd ?? category.hourly_rate ?? 0,
      hourly_rate: category.hourly_rate,
      color: category.color,
    }
  }, [getCategoryById])

  // Set userId in context when it changes
  useEffect(() => {
    setUserId(userId)
  }, [userId, setUserId])

  // Auto-start timer when activeTask changes (multi-timer behavior)
  useEffect(() => {
    if (!activeTask) return

    if (lastAutoStartTaskIdRef.current === activeTask.id) {
      return
    }

    const existingTimer = timers.find(timer => timer.taskId === activeTask.id)
    if (existingTimer) return

    const resolvedCategory = activeTask.category || (activeTask.category_id ? resolveCategoryById(activeTask.category_id) : undefined)
    startTimer({
      ...activeTask,
      category: resolvedCategory || activeTask.category,
    })
    lastAutoStartTaskIdRef.current = activeTask.id
  }, [activeTask, resolveCategoryById, startTimer, timers])

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className={`w-full bg-black/30 backdrop-blur-sm border-t border-white/10 ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Left Side - Total Earnings & Active Timers */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-sm font-medium text-white">Session:</div>
              <div className="text-xl font-bold text-green-400" data-testid="session-total">
                {formatCurrency(totalEarnings)}
              </div>
              {/* Running indicator */}
              {totalActiveTimers > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </div>
            
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-sm font-medium text-white">Active:</div>
              <div className="text-lg text-blue-400">
                {totalActiveTimers}
              </div>
            </div>
          </div>

          {/* Center - Active Task Hint */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <div className="text-center sm:text-left">
              <div className="text-white font-medium">
                {activeTask ? activeTask.title : 'No task selected'}
              </div>
              {activeTask?.category ? (
                <div className="text-sm text-white/70">
                  {activeTask.category.name}
                </div>
              ) : (
                <div className="text-sm text-blue-300">
                  👆 Click a task and select "Start Timing" to begin
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Placeholder Controls (per-timer controls below) */}
          <div className="text-sm text-white/60">
            {timers.length === 0 ? 'No active timers' : `${timers.length} timer(s)`}
          </div>
        </div>

        {/* Global Controls */}
        {timers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <button
              onClick={pauseAllTimers}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              data-testid="timer-global-pause"
              aria-label="Pause all timers"
              title="Pause all timers"
            >
              ⏸ Pause All
            </button>
            <button
              onClick={stopAllTimers}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
              data-testid="timer-global-stop"
              aria-label="Stop all timers"
              title="Stop all timers"
            >
              ⏹ Stop All
            </button>
            <button
              onClick={resetAllTimers}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-md bg-slate-600 hover:bg-slate-700 text-white transition-colors"
              data-testid="timer-global-reset"
              aria-label="Reset all timers"
              title="Reset all timers"
            >
              🔄 Reset All
            </button>
            <button
              onClick={deleteAllTimers}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-md bg-rose-700 hover:bg-rose-800 text-white transition-colors"
              data-testid="timer-global-delete"
              aria-label="Delete all timers"
              title="Delete all timers"
            >
              🗑 Delete All
            </button>
          </div>
        )}

        {/* Multi-Timer List */}
        <div className="mt-4 space-y-2">
          {timers.map(timer => {
            const resolvedCategory = timer.task.category || (timer.task.category_id ? resolveCategoryById(timer.task.category_id) : undefined)
            const rate = resolvedCategory?.hourly_rate_usd || resolvedCategory?.hourly_rate

            return (
              <div
                key={timer.taskId}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-black/40 rounded-lg px-4 py-3 border border-white/10"
                data-testid={`timer-row-${timer.taskId}`}
              >
                <div className="flex-1">
                  <div className="text-white font-medium">
                    {timer.task.title}
                  </div>
                  <div className="text-sm text-white/70">
                    {resolvedCategory?.name || 'No category'}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-sm text-white/60">
                    {rate ? `${formatCurrency(rate)}/hr` : '--'}
                  </div>
                  <div
                    className="text-lg font-mono text-white bg-black/40 px-3 py-1 rounded-md min-w-[90px] text-center"
                    data-testid={`timer-time-${timer.taskId}`}
                  >
                    {formatTime(timer.currentTime)}
                  </div>
                  <div className="text-green-400 font-semibold" data-testid={`timer-earnings-${timer.taskId}`}>
                    {formatCurrency(timer.sessionEarnings)}
                  </div>
                </div>

                <TimerControls
                  isRunning={timer.isRunning}
                  isPaused={timer.isPaused}
                  onStart={() => startTimer(timer.task)}
                  onPause={() => pauseTimer(timer.taskId)}
                  onResume={() => resumeTimer(timer.taskId)}
                  onStop={() => stopTimer(timer.taskId)}
                  onReset={() => resetTimer(timer.taskId)}
                  onDelete={() => deleteTimer(timer.taskId)}
                  size="sm"
                  variant="compact"
                  showLabels={false}
                  ariaLabelPrefix={timer.task.title}
                  testIdPrefix={`timer-${timer.taskId}`}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MBBTimerSection
