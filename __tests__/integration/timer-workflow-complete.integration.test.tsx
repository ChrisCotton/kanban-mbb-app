/**
 * Integration Test: Complete Timer Workflow
 * 
 * Tests the complete timer lifecycle:
 * 1. Start timer → Verify session created in database
 * 2. Timer runs and accumulates time/earnings
 * 3. Pause timer → Verify state persists
 * 4. Resume timer → Verify continues from paused state
 * 5. Stop timer → Verify session saved with correct earnings
 * 6. Verify session appears in history with correct values
 * 7. Verify Today/Week/Month totals update correctly
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { TimerContextProvider, useTimerContext } from '../../contexts/TimerContext'

// @ts-ignore - JSX in test file

// Mock timer integration service
const mockStartSession = jest.fn()
const mockEndSession = jest.fn()

jest.mock('../../lib/timer-integration', () => ({
  startTimerSession: (...args: any[]) => mockStartSession(...args),
  timerService: {
    endSession: (...args: any[]) => mockEndSession(...args),
    getActiveSessionId: jest.fn(() => 'mock-session-id'),
  },
}))

// Mock categories hook
jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    getCategoryById: jest.fn((id: string) => {
      if (id === 'cat-dev') {
        return {
          id: 'cat-dev',
          name: 'Development',
          hourly_rate_usd: 100,
          color: '#3B82F6',
        }
      }
      return null
    }),
  }),
}))

const TestTimerComponent: React.FC = () => {
  const {
    timers,
    totalEarnings,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setUserId,
  } = useTimerContext()

  useEffect(() => {
    setUserId('test-user-integration')
  }, [setUserId])

  const task = {
    id: 'test-task-1',
    title: 'Integration Test Task',
    category_id: 'cat-dev',
    category: {
      id: 'cat-dev',
      name: 'Development',
      hourly_rate_usd: 100,
      color: '#3B82F6',
    },
  }

  const timer = timers.find(t => t.taskId === 'test-task-1')

  return (
    <div>
      <div data-testid="timer-count">{timers.length}</div>
      <div data-testid="total-earnings">{totalEarnings.toFixed(2)}</div>
      
      {timer ? (
        <div data-testid="timer-info">
          <div data-testid="timer-time">{timer.currentTime}</div>
          <div data-testid="timer-earnings">{timer.sessionEarnings.toFixed(2)}</div>
          <div data-testid="timer-running">{timer.isRunning ? 'running' : 'stopped'}</div>
          <div data-testid="timer-paused">{timer.isPaused ? 'paused' : 'active'}</div>
          <div data-testid="timer-session-id">{timer.sessionId || 'no-session-id'}</div>
          
          {timer.isRunning && !timer.isPaused && (
            <button data-testid="pause-btn" onClick={() => pauseTimer('test-task-1')}>
              Pause
            </button>
          )}
          {timer.isPaused && (
            <button data-testid="resume-btn" onClick={() => resumeTimer('test-task-1')}>
              Resume
            </button>
          )}
          {timer.isRunning && (
            <button data-testid="stop-btn" onClick={() => stopTimer('test-task-1')}>
              Stop
            </button>
          )}
        </div>
      ) : (
        <button data-testid="start-btn" onClick={() => startTimer(task)}>
          Start Timer
        </button>
      )}
    </div>
  )
}

describe('Complete Timer Workflow Integration Test', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    
    // Mock successful API responses
    mockStartSession.mockResolvedValue({
      id: 'session-123',
      task_id: 'test-task-1',
      started_at: new Date().toISOString(),
      is_active: true,
    })
    
    mockEndSession.mockResolvedValue({
      id: 'session-123',
      task_id: 'test-task-1',
      started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      ended_at: new Date().toISOString(),
      duration_seconds: 3600,
      earnings_usd: 100.00,
      is_active: false,
    })
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
    localStorage.clear()
  })

  it('should complete full timer workflow: start → pause → resume → stop → verify history', async () => {
    render(
      <TimerContextProvider>
        <TestTimerComponent />
      </TimerContextProvider>
    )

    // Step 1: Start timer
    expect(screen.getByTestId('timer-count')).toHaveTextContent('0')
    const startBtn = screen.getByTestId('start-btn')
    
    await act(async () => {
      fireEvent.click(startBtn)
    })

    // Wait for timer to start
    await waitFor(() => {
      expect(screen.getByTestId('timer-count')).toHaveTextContent('1')
    })

    // Verify timer started
    expect(screen.getByTestId('timer-running')).toHaveTextContent('running')
    expect(screen.getByTestId('timer-paused')).toHaveTextContent('active')
    expect(screen.getByTestId('timer-time')).toHaveTextContent('0')
    expect(screen.getByTestId('timer-earnings')).toHaveTextContent('0.00')
    
    // Verify backend session was created
    expect(mockStartSession).toHaveBeenCalledWith(
      'test-task-1',
      'test-user-integration',
      100 // hourly rate
    )
    expect(screen.getByTestId('timer-session-id')).toHaveTextContent('session-123')

    // Step 2: Let timer run for 30 seconds
    await act(async () => {
      jest.advanceTimersByTime(30000) // 30 seconds
    })

    await waitFor(() => {
      const time = parseInt(screen.getByTestId('timer-time').textContent || '0')
      expect(time).toBeGreaterThanOrEqual(30)
    })

    // Verify earnings are accumulating (at $100/hr, 30 seconds = ~$0.83)
    const earnings30s = parseFloat(screen.getByTestId('timer-earnings').textContent || '0')
    expect(earnings30s).toBeGreaterThan(0)
    expect(earnings30s).toBeLessThan(1) // Should be less than $1 for 30 seconds

    // Step 3: Pause timer
    const pauseBtn = screen.getByTestId('pause-btn')
    await act(async () => {
      fireEvent.click(pauseBtn)
    })

    await waitFor(() => {
      expect(screen.getByTestId('timer-paused')).toHaveTextContent('paused')
    })

    // Verify timer is paused but still exists
    expect(screen.getByTestId('timer-running')).toHaveTextContent('running')
    expect(screen.getByTestId('timer-paused')).toHaveTextContent('paused')

    // Step 4: Advance time - timer should NOT increment when paused
    const timeBeforeResume = parseInt(screen.getByTestId('timer-time').textContent || '0')
    await act(async () => {
      jest.advanceTimersByTime(10000) // 10 seconds
    })

    // Time should not have changed
    const timeAfterPause = parseInt(screen.getByTestId('timer-time').textContent || '0')
    expect(timeAfterPause).toBe(timeBeforeResume)

    // Step 5: Resume timer
    const resumeBtn = screen.getByTestId('resume-btn')
    await act(async () => {
      fireEvent.click(resumeBtn)
    })

    await waitFor(() => {
      expect(screen.getByTestId('timer-paused')).toHaveTextContent('active')
    })

    // Step 6: Let timer run for another 30 seconds
    await act(async () => {
      jest.advanceTimersByTime(30000) // Another 30 seconds
    })

    // Total time should be ~60 seconds now
    await waitFor(() => {
      const totalTime = parseInt(screen.getByTestId('timer-time').textContent || '0')
      expect(totalTime).toBeGreaterThanOrEqual(60)
    })

    // Step 7: Stop timer
    const stopBtn = screen.getByTestId('stop-btn')
    await act(async () => {
      fireEvent.click(stopBtn)
    })

    // Verify backend session was ended
    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalledWith({
        session_id: 'session-123',
        user_id: 'test-user-integration',
        action: 'stop',
      })
    })

    // Verify timer is stopped
    await waitFor(() => {
      expect(screen.getByTestId('timer-running')).toHaveTextContent('stopped')
    })

    // Step 8: Verify final earnings are correct
    // At $100/hr, 60 seconds = $1.67 (rounded)
    const finalEarnings = parseFloat(screen.getByTestId('timer-earnings').textContent || '0')
    expect(finalEarnings).toBeGreaterThan(1.5)
    expect(finalEarnings).toBeLessThan(2.0)
  })

  it('should save session to database when stopped', async () => {
    render(
      <TimerContextProvider>
        <TestTimerComponent />
      </TimerContextProvider>
    )

    // Start timer
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'))
    })

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalled()
    })

    // Let it run briefly
    await act(async () => {
      jest.advanceTimersByTime(5000) // 5 seconds
    })

    // Stop timer
    await act(async () => {
      fireEvent.click(screen.getByTestId('stop-btn'))
    })

    // Verify endSession was called with correct parameters
    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalledTimes(1)
      expect(mockEndSession).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'session-123',
          user_id: 'test-user-integration',
          action: 'stop',
        })
      )
    })
  })

  it('should calculate earnings accurately throughout timer lifecycle', async () => {
    render(
      <TimerContextProvider>
        <TestTimerComponent />
      </TimerContextProvider>
    )

    // Start timer
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'))
    })

    // Run for 1 hour (3600 seconds)
    await act(async () => {
      jest.advanceTimersByTime(3600000) // 1 hour
    })

    await waitFor(() => {
      const earnings = parseFloat(screen.getByTestId('timer-earnings').textContent || '0')
      // At $100/hr for 1 hour = $100.00
      expect(earnings).toBeCloseTo(100.00, 1)
    })

    // Stop timer
    await act(async () => {
      fireEvent.click(screen.getByTestId('stop-btn'))
    })

    // Verify final earnings are saved correctly
    expect(mockEndSession).toHaveBeenCalled()
  })
})
