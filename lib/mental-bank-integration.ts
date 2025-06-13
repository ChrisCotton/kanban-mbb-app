import { Task } from './database/kanban-queries'

// Mental Bank Balance Configuration
export interface MentalBankConfig {
  // Base energy costs for different task priorities
  priorityCosts: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  // Energy rewards for task completion
  completionRewards: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  // Column-based energy modifiers
  columnModifiers: {
    backlog: number    // No energy cost for planning
    todo: number       // Small cost for commitment
    doing: number      // Higher cost for active work
    done: number       // Reward for completion
  }
  // Time-based energy calculations
  timeFactors: {
    focusSessionReward: number    // Reward per focused work session
    overtimeMultiplier: number    // Penalty for working too long
    breakBonus: number           // Bonus for taking breaks
  }
  // Daily limits and recovery
  dailyLimits: {
    maxEnergyExpenditure: number  // Maximum energy that can be spent per day
    recoveryRate: number          // Energy recovered per hour of rest
    sleepRecovery: number         // Energy recovered per night
  }
}

// Default configuration based on productivity research
export const DEFAULT_MENTAL_BANK_CONFIG: MentalBankConfig = {
  priorityCosts: {
    low: 5,      // Low cognitive load tasks
    medium: 15,  // Standard tasks requiring focus
    high: 30,    // Complex tasks requiring deep work
    urgent: 50   // High-stress, time-sensitive tasks
  },
  completionRewards: {
    low: 8,      // Small sense of accomplishment
    medium: 25,  // Good progress feeling
    high: 50,    // Significant achievement
    urgent: 75   // Relief + accomplishment for urgent tasks
  },
  columnModifiers: {
    backlog: 0,   // No cost for planning/organizing
    todo: 0.2,    // Small commitment cost
    doing: 1.0,   // Full energy cost while working
    done: -0.5    // Negative cost = reward
  },
  timeFactors: {
    focusSessionReward: 10,     // Bonus for sustained focus
    overtimeMultiplier: 1.5,    // 50% penalty for overwork
    breakBonus: 5               // Small bonus for taking breaks
  },
  dailyLimits: {
    maxEnergyExpenditure: 200,  // Reasonable daily limit
    recoveryRate: 8,            // Energy per hour of rest
    sleepRecovery: 100          // Full night's sleep recovery
  }
}

// Mental Bank Balance State
export interface MentalBankState {
  currentEnergy: number
  maxEnergy: number
  dailyExpenditure: number
  lastUpdated: Date
  streakDays: number
  totalTasksCompleted: number
  weeklyStats: {
    energySpent: number
    energyGained: number
    tasksCompleted: number
    focusTime: number
  }
}

// Energy Transaction Record
export interface EnergyTransaction {
  id: string
  taskId?: string
  type: 'task_start' | 'task_complete' | 'task_move' | 'focus_session' | 'break' | 'sleep'
  energyDelta: number
  timestamp: Date
  metadata?: {
    taskTitle?: string
    fromColumn?: string
    toColumn?: string
    sessionDuration?: number
    priority?: string
    notes?: string
  }
}

/**
 * Calculate energy cost for starting work on a task
 */
export function calculateTaskStartCost(
  task: Task,
  config: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): number {
  const baseCost = config.priorityCosts[task.priority as keyof typeof config.priorityCosts] || config.priorityCosts.medium
  const columnModifier = config.columnModifiers.doing
  
  return Math.round(baseCost * columnModifier)
}

/**
 * Calculate energy reward for completing a task
 */
export function calculateTaskCompletionReward(
  task: Task,
  config: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): number {
  const baseReward = config.completionRewards[task.priority as keyof typeof config.completionRewards] || config.completionRewards.medium
  
  // Bonus for overdue tasks (relief factor)
  let overdueBonus = 0
  if (task.due_date) {
    const dueDate = new Date(task.due_date)
    const now = new Date()
    if (now > dueDate) {
      const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      overdueBonus = Math.min(daysOverdue * 5, 25) // Max 25 bonus points
    }
  }
  
  return Math.round(baseReward + overdueBonus)
}

/**
 * Calculate energy impact of moving a task between columns
 */
export function calculateColumnMoveImpact(
  task: Task,
  fromColumn: string,
  toColumn: string,
  config: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): number {
  const fromModifier = config.columnModifiers[fromColumn as keyof typeof config.columnModifiers] || 0
  const toModifier = config.columnModifiers[toColumn as keyof typeof config.columnModifiers] || 0
  
  const baseCost = config.priorityCosts[task.priority as keyof typeof config.priorityCosts] || config.priorityCosts.medium
  
  // Calculate the difference in energy impact
  const energyDelta = (toModifier - fromModifier) * baseCost
  
  // Special case: moving to "done" gives completion reward
  if (toColumn === 'done') {
    return calculateTaskCompletionReward(task, config)
  }
  
  // Special case: moving from "doing" back to "todo" (task interruption)
  if (fromColumn === 'doing' && toColumn === 'todo') {
    return Math.round(baseCost * 0.3) // 30% energy loss for context switching
  }
  
  return Math.round(energyDelta)
}

/**
 * Calculate energy reward for a focused work session
 */
