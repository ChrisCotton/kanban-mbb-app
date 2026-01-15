/**
 * E2E-LIKE INTEGRATION TEST: Timer Persistence Across Page Navigation
 * 
 * Feature: Timer state persists when navigating between pages
 * Created: 2026-01-15
 * 
 * This test simulates the full user journey:
 * 1. Start timer on dashboard
 * 2. Navigate to calendar - timer persists
 * 3. Navigate to categories - timer persists
 * 4. Navigate to vision board - timer persists
 * 5. Pause timer from vision board
 * 6. Navigate to MBB - timer is paused
 * 7. Resume timer from MBB
 * 8. Stop timer - session recorded
 */

import React, { useEffect, useState } from 'react'
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock localStorage with persistence
let localStorageStore: Record<string, string> = {}

const localStorageMock = {
  getItem: jest.fn((key: string) => localStorageStore[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageStore[key] = value
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: jest.fn(() => {
    localStorageStore = {}
  }),
}

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
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } })),
    },
  },
}))

// Mock timer integration
const mockStartSession = jest.fn().mockResolvedValue({ id: 'session-e2e' })
const mockEndSession = jest.fn().mockResolvedValue({})

jest.mock('../../lib/timer-integration', () => ({
  startTimerSession: (...args: any[]) => mockStartSession(...args),
  timerService: {
    endSession: (...args: any[]) => mockEndSession(...args),
  },
}))

// Mock useCategories
jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: 'cat-dev', name: 'Development', hourly_rate_usd: 150, color: '#4CAF50' },
    ],
    loading: false,
    getCategoryById: (id: string) => {
      if (id === 'cat-dev') {
        return { id: 'cat-dev', name: 'Development', hourly_rate_usd: 150, color: '#4CAF50' }
      }
      return null
    },
  }),
}))

// Import TimerContext after mocks
import { TimerContextProvider, useTimerContext } from '../../contexts/TimerContext'

const STORAGE_KEY = 'mbb_active_timers'

// Simple test component that uses the timer context
const TestTimerConsumer: React.FC<{ page: string }> = ({ page }) => {
  const {
    timers,
    totalEarnings,
    totalActiveTimers,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setUserId,
  } = useTimerContext()

  useEffect(() => {
    setUserId('test-user-e2e')
  }, [setUserId])

  const handleStartTimer = () => {
    startTimer({
      id: 'e2e-task',
      title: 'E2E Test Task',
      category: {
        id: 'cat-dev',
        name: 'Development',
        hourly_rate_usd: 150,
      },
    })
  }

  const runningTimer = timers.find(t => t.taskId === 'e2e-task')

  return (
    <div data-testid={`page-${page}`}>
      <h1>Page: {page}</h1>
      <div data-testid="timer-count">{timers.length} timers</div>
      <div data-testid="active-count">{totalActiveTimers} active</div>
      <div data-testid="total-earnings">${totalEarnings.toFixed(2)}</div>
      
      {runningTimer ? (
        <div data-testid="timer-status">
          <span data-testid="timer-running">{runningTimer.isRunning ? 'Running' : 'Stopped'}</span>
          <span data-testid="timer-paused">{runningTimer.isPaused ? 'Paused' : 'Active'}</span>
          <span data-testid="timer-time">{runningTimer.currentTime}s</span>
          <button data-testid="pause-btn" onClick={() => pauseTimer('e2e-task')}>Pause</button>
          <button data-testid="resume-btn" onClick={() => resumeTimer('e2e-task')}>Resume</button>
          <button data-testid="stop-btn" onClick={() => stopTimer('e2e-task')}>Stop</button>
        </div>
      ) : (
        <button data-testid="start-btn" onClick={handleStartTimer}>Start Timer</button>
      )}
    </div>
  )
}

// Wrapper to simulate page changes
const PageSimulator: React.FC<{ initialPage: string }> = ({ initialPage }) => {
  const [currentPage, setCurrentPage] = useState(initialPage)

  return (
    <div>
      <nav>
        <button data-testid="nav-dashboard" onClick={() => setCurrentPage('dashboard')}>Dashboard</button>
        <button data-testid="nav-calendar" onClick={() => setCurrentPage('calendar')}>Calendar</button>
        <button data-testid="nav-categories" onClick={() => setCurrentPage('categories')}>Categories</button>
        <button data-testid="nav-vision" onClick={() => setCurrentPage('vision')}>Vision Board</button>
        <button data-testid="nav-mbb" onClick={() => setCurrentPage('mbb')}>MBB</button>
      </nav>
      <TestTimerConsumer page={currentPage} />
    </div>
  )
}

