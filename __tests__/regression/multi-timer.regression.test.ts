import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MBBTimerSection } from '../../components/timer/MBBTimerSection'

jest.mock('../../lib/timer-integration', () => ({
  startTimerSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
  timerService: {
    endSession: jest.fn().mockResolvedValue({}),
  },
}))

describe('REGRESSION: Multi-Timer Footer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const taskA = {
    id: 'task-a',
    title: 'Task A',
    category: { id: 'cat-a', name: 'Dev', hourly_rate_usd: 120 },
  }

  const taskB = {
    id: 'task-b',
    title: 'Task B',
    category: { id: 'cat-b', name: 'Ops', hourly_rate_usd: 80 },
  }

  test('Start Timing should create a new timer row per task', async () => {
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    expect(screen.queryByTestId('timer-row-task-a')).not.toBeInTheDocument()
    expect(screen.queryByTestId('timer-row-task-b')).not.toBeInTheDocument()

    rerender(<MBBTimerSection activeTask={taskA} userId="user-1" />)
    expect(await screen.findByTestId('timer-row-task-a')).toBeInTheDocument()

    rerender(<MBBTimerSection activeTask={taskB} userId="user-1" />)
    expect(await screen.findByTestId('timer-row-task-a')).toBeInTheDocument()
    expect(await screen.findByTestId('timer-row-task-b')).toBeInTheDocument()
  })

  test('Starting the same task should not create duplicate timers', async () => {
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    rerender(<MBBTimerSection activeTask={taskA} userId="user-1" />)
    expect(await screen.findAllByTestId(/timer-row-task-a/)).toHaveLength(1)

    rerender(<MBBTimerSection activeTask={taskA} userId="user-1" />)
    expect(await screen.findAllByTestId(/timer-row-task-a/)).toHaveLength(1)
  })

  test('Stop button should stop the correct timer', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    rerender(<MBBTimerSection activeTask={taskA} userId="user-1" />)
    const timerRow = await screen.findByTestId('timer-row-task-a')
    expect(timerRow).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    const timeBeforeStop = screen.getByTestId('timer-time-task-a').textContent

    const stopButton = screen.getByTestId('timer-stop-task-a')
    await user.click(stopButton)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    const timeAfterStop = screen.getByTestId('timer-time-task-a').textContent
    expect(timeAfterStop).toBe(timeBeforeStop)
  })
})
