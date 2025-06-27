import { Task } from './database/kanban-queries'
import { 
  calculateFocusSessionReward, 
  MentalBankConfig, 
  DEFAULT_MENTAL_BANK_CONFIG,
  EnergyTransaction 
} from './mental-bank-integration'
import { TimerSession } from '../hooks/useTimer'

// Timer Session Types
export interface TimerSession {
  id: string
  taskId?: string
  type: 'focus' | 'break' | 'long_break'
  duration: number // in minutes
  startTime: Date
  endTime?: Date
  isActive: boolean
  isCompleted: boolean
  metadata?: {
    taskTitle?: string
    taskPriority?: string
    interruptions?: number
    notes?: string
  }
}

// Timer Configuration
export interface TimerConfig {
  focusSessionDuration: number    // Default focus session length (25 minutes)
  shortBreakDuration: number      // Short break length (5 minutes)
  longBreakDuration: number       // Long break length (15-30 minutes)
  sessionsUntilLongBreak: number  // Number of focus sessions before long break (4)
  autoStartBreaks: boolean        // Automatically start break timers
  autoStartFocus: boolean         // Automatically start next focus session
  notifications: {
    sessionComplete: boolean
    breakReminder: boolean
    dailyGoalReached: boolean
  }
  dailyGoals: {
    focusSessions: number         // Target number of focus sessions per day
    focusMinutes: number          // Target minutes of focused work per day
  }
}

// Default Pomodoro-based configuration
export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  focusSessionDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  notifications: {
    sessionComplete: true,
    breakReminder: true,
    dailyGoalReached: true
  },
  dailyGoals: {
    focusSessions: 8,    // 8 Pomodoros = ~4 hours of focused work
    focusMinutes: 200    // 3+ hours of focused work
  }
}

// Timer State
export interface TimerState {
  currentSession?: TimerSession
  todaySessions: TimerSession[]
  totalFocusTime: number        // Total minutes focused today
  totalBreakTime: number        // Total minutes on break today
  completedSessions: number     // Completed focus sessions today
  currentStreak: number         // Current consecutive focus sessions
  longestStreak: number         // Longest streak today
  dailyGoalProgress: {
    sessions: number
    minutes: number
    percentage: number
  }
}

/**
 * Create a new timer session
 */
export function createTimerSession(
  type: 'focus' | 'break' | 'long_break',
  taskId?: string,
  config: TimerConfig = DEFAULT_TIMER_CONFIG
): TimerSession {
  const duration = type === 'focus' 
    ? config.focusSessionDuration
    : type === 'break' 
      ? config.shortBreakDuration 
      : config.longBreakDuration

  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    taskId,
    type,
    duration,
    startTime: new Date(),
    isActive: true,
    isCompleted: false,
    metadata: {
      interruptions: 0
    }
  }
}

/**
 * Complete a timer session and calculate energy impact
 */
export function completeTimerSession(
  session: TimerSession,
  actualDuration?: number,
  mentalBankConfig: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): {
  completedSession: TimerSession
  energyTransaction?: EnergyTransaction
  achievements: string[]
} {
  const endTime = new Date()
  const actualMinutes = actualDuration || Math.round((endTime.getTime() - session.startTime.getTime()) / (1000 * 60))
  
  const completedSession: TimerSession = {
    ...session,
    endTime,
    isActive: false,
    isCompleted: true,
    duration: actualMinutes
  }

  const achievements: string[] = []
  let energyTransaction: EnergyTransaction | undefined

  // Calculate energy rewards for focus sessions
  if (session.type === 'focus') {
    const energyReward = calculateFocusSessionReward(actualMinutes, mentalBankConfig)
    
    if (energyReward > 0) {
      energyTransaction = {
        id: `energy_${session.id}`,
        taskId: session.taskId,
        type: 'focus_session',
        energyDelta: energyReward,
        timestamp: endTime,
        metadata: {
          sessionDuration: actualMinutes,
          taskTitle: session.metadata?.taskTitle,
          priority: session.metadata?.taskPriority
        }
      }

      // Achievement for completing a full focus session
      if (actualMinutes >= 25) {
        achievements.push('🎯 Completed a full focus session!')
      }
      
      // Achievement for long focus sessions
      if (actualMinutes >= 45) {
        achievements.push('🔥 Deep work session completed!')
      }
    }
  }

  // Achievement for taking breaks
  if (session.type === 'break' || session.type === 'long_break') {
    achievements.push('😌 Good job taking a break!')
  }

  return {
    completedSession,
    energyTransaction,
    achievements
  }
}

/**
 * Integration function: Start timer for a specific task
 */
export function startTaskTimer(
  task: Task,
  config: TimerConfig = DEFAULT_TIMER_CONFIG
): TimerSession {
  const session = createTimerSession('focus', task.id, config)
  
  // Add task metadata to session
  session.metadata = {
    ...session.metadata,
    taskTitle: task.title,
    taskPriority: task.priority
  }
  
  return session
}