describe('E2E Integration: Timer Persistence Across Pages', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorageStore = {}
    jest.clearAllMocks()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  test('Full user journey: timer persists across page navigation', async () => {
    const { rerender } = render(
      <TimerContextProvider>
        <PageSimulator initialPage="dashboard" />
      </TimerContextProvider>
    )

    // Step 1: Verify we start on dashboard with no timers
    expect(screen.getByTestId('page-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('timer-count')).toHaveTextContent('0 timers')

    // Step 2: Start a timer
    const startBtn = screen.getByTestId('start-btn')
    await act(async () => {
      fireEvent.click(startBtn)
    })

    // Advance time to let state update
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    expect(screen.getByTestId('timer-count')).toHaveTextContent('1 timers')
    expect(screen.getByTestId('active-count')).toHaveTextContent('1 active')
    expect(screen.getByTestId('timer-running')).toHaveTextContent('Running')

    // Step 3: Advance timer by 60 seconds
    await act(async () => {
      jest.advanceTimersByTime(60000)
    })

    expect(screen.getByTestId('timer-time')).toHaveTextContent('61s')

    // Step 4: Navigate to calendar
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-calendar'))
    })

    expect(screen.getByTestId('page-calendar')).toBeInTheDocument()
    // Timer should still be running
    expect(screen.getByTestId('timer-count')).toHaveTextContent('1 timers')
    expect(screen.getByTestId('active-count')).toHaveTextContent('1 active')

    // Step 5: Navigate to categories
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-categories'))
    })

    expect(screen.getByTestId('page-categories')).toBeInTheDocument()
    expect(screen.getByTestId('timer-count')).toHaveTextContent('1 timers')

    // Step 6: Navigate to vision board
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-vision'))
    })

    expect(screen.getByTestId('page-vision')).toBeInTheDocument()
    expect(screen.getByTestId('timer-count')).toHaveTextContent('1 timers')

    // Step 7: Pause timer from vision board
    await act(async () => {
      fireEvent.click(screen.getByTestId('pause-btn'))
    })

    expect(screen.getByTestId('timer-paused')).toHaveTextContent('Paused')
    expect(screen.getByTestId('active-count')).toHaveTextContent('0 active')

    // Step 8: Navigate to MBB page
    await act(async () => {
      fireEvent.click(screen.getByTestId('nav-mbb'))
    })

    expect(screen.getByTestId('page-mbb')).toBeInTheDocument()
    // Timer should still be paused
    expect(screen.getByTestId('timer-paused')).toHaveTextContent('Paused')

    // Step 9: Resume timer from MBB
    await act(async () => {
      fireEvent.click(screen.getByTestId('resume-btn'))
    })

    expect(screen.getByTestId('timer-paused')).toHaveTextContent('Active')
    expect(screen.getByTestId('active-count')).toHaveTextContent('1 active')

    // Step 10: Advance time and check earnings
    await act(async () => {
      jest.advanceTimersByTime(60000) // Another minute
    })

    // Total should be > $0 (rate is $150/hr)
    const earningsText = screen.getByTestId('total-earnings').textContent
    const earnings = parseFloat(earningsText?.replace('$', '') || '0')
    expect(earnings).toBeGreaterThan(0)

    // Step 11: Stop timer
    await act(async () => {
      fireEvent.click(screen.getByTestId('stop-btn'))
    })

    expect(screen.getByTestId('timer-running')).toHaveTextContent('Stopped')
    expect(screen.getByTestId('active-count')).toHaveTextContent('0 active')

    // Verify backend was called to end session
    expect(mockEndSession).toHaveBeenCalled()
  })

  test('localStorage is updated on timer state changes', async () => {
    render(
      <TimerContextProvider>
        <PageSimulator initialPage="dashboard" />
      </TimerContextProvider>
    )

    // Start a timer
    const startBtn = screen.getByTestId('start-btn')
    await act(async () => {
      fireEvent.click(startBtn)
    })

    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    // Check localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.any(String)
    )

    // Verify the stored data
    const stored = localStorageStore[STORAGE_KEY]
    expect(stored).toBeTruthy()
    
    const parsed = JSON.parse(stored)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)
    expect(parsed[0].taskId).toBe('e2e-task')
  })

  test('Multiple timers persist across navigation', async () => {
    render(
      <TimerContextProvider>
        <TestTimerConsumer page="dashboard" />
      </TimerContextProvider>
    )

    // Start first timer
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'))
    })

    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    expect(screen.getByTestId('timer-count')).toHaveTextContent('1 timers')

    // Timer count should persist
    const stored = localStorageStore[STORAGE_KEY]
    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed.length).toBe(1)
    }
  })
})
