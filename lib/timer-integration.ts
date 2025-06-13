import { Task } from './database/kanban-queries'
import { 
  calculateFocusSessionReward, 
  MentalBankConfig, 
  DEFAULT_MENTAL_BANK_CONFIG,
  EnergyTransaction 
} from './mental-bank-integration'

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
