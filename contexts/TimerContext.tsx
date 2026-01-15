'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { startTimerSession, timerService } from '../lib/timer-integration'
import { useCategories } from '../hooks/useCategories'

// Timer entry interface (same as useMultiTimer)
export interface MultiTimerTask {
  id: string
  title: string
  category_id?: string | null
  category?: {
    id: string
    name: string
    hourly_rate_usd?: number
    hourly_rate?: number
    color?: string
  } | null
}

export interface MultiTimerEntry {
  task: MultiTimerTask
  taskId: string
  currentTime: number
  isRunning: boolean
  isPaused: boolean
  sessionEarnings: number
  sessionId?: string
  startTime?: string // ISO string for localStorage compatibility
  endTime?: string
}

interface TimerContextValue {
  timers: MultiTimerEntry[]
  totalEarnings: number
  totalActiveTimers: number
  startTimer: (task: MultiTimerTask) => Promise<void>
  pauseTimer: (taskId: string) => void
  resumeTimer: (taskId: string) => void
  stopTimer: (taskId: string) => Promise<void>
  resetTimer: (taskId: string) => void
  deleteTimer: (taskId: string) => Promise<void>
  pauseAllTimers: () => void
  stopAllTimers: () => Promise<void>
  resetAllTimers: () => void
  deleteAllTimers: () => Promise<void>
  setUserId: (userId: string | undefined) => void
  userId: string | undefined
}

const STORAGE_KEY = 'mbb_active_timers'
const MAX_TIMER_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

const TimerContext = createContext<TimerContextValue | undefined>(undefined)

// Validate timer entry from localStorage
function isValidTimer(timer: any): timer is MultiTimerEntry {
  if (!timer || typeof timer !== 'object') return false
  if (!timer.taskId || !timer.task) return false
  if (typeof timer.currentTime !== 'number') return false
  if (typeof timer.isRunning !== 'boolean') return false
  if (typeof timer.isPaused !== 'boolean') return false
  
  // Check if timer is stale (started more than 24 hours ago)
  if (timer.startTime) {
    const startTime = new Date(timer.startTime).getTime()
    if (isNaN(startTime) || Date.now() - startTime > MAX_TIMER_AGE_MS) {
      return false
    }
  }
  
  return true
}

