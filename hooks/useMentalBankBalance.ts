import { useState, useEffect, useCallback } from 'react'
import { Task } from '../lib/database/kanban-queries'
import {
  MentalBankState,
  MentalBankConfig,
  EnergyTransaction,
  DEFAULT_MENTAL_BANK_CONFIG,
  calculateColumnMoveImpact,
  calculateTaskCompletionReward,
  generateEnergyImpactSummary,
  checkEnergyLimits,
  getTaskRecommendations
} from '../lib/mental-bank-integration'

interface UseMentalBankBalanceReturn {
  // Current state
  mentalBankState: MentalBankState
  loading: boolean
  error: string | null
  
  // Energy tracking functions
  trackTaskMove: (task: Task, fromColumn: string, toColumn: string) => Promise<void>
  trackTaskCompletion: (task: Task) => Promise<void>
  trackFocusSession: (durationMinutes: number, taskId?: string) => Promise<void>
  
  // Recommendations and insights
  getEnergyLimitsCheck: () => ReturnType<typeof checkEnergyLimits>
  getTaskRecommendations: (tasks: Task[]) => ReturnType<typeof getTaskRecommendations>
  getEnergyImpactPreview: (task: Task, operation: 'start' | 'complete' | 'move', fromColumn?: string, toColumn?: string) => ReturnType<typeof generateEnergyImpactSummary>
  
  // Energy management
  addEnergy: (amount: number, reason: string) => Promise<void>
  subtractEnergy: (amount: number, reason: string) => Promise<void>
  resetDailyExpenditure: () => Promise<void>
  
  // Recent transactions
  recentTransactions: EnergyTransaction[]
  
  // Configuration
  config: MentalBankConfig
  updateConfig: (newConfig: Partial<MentalBankConfig>) => void
}

// Default mental bank state
const DEFAULT_MENTAL_BANK_STATE: MentalBankState = {
  currentEnergy: 150,
  maxEnergy: 200,
  dailyExpenditure: 0,
  lastUpdated: new Date(),
  streakDays: 0,
  totalTasksCompleted: 0,
  weeklyStats: {
    energySpent: 0,
    energyGained: 0,
    tasksCompleted: 0,
    focusTime: 0
  }
}

