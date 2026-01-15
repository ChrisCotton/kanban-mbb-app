import { useState, useEffect, useCallback } from 'react'

interface ActiveTask {
  id: string
  title: string
  category?: {
    id: string
    name: string
    hourly_rate: number
    color?: string
  }
}

interface PersistedTimerState {
  currentTime: number
  isRunning: boolean
  isPaused: boolean
  sessionEarnings: number
  sessionStartTime: string | null
  activeSession: TimerSession | null
  lastUpdateTime: number
}

interface TimerSession {
  taskId: string
  duration: number
  earnings: number
  startTime: Date
  endTime?: Date
}

interface UseTimerReturn {
  // Timer state
  currentTime: number
  isRunning: boolean
  isPaused: boolean
  sessionEarnings: number
  
  // Timer controls
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => Promise<void>
  reset: () => void
  
  // Session management
  activeSession: TimerSession | null
  totalSessionsToday: number
  totalEarningsToday: number
}

interface UseTimerOptions {
  activeTask?: ActiveTask | null
  onTaskSelect?: () => void
  onSessionSave?: (session: TimerSession) => Promise<void>
  autoSave?: boolean
}

const STORAGE_KEY = 'mbb-timer-state'

export const useTimer = (options: UseTimerOptions = {}): UseTimerReturn => {
  const { activeTask, onTaskSelect, onSessionSave, autoSave = true } = options
  
  // Initialize state from localStorage or defaults
  const getInitialState = (): PersistedTimerState => {
    if (typeof window === 'undefined') {
      return {
        currentTime: 0,
        isRunning: false,
        isPaused: false,
        sessionEarnings: 0,
        sessionStartTime: null,
        activeSession: null,
        lastUpdateTime: Date.now()
      }
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: PersistedTimerState = JSON.parse(saved)
        // Calculate time elapsed since last update if timer was running
        if (parsed.isRunning && !parsed.isPaused && parsed.lastUpdateTime) {
          const now = Date.now()
          const elapsed = Math.floor((now - parsed.lastUpdateTime) / 1000)
          parsed.currentTime += elapsed
          
          // Recalculate earnings if we have active task data
          const hourlyRate = activeTask?.category?.hourly_rate_usd || activeTask?.category?.hourly_rate
          if (parsed.activeSession && hourlyRate) {
            const hoursWorked = parsed.currentTime / 3600
            parsed.sessionEarnings = hoursWorked * hourlyRate
          }
        }
        return parsed
      }
    } catch (error) {
      console.error('Error loading timer state from localStorage:', error)
    }

    return {
      currentTime: 0,
      isRunning: false,
      isPaused: false,
      sessionEarnings: 0,
      sessionStartTime: null,
      activeSession: null,
      lastUpdateTime: Date.now()
    }
  }

  const initialState = getInitialState()
  
  // Timer state
  const [currentTime, setCurrentTime] = useState(initialState.currentTime)
  const [isRunning, setIsRunning] = useState(initialState.isRunning)
  const [isPaused, setIsPaused] = useState(initialState.isPaused)
  const [sessionEarnings, setSessionEarnings] = useState(initialState.sessionEarnings)
  const [activeSession, setActiveSession] = useState<TimerSession | null>(
    initialState.activeSession ? {
      ...initialState.activeSession,
      startTime: new Date(initialState.activeSession.startTime),
      endTime: initialState.activeSession.endTime ? new Date(initialState.activeSession.endTime) : undefined
    } : null
  )
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(
    initialState.sessionStartTime ? new Date(initialState.sessionStartTime) : null
  )
  
  // Daily tracking (could be moved to separate hook later)
  const [totalSessionsToday, setTotalSessionsToday] = useState(0)
  const [totalEarningsToday, setTotalEarningsToday] = useState(0)

  // Persist state to localStorage
  const persistState = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const stateToSave: PersistedTimerState = {
        currentTime,
        isRunning,
        isPaused,
        sessionEarnings,
        sessionStartTime: sessionStartTime?.toISOString() || null,
        activeSession: activeSession ? {
          ...activeSession,
          startTime: activeSession.startTime.toISOString() as any,
          endTime: activeSession.endTime?.toISOString() as any
        } : null,
        lastUpdateTime: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
    } catch (error) {
      console.error('Error saving timer state to localStorage:', error)
    }
  }, [currentTime, isRunning, isPaused, sessionEarnings, sessionStartTime, activeSession])

  // Clear persisted state
  const clearPersistedState = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing timer state from localStorage:', error)
    }
  }, [])

  // Persist state whenever it changes
  useEffect(() => {
    persistState()
  }, [persistState])

  // Handle page unload/beforeunload - ensure state is persisted
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = () => {
      if (isRunning) {
        persistState()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isRunning) {
        persistState()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isRunning, persistState])

  // Timer effect - runs every second when active
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
          setCurrentTime(prev => {
          const newTime = prev + 1
          
          // Calculate real-time earnings
          const hourlyRate = activeTask?.category?.hourly_rate_usd || activeTask?.category?.hourly_rate

          if (hourlyRate) {
            const hoursWorked = newTime / 3600
            const earnings = hoursWorked * hourlyRate
            setSessionEarnings(earnings)
            
            // Update active session
            if (activeSession) {
              setActiveSession(prev => prev ? {
                ...prev,
                duration: newTime,
                earnings
              } : null)
            }
          }
          
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, isPaused, activeTask?.category?.hourly_rate_usd, activeTask?.category?.hourly_rate, activeSession])

  // Timer control functions
  const start = useCallback(() => {
    if (!activeTask) {
      onTaskSelect?.()
      return
    }

    const startTime = new Date()
    setSessionStartTime(startTime)
    setIsRunning(true)
    setIsPaused(false)
    
    // Create new session
    const newSession: TimerSession = {
      taskId: activeTask.id,
      duration: 0,
      earnings: 0,
      startTime
    }
    setActiveSession(newSession)
  }, [activeTask, onTaskSelect])

  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])

  const stop = useCallback(async () => {
    if (activeSession && sessionStartTime) {
      const endTime = new Date()
      const finalSession: TimerSession = {
        ...activeSession,
        duration: currentTime,
        earnings: sessionEarnings,
        endTime
      }

      // Save session to database if auto-save is enabled and callback provided
      if (autoSave && onSessionSave) {
        try {
          await onSessionSave(finalSession)
          console.log('Timer session saved successfully:', finalSession)
        } catch (error) {
          console.error('Failed to save timer session:', error)
        }
      }

      // Update daily totals
      setTotalSessionsToday(prev => prev + 1)
      setTotalEarningsToday(prev => prev + sessionEarnings)
    }

    // Reset timer state
    setIsRunning(false)
    setIsPaused(false)
    setCurrentTime(0)
    setSessionEarnings(0)
    setActiveSession(null)
    setSessionStartTime(null)
    
    // Clear persisted state after stopping
    clearPersistedState()
  }, [activeSession, sessionStartTime, currentTime, sessionEarnings, autoSave, onSessionSave, clearPersistedState])

  const reset = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
    setCurrentTime(0)
    setSessionEarnings(0)
    setActiveSession(null)
    setSessionStartTime(null)
    
    // Clear persisted state after reset
    clearPersistedState()
  }, [clearPersistedState])

  return {
    // Timer state
    currentTime,
    isRunning,
    isPaused,
    sessionEarnings,
    
    // Timer controls
    start,
    pause,
    resume,
    stop,
    reset,
    
    // Session management
    activeSession,
    totalSessionsToday,
    totalEarningsToday
  }
}

export default useTimer 