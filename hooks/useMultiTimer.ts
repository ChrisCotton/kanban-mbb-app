import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startTimerSession, timerService } from '../lib/timer-integration'

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
  startTime?: Date
  endTime?: Date
}

interface UseMultiTimerOptions {
  userId?: string
  resolveCategoryById?: (categoryId: string) => MultiTimerTask['category'] | undefined
}

export const useMultiTimer = (options: UseMultiTimerOptions = {}) => {
  const { userId, resolveCategoryById } = options
  const [timers, setTimers] = useState<MultiTimerEntry[]>([])
  const timersRef = useRef(timers)

  useEffect(() => {
    timersRef.current = timers
  }, [timers])

  const hasRunningTimers = useMemo(
    () => timers.some(timer => timer.isRunning && !timer.isPaused),
    [timers]
  )

  const getResolvedCategory = useCallback((task?: MultiTimerTask | null) => {
    if (!task) return undefined
    if (task.category) return task.category
    if (task.category_id && resolveCategoryById) {
      return resolveCategoryById(task.category_id)
    }
    return undefined
  }, [resolveCategoryById])

  const getHourlyRate = useCallback((task?: MultiTimerTask | null) => {
    const category = getResolvedCategory(task)
    if (!category) return 0
    return category.hourly_rate_usd || category.hourly_rate || 0
  }, [getResolvedCategory])

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
              startTime: timer.startTime || new Date() 
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
          startTime: new Date(),
        },
      ]
    })

    if (!userId) return

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
  }, [getHourlyRate, userId])

  const pauseTimer = useCallback((taskId: string) => {
    setTimers(prevTimers =>
      prevTimers.map(timer =>
        timer.taskId === taskId ? { ...timer, isPaused: true } : timer
      )
    )
  }, [])

  const pauseAllTimers = useCallback(() => {
    setTimers(prevTimers =>
      prevTimers.map(timer => (timer.isRunning ? { ...timer, isPaused: true } : timer))
    )
  }, [])

  const resumeTimer = useCallback((taskId: string) => {
    setTimers(prevTimers =>
      prevTimers.map(timer =>
        timer.taskId === taskId ? { ...timer, isPaused: false, isRunning: true } : timer
      )
    )
  }, [])

  const stopTimer = useCallback(async (taskId: string) => {
    const timer = timersRef.current.find(entry => entry.taskId === taskId)

    setTimers(prevTimers =>
      prevTimers.map(entry =>
        entry.taskId === taskId
          ? { ...entry, isRunning: false, isPaused: false, endTime: new Date() }
          : entry
      )
    )

    if (!userId || !timer?.sessionId) return

    try {
      await timerService.endSession({
        session_id: timer.sessionId,
        user_id: userId,
        action: 'stop',
      })
    } catch (error) {
      console.error('Failed to stop timer session:', error)
    }
  }, [userId])

  const stopAllTimers = useCallback(async () => {
    const sessions = timersRef.current
      .filter(entry => entry.sessionId && entry.isRunning)
      .map(entry => entry.sessionId as string)

    setTimers(prevTimers =>
      prevTimers.map(entry =>
        entry.isRunning
          ? { ...entry, isRunning: false, isPaused: false, endTime: new Date() }
          : entry
      )
    )

    if (!userId || sessions.length === 0) return

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
  }, [userId])

  const resetTimer = useCallback((taskId: string) => {
    setTimers(prevTimers =>
      prevTimers.map(timer =>
        timer.taskId === taskId
          ? { ...timer, currentTime: 0, sessionEarnings: 0, isPaused: false, isRunning: false }
          : timer
      )
    )
  }, [])

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

  const deleteTimer = useCallback(async (taskId: string) => {
    const timer = timersRef.current.find(entry => entry.taskId === taskId)

    setTimers(prevTimers => prevTimers.filter(entry => entry.taskId !== taskId))

    if (!userId || !timer?.sessionId) return

    try {
      await timerService.endSession({
        session_id: timer.sessionId,
        user_id: userId,
        action: 'stop',
      })
    } catch (error) {
      console.error('Failed to delete timer session:', error)
    }
  }, [userId])

  const deleteAllTimers = useCallback(async () => {
    const sessions = timersRef.current
      .filter(entry => entry.sessionId)
      .map(entry => entry.sessionId as string)

    setTimers([])

    if (!userId || sessions.length === 0) return

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
  }, [userId])

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

  const totalEarnings = useMemo(
    () => timers.reduce((sum, timer) => sum + timer.sessionEarnings, 0),
    [timers]
  )

  const totalActiveTimers = useMemo(
    () => timers.filter(timer => timer.isRunning && !timer.isPaused).length,
    [timers]
  )

  return {
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
  }
}

export default useMultiTimer