export function calculateFocusSessionReward(
  durationMinutes: number,
  config: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): number {
  // Reward for sessions 25+ minutes (Pomodoro technique)
  if (durationMinutes >= 25) {
    const sessions = Math.floor(durationMinutes / 25)
    return sessions * config.timeFactors.focusSessionReward
  }
  
  return 0
}

/**
 * Calculate daily energy recovery
 */
export function calculateDailyRecovery(
  hoursSlept: number,
  hoursRested: number,
  config: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): number {
  const sleepRecovery = Math.min(hoursSlept / 8, 1) * config.dailyLimits.sleepRecovery
  const restRecovery = hoursRested * config.timeFactors.breakBonus
  
  return Math.round(sleepRecovery + restRecovery)
}

/**
 * Check if user is approaching energy limits
 */
export function checkEnergyLimits(
  currentState: MentalBankState,
  config: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): {
  isOverLimit: boolean
  warningLevel: 'none' | 'caution' | 'warning' | 'critical'
  recommendation: string
} {
  const energyPercentage = currentState.currentEnergy / currentState.maxEnergy
  const dailyUsagePercentage = currentState.dailyExpenditure / config.dailyLimits.maxEnergyExpenditure
  
  if (energyPercentage <= 0.1 || dailyUsagePercentage >= 1.0) {
    return {
      isOverLimit: true,
      warningLevel: 'critical',
      recommendation: 'Take a break! Your mental energy is critically low. Consider stopping work for today.'
    }
  }
  
  if (energyPercentage <= 0.25 || dailyUsagePercentage >= 0.8) {
    return {
      isOverLimit: false,
      warningLevel: 'warning',
      recommendation: 'Your mental energy is running low. Consider taking a break or working on lower-priority tasks.'
    }
  }
  
  if (energyPercentage <= 0.5 || dailyUsagePercentage >= 0.6) {
    return {
      isOverLimit: false,
      warningLevel: 'caution',
      recommendation: 'You\'re using significant mental energy. Plan some breaks to maintain productivity.'
    }
  }
  
  return {
    isOverLimit: false,
    warningLevel: 'none',
    recommendation: 'Your mental energy levels look good. Keep up the great work!'
  }
}

/**
 * Generate energy impact summary for task operations
 */
export function generateEnergyImpactSummary(
  task: Task,
  operation: 'start' | 'complete' | 'move',
  fromColumn?: string,
  toColumn?: string,
  config: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): {
  energyDelta: number
  description: string
  icon: string
  color: string
} {
  let energyDelta = 0
  let description = ''
  let icon = ''
  let color = ''
  
  switch (operation) {
    case 'start':
      energyDelta = -calculateTaskStartCost(task, config)
      description = `Starting ${task.priority} priority task`
      icon = '⚡'
      color = 'text-yellow-400'
      break
      
    case 'complete':
      energyDelta = calculateTaskCompletionReward(task, config)
      description = `Completed ${task.priority} priority task`
      icon = '✨'
      color = 'text-green-400'
      break
      
    case 'move':
      if (fromColumn && toColumn) {
        energyDelta = calculateColumnMoveImpact(task, fromColumn, toColumn, config)
        description = `Moved task from ${fromColumn} to ${toColumn}`
        icon = energyDelta > 0 ? '📈' : '📉'
        color = energyDelta > 0 ? 'text-green-400' : 'text-red-400'
      }
      break
  }
  
  return {
    energyDelta,
    description,
    icon,
    color
  }
}

/**
 * Calculate optimal task recommendations based on current energy
 */
export function getTaskRecommendations(
  tasks: Task[],
  currentEnergy: number,
  maxEnergy: number,
  config: MentalBankConfig = DEFAULT_MENTAL_BANK_CONFIG
): {
  recommended: Task[]
  avoid: Task[]
  energyBudget: number
} {
  const energyPercentage = currentEnergy / maxEnergy
  const energyBudget = Math.floor(currentEnergy * 0.7) // Reserve 30% for unexpected tasks
  
  const recommended: Task[] = []
  const avoid: Task[] = []
  
  for (const task of tasks) {
    if (energyPercentage > 0.7) {
      // High energy: can handle any task
      recommended.push(task)
    } else if (energyPercentage > 0.4) {
      // Medium energy: avoid urgent tasks
      if (task.priority !== 'urgent') {
        recommended.push(task)
      } else {
        avoid.push(task)
      }
    } else if (energyPercentage > 0.2) {
      // Low energy: only low/medium priority tasks
      if (task.priority === 'low' || task.priority === 'medium') {
        recommended.push(task)
      } else {
        avoid.push(task)
      }
    } else {
      // Very low energy: avoid all but the most urgent
      if (task.priority === 'urgent' && task.due_date) {
        const dueDate = new Date(task.due_date)
        const now = new Date()
        if (dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) { // Due within 24 hours
          recommended.push(task)
        } else {
          avoid.push(task)
        }
      } else {
        avoid.push(task)
      }
    }
  }
  
  return {
    recommended: recommended.sort((a, b) => {
      // Sort by priority and due date
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      // If same priority, sort by due date
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      
      return 0
    }),
    avoid,
    energyBudget
  }
} 