export function TimerContextProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<MultiTimerEntry[]>([])
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [isInitialized, setIsInitialized] = useState(false)
  const timersRef = useRef(timers)
  
  // Access categories for rate resolution
  const { getCategoryById } = useCategories()

  // Keep ref in sync
  useEffect(() => {
    timersRef.current = timers
  }, [timers])

  // Restore timers from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const validTimers = parsed.filter(isValidTimer)
          
          // Recalculate current time for running timers based on elapsed time
          const restoredTimers = validTimers.map(timer => {
            if (timer.isRunning && !timer.isPaused && timer.startTime) {
              const startTime = new Date(timer.startTime).getTime()
              const elapsed = Math.floor((Date.now() - startTime) / 1000)
              return {
                ...timer,
                currentTime: elapsed,
                sessionEarnings: calculateEarnings(elapsed, timer.task)
              }
            }
            return timer
          })
          
          setTimers(restoredTimers)
          console.log('📦 Restored timers from localStorage:', restoredTimers.length)
        }
      }
    } catch (error) {
      console.error('Failed to restore timers from localStorage:', error)
    }
    
    setIsInitialized(true)
  }, [])

  // Save timers to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers))
    } catch (error) {
      console.error('Failed to save timers to localStorage:', error)
    }
  }, [timers, isInitialized])

  // Calculate earnings helper
  function calculateEarnings(seconds: number, task: MultiTimerTask): number {
    const rate = task.category?.hourly_rate_usd || task.category?.hourly_rate || 0
    return rate ? (seconds / 3600) * rate : 0
  }

  // Resolve category from ID
  const getResolvedCategory = useCallback((task?: MultiTimerTask | null) => {
    if (!task) return undefined
    if (task.category) return task.category
    if (task.category_id && getCategoryById) {
      const category = getCategoryById(task.category_id)
      if (category) {
        return {
          id: category.id,
          name: category.name,
          hourly_rate_usd: (category as any).hourly_rate_usd ?? category.hourly_rate ?? 0,
          hourly_rate: category.hourly_rate,
          color: category.color,
        }
      }
    }
    return undefined
  }, [getCategoryById])

  // Get hourly rate for a task
  const getHourlyRate = useCallback((task?: MultiTimerTask | null) => {
    const category = getResolvedCategory(task)
    if (!category) return 0
    return category.hourly_rate_usd || category.hourly_rate || 0
  }, [getResolvedCategory])

  // Check if there are running timers
  const hasRunningTimers = useMemo(
    () => timers.some(timer => timer.isRunning && !timer.isPaused),
    [timers]
  )

  // Tick interval for running timers
  useEffect(() => {
    if (!hasRunningTimers) return

    const interval = setInterval(() => {
      setTimers(prevTimers =>
        prevTimers.map(timer => {
          if (!timer.isRunning || timer.isPaused) {
            return timer
          }

          const newTime = timer.currentTime + 1
          const hourlyRate = getHourlyRate(timer.task)
          const earnings = hourlyRate ? (newTime / 3600) * hourlyRate : 0

          return {
            ...timer,
            currentTime: newTime,
            sessionEarnings: earnings,
          }
        })
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [getHourlyRate, hasRunningTimers])

  // Start a timer for a task
  const startTimer = useCallback(async (task: MultiTimerTask) => {
    if (!task) return

    const resolvedCategory = getResolvedCategory(task)
    const normalizedTask = resolvedCategory && !task.category
      ? { ...task, category: resolvedCategory }
      : task

    setTimers(prevTimers => {
      const existing = prevTimers.find(timer => timer.taskId === task.id)
      if (existing) {
        if (existing.isRunning && !existing.isPaused) {
          return prevTimers
        }
        return prevTimers.map(timer =>
          timer.taskId === task.id
            ? {
                ...timer,
                task: resolvedCategory && !timer.task.category
                  ? { ...timer.task, category: resolvedCategory }
                  : timer.task,
                isRunning: true,
                isPaused: false,
                startTime: timer.startTime || new Date().toISOString()
              }
            : timer
        )
      }

      return [
        ...prevTimers,
        {
          task: normalizedTask,
          taskId: task.id,
          currentTime: 0,
          isRunning: true,
          isPaused: false,
          sessionEarnings: 0,
          startTime: new Date().toISOString(),
        },
      ]
    })

    // Start backend session
    if (userId) {
      try {
        const session = await startTimerSession(task.id, userId, getHourlyRate(normalizedTask))
        setTimers(prevTimers =>
          prevTimers.map(timer =>
            timer.taskId === task.id ? { ...timer, sessionId: session.id } : timer
          )
        )
      } catch (error) {
        console.error('Failed to start timer session:', error)
      }
    }
  }, [getHourlyRate, getResolvedCategory, userId])

  // Pause a single timer
  const pauseTimer = useCallback((taskId: string) => {
    setTimers(prevTimers =>
      prevTimers.map(timer =>
        timer.taskId === taskId ? { ...timer, isPaused: true } : timer
      )
    )
  }, [])

  // Pause all timers
  const pauseAllTimers = useCallback(() => {
    setTimers(prevTimers =>
      prevTimers.map(timer => (timer.isRunning ? { ...timer, isPaused: true } : timer))
    )
  }, [])

  // Resume a single timer
  const resumeTimer = useCallback((taskId: string) => {
    setTimers(prevTimers =>
      prevTimers.map(timer =>
        timer.taskId === taskId ? { ...timer, isPaused: false, isRunning: true } : timer
      )
    )
  }, [])

  // Stop a single timer
  const stopTimer = useCallback(async (taskId: string) => {
    const timer = timersRef.current.find(entry => entry.taskId === taskId)

    setTimers(prevTimers =>
      prevTimers.map(entry =>
        entry.taskId === taskId
          ? { ...entry, isRunning: false, isPaused: false, endTime: new Date().toISOString() }
          : entry
      )
    )

    if (userId && timer?.sessionId) {
      try {
        await timerService.endSession({
          session_id: timer.sessionId,
          user_id: userId,
          action: 'stop',
        })
      } catch (error) {
        console.error('Failed to stop timer session:', error)
      }
    }
  }, [userId])

  // Stop all timers
  const stopAllTimers = useCallback(async () => {
    const sessions = timersRef.current
      .filter(entry => entry.sessionId && entry.isRunning)
      .map(entry => entry.sessionId as string)

    setTimers(prevTimers =>
      prevTimers.map(entry =>
        entry.isRunning
          ? { ...entry, isRunning: false, isPaused: false, endTime: new Date().toISOString() }
          : entry
      )
    )

    if (userId && sessions.length > 0) {
      try {
        await Promise.all(
          sessions.map(sessionId =>
            timerService.endSession({
              session_id: sessionId,
              user_id: userId,
              action: 'stop',
            })
          )
        )
      } catch (error) {
        console.error('Failed to stop all timer sessions:', error)
      }
    }
  }, [userId])

  // Reset a single timer
  const resetTimer = useCallback((taskId: string) => {
    setTimers(prevTimers =>
      prevTimers.map(timer =>
        timer.taskId === taskId
          ? { ...timer, currentTime: 0, sessionEarnings: 0, isPaused: false, isRunning: false }
          : timer
      )
    )
  }, [])

  // Reset all timers
  const resetAllTimers = useCallback(() => {
    setTimers(prevTimers =>
      prevTimers.map(timer => ({
        ...timer,
        currentTime: 0,
        sessionEarnings: 0,
        isPaused: false,
        isRunning: false,
      }))
    )
  }, [])

  // Delete a single timer
  const deleteTimer = useCallback(async (taskId: string) => {
    const timer = timersRef.current.find(entry => entry.taskId === taskId)

    setTimers(prevTimers => prevTimers.filter(entry => entry.taskId !== taskId))

    if (userId && timer?.sessionId) {
      try {
        await timerService.endSession({
          session_id: timer.sessionId,
          user_id: userId,
          action: 'stop',
        })
      } catch (error) {
        console.error('Failed to delete timer session:', error)
      }
    }
  }, [userId])

  // Delete all timers
  const deleteAllTimers = useCallback(async () => {
    const sessions = timersRef.current
      .filter(entry => entry.sessionId)
      .map(entry => entry.sessionId as string)

    setTimers([])

    if (userId && sessions.length > 0) {
      try {
        await Promise.all(
          sessions.map(sessionId =>
            timerService.endSession({
              session_id: sessionId,
              user_id: userId,
              action: 'stop',
            })
          )
        )
      } catch (error) {
        console.error('Failed to delete all timer sessions:', error)
      }
    }
  }, [userId])

  // Calculate totals
  const totalEarnings = useMemo(
    () => timers.reduce((sum, timer) => sum + timer.sessionEarnings, 0),
    [timers]
  )

  const totalActiveTimers = useMemo(
    () => timers.filter(timer => timer.isRunning && !timer.isPaused).length,
    [timers]
  )

  const contextValue: TimerContextValue = {
    timers,
    totalEarnings,
    totalActiveTimers,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    deleteTimer,
    pauseAllTimers,
    stopAllTimers,
    resetAllTimers,
    deleteAllTimers,
    setUserId,
    userId,
  }

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  )
}

// Hook to use timer context
export function useTimerContext(): TimerContextValue {
  const context = useContext(TimerContext)
  if (context === undefined) {
    throw new Error('useTimerContext must be used within a TimerContextProvider')
  }
  return context
}

export default TimerContext
