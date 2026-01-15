import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MBBTimerSection } from './MBBTimerSection'

jest.mock('../../hooks/useMultiTimer', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockUseMultiTimer = require('../../hooks/useMultiTimer').default

describe('MBBTimerSection (Multi-Timer)', () => {
  const mockTimers = [
    {
      task: {
        id: 'task-1',
        title: 'Test Task',
        category: { id: 'cat-1', name: 'Development', hourly_rate_usd: 75 },
      },
      taskId: 'task-1',
      currentTime: 65,
      isRunning: true,
      isPaused: false,
      sessionEarnings: 1.35,
    },
  ]

  const mockHook = {
    timers: mockTimers,
    totalEarnings: 1.35,
    totalActiveTimers: 1,
    startTimer: jest.fn(),
    pauseTimer: jest.fn(),
    resumeTimer: jest.fn(),
    stopTimer: jest.fn(),
    resetTimer: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMultiTimer.mockReturnValue(mockHook)
  })

  it('renders total earnings and active timer count', () => {
    render(<MBBTimerSection />)
    expect(screen.getByText('$1.35')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders timer row details', () => {
    render(<MBBTimerSection />)
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByTestId('timer-time-task-1')).toBeInTheDocument()
  })

  it('stop button triggers stopTimer for the correct task', async () => {
    const user = userEvent.setup()
    render(<MBBTimerSection />)

    const stopButton = screen.getByTestId('timer-task-1-stop')
    await user.click(stopButton)

    expect(mockHook.stopTimer).toHaveBeenCalledWith('task-1')
  })
})