export function useMentalBankBalance(): UseMentalBankBalanceReturn {
  const [mentalBankState, setMentalBankState] = useState<MentalBankState>(DEFAULT_MENTAL_BANK_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<EnergyTransaction[]>([])
  const [config, setConfig] = useState<MentalBankConfig>(DEFAULT_MENTAL_BANK_CONFIG)

  // Load mental bank state from localStorage on mount
  useEffect(() => {
    const loadMentalBankState = () => {
      try {
        const savedState = localStorage.getItem('mentalBankState')
        const savedConfig = localStorage.getItem('mentalBankConfig')
        const savedTransactions = localStorage.getItem('mentalBankTransactions')
        
        if (savedState) {
          const parsedState = JSON.parse(savedState)
          // Convert date strings back to Date objects
          parsedState.lastUpdated = new Date(parsedState.lastUpdated)
          setMentalBankState(parsedState)
        }
        
        if (savedConfig) {
          setConfig(JSON.parse(savedConfig))
        }
        
        if (savedTransactions) {
          const parsedTransactions = JSON.parse(savedTransactions)
          // Convert date strings back to Date objects
          parsedTransactions.forEach((t: any) => {
            t.timestamp = new Date(t.timestamp)
          })
          setRecentTransactions(parsedTransactions)
        }
        
        // Check if it's a new day and reset daily expenditure
        const today = new Date().toDateString()
        const lastUpdateDay = new Date(mentalBankState.lastUpdated).toDateString()
        
        if (today !== lastUpdateDay) {
          setMentalBankState(prev => ({
            ...prev,
            dailyExpenditure: 0,
            lastUpdated: new Date()
          }))
        }
        
      } catch (err) {
        console.error('Error loading mental bank state:', err)
        setError('Failed to load mental bank balance data')
      } finally {
        setLoading(false)
      }
    }

    loadMentalBankState()
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('mentalBankState', JSON.stringify(mentalBankState))
    }
  }, [mentalBankState, loading])

  useEffect(() => {
    localStorage.setItem('mentalBankConfig', JSON.stringify(config))
  }, [config])

  useEffect(() => {
    localStorage.setItem('mentalBankTransactions', JSON.stringify(recentTransactions))
  }, [recentTransactions])

  // Helper function to create and store energy transactions
  const createEnergyTransaction = useCallback((
    type: EnergyTransaction['type'],
    energyDelta: number,
    taskId?: string,
    metadata?: EnergyTransaction['metadata']
  ): EnergyTransaction => {
    const transaction: EnergyTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      type,
      energyDelta,
      timestamp: new Date(),
      metadata
    }

    // Add to recent transactions (keep last 50)
    setRecentTransactions(prev => [transaction, ...prev].slice(0, 50))

    return transaction
  }, [])

  // Helper function to update mental bank state
  const updateMentalBankState = useCallback((energyDelta: number, transaction: EnergyTransaction) => {
    setMentalBankState(prev => {
      const newCurrentEnergy = Math.max(0, Math.min(prev.maxEnergy, prev.currentEnergy + energyDelta))
      const newDailyExpenditure = energyDelta < 0 ? prev.dailyExpenditure + Math.abs(energyDelta) : prev.dailyExpenditure
      
      return {
        ...prev,
        currentEnergy: newCurrentEnergy,
        dailyExpenditure: newDailyExpenditure,
        lastUpdated: new Date(),
        totalTasksCompleted: transaction.type === 'task_complete' ? prev.totalTasksCompleted + 1 : prev.totalTasksCompleted,
        weeklyStats: {
          ...prev.weeklyStats,
          energySpent: energyDelta < 0 ? prev.weeklyStats.energySpent + Math.abs(energyDelta) : prev.weeklyStats.energySpent,
          energyGained: energyDelta > 0 ? prev.weeklyStats.energyGained + energyDelta : prev.weeklyStats.energyGained,
          tasksCompleted: transaction.type === 'task_complete' ? prev.weeklyStats.tasksCompleted + 1 : prev.weeklyStats.tasksCompleted,
          focusTime: transaction.type === 'focus_session' ? prev.weeklyStats.focusTime + (transaction.metadata?.sessionDuration || 0) : prev.weeklyStats.focusTime
        }
      }
    })
  }, [])

  // Track task movement between columns
  const trackTaskMove = useCallback(async (task: Task, fromColumn: string, toColumn: string) => {
    try {
      setError(null)
      
      const energyDelta = calculateColumnMoveImpact(task, fromColumn, toColumn, config)
      
      if (energyDelta !== 0) {
        const transaction = createEnergyTransaction(
          'task_move',
          energyDelta,
          task.id,
          {
            taskTitle: task.title,
            fromColumn,
            toColumn,
            priority: task.priority
          }
        )
        
        updateMentalBankState(energyDelta, transaction)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track task move')
      console.error('Error tracking task move:', err)
    }
  }, [config, createEnergyTransaction, updateMentalBankState])

  // Track task completion
  const trackTaskCompletion = useCallback(async (task: Task) => {
    try {
      setError(null)
      
      const energyDelta = calculateTaskCompletionReward(task, config)
      
      const transaction = createEnergyTransaction(
        'task_complete',
        energyDelta,
        task.id,
        {
          taskTitle: task.title,
          priority: task.priority
        }
      )
      
      updateMentalBankState(energyDelta, transaction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track task completion')
      console.error('Error tracking task completion:', err)
    }
  }, [config, createEnergyTransaction, updateMentalBankState])

  // Track focus session
  const trackFocusSession = useCallback(async (durationMinutes: number, taskId?: string) => {
    try {
      setError(null)
      
      const energyDelta = config.timeFactors.focusSessionReward * Math.floor(durationMinutes / 25)
      
      if (energyDelta > 0) {
        const transaction = createEnergyTransaction(
          'focus_session',
          energyDelta,
          taskId,
          {
            sessionDuration: durationMinutes
          }
        )
        
        updateMentalBankState(energyDelta, transaction)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track focus session')
      console.error('Error tracking focus session:', err)
    }
  }, [config, createEnergyTransaction, updateMentalBankState])

  // Get energy limits check
  const getEnergyLimitsCheck = useCallback(() => {
    return checkEnergyLimits(mentalBankState, config)
  }, [mentalBankState, config])

  // Get task recommendations
  const getTaskRecommendationsCallback = useCallback((tasks: Task[]) => {
    return getTaskRecommendations(tasks, mentalBankState.currentEnergy, mentalBankState.maxEnergy, config)
  }, [mentalBankState.currentEnergy, mentalBankState.maxEnergy, config])

  // Get energy impact preview
  const getEnergyImpactPreview = useCallback((
    task: Task,
    operation: 'start' | 'complete' | 'move',
    fromColumn?: string,
    toColumn?: string
  ) => {
    return generateEnergyImpactSummary(task, operation, fromColumn, toColumn, config)
  }, [config])

  // Add energy manually
  const addEnergy = useCallback(async (amount: number, reason: string) => {
    try {
      setError(null)
      
      const transaction = createEnergyTransaction(
        'break',
        amount,
        undefined,
        { notes: reason }
      )
      
      updateMentalBankState(amount, transaction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add energy')
      console.error('Error adding energy:', err)
    }
  }, [createEnergyTransaction, updateMentalBankState])

  // Subtract energy manually
  const subtractEnergy = useCallback(async (amount: number, reason: string) => {
    try {
      setError(null)
      
      const transaction = createEnergyTransaction(
        'task_start',
        -amount,
        undefined,
        { notes: reason }
      )
      
      updateMentalBankState(-amount, transaction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subtract energy')
      console.error('Error subtracting energy:', err)
    }
  }, [createEnergyTransaction, updateMentalBankState])

  // Reset daily expenditure
  const resetDailyExpenditure = useCallback(async () => {
    setMentalBankState(prev => ({
      ...prev,
      dailyExpenditure: 0,
      lastUpdated: new Date()
    }))
  }, [])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<MentalBankConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  return {
    mentalBankState,
    loading,
    error,
    trackTaskMove,
    trackTaskCompletion,
    trackFocusSession,
    getEnergyLimitsCheck,
    getTaskRecommendations: getTaskRecommendationsCallback,
    getEnergyImpactPreview,
    addEnergy,
    subtractEnergy,
    resetDailyExpenditure,
    recentTransactions,
    config,
    updateConfig
  }
}