interface ApiTimerSession {
  id: string
  task_id: string
  category_id?: string
  started_at: string
  ended_at?: string
  duration_seconds?: number
  hourly_rate_usd?: number
  earnings_usd?: number
  is_active: boolean
  session_notes?: string
  created_at: string
  updated_at: string
  tasks?: {
    id: string
    title: string
    status: string
    priority?: string
  }
  categories?: {
    id: string
    name: string
    color?: string
    icon?: string
  }
}

export interface StartSessionRequest {
  task_id: string
  user_id: string
  hourly_rate_usd?: number
  session_notes?: string
}

export interface EndSessionRequest {
  session_id: string
  user_id: string
  action: 'end' | 'stop'
  session_notes?: string
}

export interface UpdateSessionRequest {
  session_id: string
  user_id: string
  action?: 'pause' | 'resume'
  session_notes?: string
  hourly_rate_usd?: number
}

export class TimerIntegrationService {
  private static instance: TimerIntegrationService
  private activeSessionId: string | null = null

  static getInstance(): TimerIntegrationService {
    if (!TimerIntegrationService.instance) {
      TimerIntegrationService.instance = new TimerIntegrationService()
    }
    return TimerIntegrationService.instance
  }

  /**
   * Start a new timer session
   */
  async startSession(request: StartSessionRequest): Promise<ApiTimerSession> {
    const response = await fetch('/api/time-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to start timer session')
    }

    const { data } = await response.json()
    this.activeSessionId = data.id
    return data
  }

  /**
   * End/stop the current timer session
   */
  async endSession(request: EndSessionRequest): Promise<ApiTimerSession> {
    const response = await fetch(`/api/time-sessions/${request.session_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: request.action,
        user_id: request.user_id,
        session_notes: request.session_notes,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to end timer session')
    }

    const { data } = await response.json()
    this.activeSessionId = null
    return data
  }

  /**
   * Update session (pause/resume/notes)
   */
  async updateSession(request: UpdateSessionRequest): Promise<ApiTimerSession> {
    const response = await fetch(`/api/time-sessions/${request.session_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update timer session')
    }

    const { data } = await response.json()
    return data
  }

  /**
   * Get current active session for user
   */
  async getActiveSession(userId: string): Promise<ApiTimerSession | null> {
    const response = await fetch(`/api/time-sessions?user_id=${userId}&active_only=true`)

    if (!response.ok) {
      console.error('Failed to fetch active session')
      return null
    }

    const { data } = await response.json()
    const activeSession = data && data.length > 0 ? data[0] : null
    
    if (activeSession) {
      this.activeSessionId = activeSession.id
    }
    
    return activeSession
  }

  /**
   * Get daily sessions summary
   */
  async getDailySummary(userId: string, date?: string): Promise<{
    total_sessions: number
    total_time_seconds: number
    total_earnings_usd: number
    avg_session_duration: number
    avg_hourly_rate: number
  }> {
    const dateParam = date || new Date().toISOString().split('T')[0]
    const response = await fetch(
      `/api/time-sessions?user_id=${userId}&start_date=${dateParam}&end_date=${dateParam}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch daily summary')
    }

    const { summary } = await response.json()
    return summary
  }

  /**
   * Convert API session to TimerSession format
   */
  convertApiSession(apiSession: ApiTimerSession): TimerSession {
    return {
      taskId: apiSession.task_id,
      duration: apiSession.duration_seconds || 0,
      earnings: apiSession.earnings_usd || 0,
      startTime: new Date(apiSession.started_at),
      endTime: apiSession.ended_at ? new Date(apiSession.ended_at) : undefined,
    }
  }

  /**
   * Helper to get current active session ID
   */
  getActiveSessionId(): string | null {
    return this.activeSessionId
  }

  /**
   * Clear active session (for resets)
   */
  clearActiveSession(): void {
    this.activeSessionId = null
  }
}

// Export singleton instance
export const timerService = TimerIntegrationService.getInstance()

// Helper function for useTimer hook integration
export async function saveTimerSession(session: TimerSession, userId: string): Promise<void> {
  if (!timerService.getActiveSessionId()) {
    throw new Error('No active session to save')
  }

  await timerService.endSession({
    session_id: timerService.getActiveSessionId()!,
    user_id: userId,
    action: 'stop',
  })
}

// Helper function to start timer session
export async function startTimerSession(
  taskId: string, 
  userId: string, 
  hourlyRate?: number
): Promise<ApiTimerSession> {
  return await timerService.startSession({
    task_id: taskId,
    user_id: userId,
    hourly_rate_usd: hourlyRate,
  })
}

export default TimerIntegrationService
