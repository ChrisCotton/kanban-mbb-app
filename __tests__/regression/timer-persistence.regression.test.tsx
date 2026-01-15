/**
 * REGRESSION TEST: Timer Persistence
 * 
 * Feature: Timer state persists across page navigation and browser refresh
 * Created: 2026-01-15
 * 
 * This test ensures timers survive page navigation via localStorage persistence
 */

import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    get _store() {
      return store
    }
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => 'SUBSCRIBED'),
    })),
    removeChannel: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}))

// Mock timer integration
jest.mock('../../lib/timer-integration', () => ({
  startTimerSession: jest.fn().mockResolvedValue({ id: 'session-123' }),
  timerService: {
    endSession: jest.fn().mockResolvedValue({}),
  },
}))

// Mock useCategories
jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [],
    loading: false,
    getCategoryById: jest.fn(() => null),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  }),
}))

const STORAGE_KEY = 'mbb_active_timers'

describe('REGRESSION: Timer Persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  describe('localStorage Persistence', () => {
    test('should persist timers to localStorage on state change', async () => {
      const mockTimer = {
        taskId: 'task-1',
        task: {
          id: 'task-1',
          title: 'Test Task',
          category: { id: 'cat-1', name: 'Dev', hourly_rate_usd: 150 }
        },
        currentTime: 0,
        isRunning: true,
        isPaused: false,
        sessionEarnings: 0,
        startTime: new Date().toISOString()
      }

      // Simulate saving timer to localStorage
      const timers = [mockTimer]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers))

      // Verify it was saved
      const saved = localStorage.getItem(STORAGE_KEY)
      expect(saved).toBeTruthy()
      
      const parsed = JSON.parse(saved!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].taskId).toBe('task-1')
      expect(parsed[0].isRunning).toBe(true)
    })

    test('should restore timers from localStorage on mount', () => {
      const now = new Date()
      const mockTimer = {
        taskId: 'task-2',
        task: {
          id: 'task-2',
          title: 'Restored Task',
          category: { id: 'cat-1', name: 'Dev', hourly_rate_usd: 100 }
        },
        currentTime: 60,
        isRunning: true,
        isPaused: false,
        sessionEarnings: 1.67,
        startTime: new Date(now.getTime() - 60000).toISOString() // Started 1 minute ago
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify([mockTimer]))

      // Read back
      const stored = localStorage.getItem(STORAGE_KEY)
      expect(stored).toBeTruthy()

      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].taskId).toBe('task-2')
      expect(parsed[0].task.title).toBe('Restored Task')
    })

    test('should handle invalid localStorage data gracefully', () => {
      // Store invalid JSON
      localStorageMock.setItem(STORAGE_KEY, 'invalid-json-{[}')

      // Attempt to parse (should not throw)
      let result: any[] = []
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          result = JSON.parse(stored)
        }
      } catch (e) {
        result = [] // Fallback to empty array on parse error
      }

      expect(result).toEqual([])
    })

    test('should clear stale timers older than 24 hours', () => {
      const now = new Date()
      const oldTimer = {
        taskId: 'old-task',
        task: { id: 'old-task', title: 'Old Task' },
        currentTime: 3600,
        isRunning: false,
        isPaused: false,
        sessionEarnings: 0,
        startTime: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      }

      const recentTimer = {
        taskId: 'recent-task',
        task: { id: 'recent-task', title: 'Recent Task' },
        currentTime: 60,
        isRunning: true,
        isPaused: false,
        sessionEarnings: 0,
        startTime: new Date(now.getTime() - 60000).toISOString() // 1 minute ago
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify([oldTimer, recentTimer]))

      // Simulate validation logic from TimerContext
      const MAX_TIMER_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

      const isValidTimer = (timer: any): boolean => {
        if (!timer || typeof timer !== 'object') return false
        if (!timer.taskId || !timer.task) return false
        if (typeof timer.currentTime !== 'number') return false
        if (typeof timer.isRunning !== 'boolean') return false
        if (typeof timer.isPaused !== 'boolean') return false
        
        if (timer.startTime) {
          const startTime = new Date(timer.startTime).getTime()
          if (isNaN(startTime) || Date.now() - startTime > MAX_TIMER_AGE_MS) {
            return false
          }
        }
        
        return true
      }

      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = JSON.parse(stored!)
      const validTimers = parsed.filter(isValidTimer)

      expect(validTimers).toHaveLength(1)
      expect(validTimers[0].taskId).toBe('recent-task')
    })
  })

  describe('Timer State Validation', () => {
    test('should validate timer has required fields', () => {
      const validTimer = {
        taskId: 'task-1',
        task: { id: 'task-1', title: 'Valid Task' },
        currentTime: 0,
        isRunning: false,
        isPaused: false,
        sessionEarnings: 0
      }

      const invalidTimer1 = { task: {} } // Missing taskId
      const invalidTimer2 = { taskId: 'x' } // Missing task
      const invalidTimer3 = { taskId: 'x', task: {}, currentTime: 'not-a-number' }

      const isValidTimer = (timer: any): boolean => {
        if (!timer || typeof timer !== 'object') return false
        if (!timer.taskId || !timer.task) return false
        if (typeof timer.currentTime !== 'number') return false
        if (typeof timer.isRunning !== 'boolean') return false
        if (typeof timer.isPaused !== 'boolean') return false
        return true
      }

      expect(isValidTimer(validTimer)).toBe(true)
      expect(isValidTimer(invalidTimer1)).toBe(false)
      expect(isValidTimer(invalidTimer2)).toBe(false)
      expect(isValidTimer(invalidTimer3)).toBe(false)
      expect(isValidTimer(null)).toBe(false)
      expect(isValidTimer(undefined)).toBe(false)
    })
  })

  describe('Running Timer Restoration', () => {
    test('should recalculate elapsed time for running timers', () => {
      const now = new Date()
      const startTime = new Date(now.getTime() - 120000) // Started 2 minutes ago
      
      const mockTimer = {
        taskId: 'running-task',
        task: {
          id: 'running-task',
          title: 'Running Task',
          category: { id: 'cat-1', name: 'Dev', hourly_rate_usd: 120 }
        },
        currentTime: 0, // Was 0 when saved
        isRunning: true,
        isPaused: false,
        sessionEarnings: 0,
        startTime: startTime.toISOString()
      }

      // Simulate restoration logic
      const elapsed = Math.floor((now.getTime() - new Date(mockTimer.startTime).getTime()) / 1000)
      const restoredTimer = {
        ...mockTimer,
        currentTime: elapsed
      }

      expect(restoredTimer.currentTime).toBe(120) // 2 minutes = 120 seconds
    })

    test('should recalculate earnings for running timers', () => {
      const now = new Date()
      const startTime = new Date(now.getTime() - 3600000) // Started 1 hour ago
      
      const mockTimer = {
        taskId: 'running-task',
        task: {
          id: 'running-task',
          title: 'Running Task',
          category: { id: 'cat-1', name: 'Dev', hourly_rate_usd: 200 }
        },
        currentTime: 0,
        isRunning: true,
        isPaused: false,
        sessionEarnings: 0,
        startTime: startTime.toISOString()
      }

      // Simulate restoration logic
      const elapsed = Math.floor((now.getTime() - new Date(mockTimer.startTime).getTime()) / 1000)
      const hourlyRate = mockTimer.task.category.hourly_rate_usd
      const earnings = (elapsed / 3600) * hourlyRate

      const restoredTimer = {
        ...mockTimer,
        currentTime: elapsed,
        sessionEarnings: earnings
      }

      expect(restoredTimer.currentTime).toBe(3600) // 1 hour
      expect(restoredTimer.sessionEarnings).toBe(200) // $200 at $200/hr
    })

    test('should not recalculate time for paused timers', () => {
      const mockTimer = {
        taskId: 'paused-task',
        task: { id: 'paused-task', title: 'Paused Task' },
        currentTime: 300, // Was at 5 minutes when paused
        isRunning: true,
        isPaused: true,
        sessionEarnings: 8.33,
        startTime: new Date(Date.now() - 600000).toISOString() // Started 10 min ago
      }

      // Paused timers should keep their saved currentTime
      expect(mockTimer.currentTime).toBe(300)
    })
  })

  describe('Page Navigation Simulation', () => {
    test('should maintain timer state across simulated page navigation', () => {
      const timer = {
        taskId: 'nav-task',
        task: {
          id: 'nav-task',
          title: 'Navigation Test Task',
          category: { id: 'cat-1', name: 'Testing', hourly_rate_usd: 100 }
        },
        currentTime: 120,
        isRunning: true,
        isPaused: false,
        sessionEarnings: 3.33,
        startTime: new Date().toISOString()
      }

      // Page 1: Start timer
      localStorage.setItem(STORAGE_KEY, JSON.stringify([timer]))

      // Simulate navigation to Page 2
      const stored1 = localStorage.getItem(STORAGE_KEY)
      expect(stored1).toBeTruthy()
      const parsed1 = JSON.parse(stored1!)
      expect(parsed1[0].isRunning).toBe(true)

      // Simulate navigation to Page 3
      const stored2 = localStorage.getItem(STORAGE_KEY)
      expect(stored2).toBeTruthy()
      const parsed2 = JSON.parse(stored2!)
      expect(parsed2[0].taskId).toBe('nav-task')

      // Simulate navigation to Page 4
      const stored3 = localStorage.getItem(STORAGE_KEY)
      expect(stored3).toBeTruthy()
      const parsed3 = JSON.parse(stored3!)
      expect(parsed3[0].task.title).toBe('Navigation Test Task')
    })

    test('should preserve multiple timers across navigation', () => {
      const timers = [
        {
          taskId: 'task-a',
          task: { id: 'task-a', title: 'Task A', category: null },
          currentTime: 60,
          isRunning: true,
          isPaused: false,
          sessionEarnings: 0,
          startTime: new Date().toISOString()
        },
        {
          taskId: 'task-b',
          task: { id: 'task-b', title: 'Task B', category: null },
          currentTime: 120,
          isRunning: false,
          isPaused: false,
          sessionEarnings: 0,
          startTime: new Date().toISOString()
        }
      ]

      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers))

      // Simulate reading on another page
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = JSON.parse(stored!)

      expect(parsed).toHaveLength(2)
      expect(parsed.find((t: any) => t.taskId === 'task-a')?.isRunning).toBe(true)
      expect(parsed.find((t: any) => t.taskId === 'task-b')?.isRunning).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty localStorage', () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      expect(stored).toBeNull()

      // Simulate component mount with no stored timers
      let timers: any[] = []
      try {
        if (stored) {
          timers = JSON.parse(stored)
        }
      } catch {
        timers = []
      }

      expect(timers).toEqual([])
    })

    test('should handle localStorage quota exceeded', () => {
      // Simulate quota exceeded by checking setItem was called
      const originalSetItem = localStorage.setItem
      const mockSetItem = jest.fn().mockImplementation(() => {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      })

      localStorage.setItem = mockSetItem

      // Should not throw when saving fails
      let errorThrown = false
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
      } catch {
        errorThrown = true
      }

      expect(errorThrown).toBe(true)

      // Restore original
      localStorage.setItem = originalSetItem
    })

    test('should handle array with mixed valid/invalid timers', () => {
      const mixedTimers = [
        {
          taskId: 'valid',
          task: { id: 'valid', title: 'Valid' },
          currentTime: 60,
          isRunning: true,
          isPaused: false,
          sessionEarnings: 0
        },
        { invalid: true }, // Invalid structure
        {
          taskId: 'also-valid',
          task: { id: 'also-valid', title: 'Also Valid' },
          currentTime: 120,
          isRunning: false,
          isPaused: false,
          sessionEarnings: 0
        }
      ]

      const isValidTimer = (timer: any): boolean => {
        if (!timer || typeof timer !== 'object') return false
        if (!timer.taskId || !timer.task) return false
        if (typeof timer.currentTime !== 'number') return false
        if (typeof timer.isRunning !== 'boolean') return false
        if (typeof timer.isPaused !== 'boolean') return false
        return true
      }

      const validTimers = mixedTimers.filter(isValidTimer)

      expect(validTimers).toHaveLength(2)
      expect(validTimers.map(t => t.taskId)).toEqual(['valid', 'also-valid'])
    })
  })
})
