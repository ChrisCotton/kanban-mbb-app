import { renderHook, act } from '@testing-library/react'
import { useTimer } from './useTimer'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock window methods
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
})
Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
})

describe('useTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Basic Timer Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useTimer())

      expect(result.current.currentTime).toBe(0)
      expect(result.current.isRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.sessionEarnings).toBe(0)
      expect(result.current.activeSession).toBe(null)
    })

    it('should start timer with active task', () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: {
          id: 'cat-1',
          name: 'Development',
          hourly_rate: 50
        }
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      act(() => {
        result.current.start()
      })

      expect(result.current.isRunning).toBe(true)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.activeSession).not.toBe(null)
      expect(result.current.activeSession?.taskId).toBe('task-1')
    })

    it('should call onTaskSelect when starting without active task', () => {
      const onTaskSelect = jest.fn()
      const { result } = renderHook(() => useTimer({ onTaskSelect }))

      act(() => {
        result.current.start()
      })

      expect(onTaskSelect).toHaveBeenCalledTimes(1)
      expect(result.current.isRunning).toBe(false)
    })

    it('should pause and resume timer', () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 50 }
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      // Start timer
      act(() => {
        result.current.start()
      })

      // Pause timer
      act(() => {
        result.current.pause()
      })

      expect(result.current.isRunning).toBe(true)
      expect(result.current.isPaused).toBe(true)

      // Resume timer
      act(() => {
        result.current.resume()
      })

      expect(result.current.isRunning).toBe(true)
      expect(result.current.isPaused).toBe(false)
    })

    it('should stop timer and save session', async () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 50 }
      }

      const onSessionSave = jest.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useTimer({ activeTask, onSessionSave }))

      // Start timer
      act(() => {
        result.current.start()
      })

      // Advance time to accumulate some duration
      act(() => {
        jest.advanceTimersByTime(5000) // 5 seconds
      })

      // Stop timer
      await act(async () => {
        await result.current.stop()
      })

      expect(result.current.isRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.sessionEarnings).toBe(0)
      expect(result.current.activeSession).toBe(null)
      expect(onSessionSave).toHaveBeenCalledTimes(1)
    })

    it('should reset timer state', () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 50 }
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      // Start timer and advance time
      act(() => {
        result.current.start()
      })

      act(() => {
        jest.advanceTimersByTime(3000)
      })

      // Reset timer
      act(() => {
        result.current.reset()
      })

      expect(result.current.isRunning).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.sessionEarnings).toBe(0)
      expect(result.current.activeSession).toBe(null)
    })
  })

  describe('Persistence Functionality', () => {
    it('should save state to localStorage', () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 50 }
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      act(() => {
        result.current.start()
      })

      // Verify localStorage.setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'mbb-timer-state',
        expect.stringContaining('"isRunning":true')
      )
    })

    it('should restore state from localStorage', () => {
      const savedState = {
        currentTime: 120,
        isRunning: true,
        isPaused: false,
        sessionEarnings: 10,
        sessionStartTime: new Date().toISOString(),
        activeSession: {
          taskId: 'task-1',
          duration: 120,
          earnings: 10,
          startTime: new Date().toISOString()
        },
        lastUpdateTime: Date.now() - 1000 // 1 second ago
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState))

      const { result } = renderHook(() => useTimer())

      expect(result.current.currentTime).toBeGreaterThan(120) // Should add elapsed time
      expect(result.current.isRunning).toBe(true)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.activeSession).not.toBe(null)
    })

    it('should clear localStorage on stop', async () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 50 }
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      act(() => {
        result.current.start()
      })

      await act(async () => {
        await result.current.stop()
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mbb-timer-state')
    })

    it('should clear localStorage on reset', () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 50 }
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      act(() => {
        result.current.start()
      })

      act(() => {
        result.current.reset()
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mbb-timer-state')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      // Should not throw error and use default state
      const { result } = renderHook(() => useTimer())

      expect(result.current.currentTime).toBe(0)
      expect(result.current.isRunning).toBe(false)
    })
  })

  describe('Earnings Calculation', () => {
    it('should calculate earnings based on hourly rate', () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 60 } // $60/hour
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      act(() => {
        result.current.start()
      })

      // Advance time by 1 hour (3600 seconds)
      act(() => {
        jest.advanceTimersByTime(3600000)
      })

      expect(result.current.sessionEarnings).toBeCloseTo(60, 1) // Should be close to $60
    })

    it('should update earnings in real-time', () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 120 } // $120/hour = $2/minute
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      act(() => {
        result.current.start()
      })

      // Advance time by 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000)
      })

      expect(result.current.currentTime).toBe(30)
      expect(result.current.sessionEarnings).toBeCloseTo(1, 1) // Should be close to $1
    })
  })

  describe('Daily Tracking', () => {
    it('should track daily sessions and earnings', async () => {
      const activeTask = {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate: 50 }
      }

      const { result } = renderHook(() => useTimer({ activeTask }))

      // Start and stop first session
      act(() => {
        result.current.start()
      })

      act(() => {
        jest.advanceTimersByTime(3600000) // 1 hour
      })

      await act(async () => {
        await result.current.stop()
      })

      expect(result.current.totalSessionsToday).toBe(1)
      expect(result.current.totalEarningsToday).toBeCloseTo(50, 1)
    })
  })
}) 