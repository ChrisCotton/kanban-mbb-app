import React from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { MBBTimerSection } from '../../components/timer/MBBTimerSection'

jest.mock('../../lib/timer-integration', () => ({
  startTimerSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
  timerService: {
    endSession: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: 'cat-mbb', name: 'MBB DEVELOPMENT', hourly_rate_usd: 150, hourly_rate: 150, color: '#0ea5e9', is_active: true },
    ],
    loading: false,
    error: null,
    submitting: false,
    getCategoryById: (id: string) => (
      id === 'cat-mbb'
        ? { id: 'cat-mbb', name: 'MBB DEVELOPMENT', hourly_rate_usd: 150, hourly_rate: 150, color: '#0ea5e9', is_active: true }
        : undefined
    ),
  }),
}))

describe('REGRESSION: Multi-Timer Footer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
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

  const startTask = (rerender: ReturnType<typeof render>['rerender'], task: any) => {
    act(() => {
      rerender(<MBBTimerSection activeTask={task} userId="user-1" />)
    })
  }

  const parseCurrency = (value: string | null) => {
    if (!value) return 0
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''))
    return Number.isNaN(parsed) ? 0 : parsed
  }

  test('Start Timing should create a new timer row per task', () => {
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    expect(screen.queryByTestId('timer-row-task-a')).not.toBeInTheDocument()
    expect(screen.queryByTestId('timer-row-task-b')).not.toBeInTheDocument()

    startTask(rerender, taskA)
    expect(screen.getByTestId('timer-row-task-a')).toBeInTheDocument()

    startTask(rerender, taskB)
    expect(screen.getByTestId('timer-row-task-a')).toBeInTheDocument()
    expect(screen.getByTestId('timer-row-task-b')).toBeInTheDocument()
  })

  test('Starting the same task should not create duplicate timers', () => {
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    startTask(rerender, taskA)
    expect(screen.getAllByTestId(/timer-row-task-a/)).toHaveLength(1)

    startTask(rerender, taskA)
    expect(screen.getAllByTestId(/timer-row-task-a/)).toHaveLength(1)
  })

  test('Stop button should stop the correct timer', () => {
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    startTask(rerender, taskA)
    const timerRow = screen.getByTestId('timer-row-task-a')
    expect(timerRow).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    const timeBeforeStop = screen.getByTestId('timer-time-task-a').textContent

    const stopButton = screen.getByTestId('timer-task-a-stop')
    act(() => {
      fireEvent.click(stopButton)
    })

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    const timeAfterStop = screen.getByTestId('timer-time-task-a').textContent
    expect(timeAfterStop).toBe(timeBeforeStop)
  })

  test('Session total and task total should accrue from category rate', () => {
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    startTask(rerender, taskA)
    screen.getByTestId('timer-row-task-a')

    act(() => {
      jest.advanceTimersByTime(60000)
    })

    const sessionTotal = parseCurrency(screen.getByTestId('session-total').textContent)
    const taskTotal = parseCurrency(screen.getByTestId('timer-earnings-task-a').textContent)

    expect(sessionTotal).toBeGreaterThan(0)
    expect(taskTotal).toBeGreaterThan(0)
  })

  test('Timer row should resolve category name from category_id', () => {
    const taskWithCategoryId = {
      id: 'task-c',
      title: 'Task C',
      category_id: 'cat-mbb',
      category: undefined,
    }

    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    startTask(rerender, taskWithCategoryId)
    screen.getByTestId('timer-row-task-c')

    expect(screen.getByText('MBB DEVELOPMENT')).toBeInTheDocument()
    expect(screen.queryByText('No category')).not.toBeInTheDocument()
  })

  test('Delete button should remove the timer row', () => {
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    startTask(rerender, taskA)
    expect(screen.getByTestId('timer-row-task-a')).toBeInTheDocument()

    const deleteButton = screen.getByTestId('timer-task-a-delete')
    act(() => {
      fireEvent.click(deleteButton)
    })

    expect(screen.queryByTestId('timer-row-task-a')).not.toBeInTheDocument()
  })

  test('Global controls should pause, stop, reset, and delete all timers', () => {
    const { rerender } = render(
      <MBBTimerSection activeTask={null} userId="user-1" />
    )

    startTask(rerender, taskA)
    startTask(rerender, taskB)

    expect(screen.getByTestId('timer-row-task-a')).toBeInTheDocument()
    expect(screen.getByTestId('timer-row-task-b')).toBeInTheDocument()

    const timeBeforePauseA = screen.getByTestId('timer-time-task-a').textContent
    const timeBeforePauseB = screen.getByTestId('timer-time-task-b').textContent

    act(() => {
      fireEvent.click(screen.getByTestId('timer-global-pause'))
    })

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(screen.getByTestId('timer-time-task-a').textContent).toBe(timeBeforePauseA)
    expect(screen.getByTestId('timer-time-task-b').textContent).toBe(timeBeforePauseB)

    act(() => {
      fireEvent.click(screen.getByTestId('timer-global-stop'))
    })

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(screen.getByTestId('timer-time-task-a').textContent).toBe(timeBeforePauseA)
    expect(screen.getByTestId('timer-time-task-b').textContent).toBe(timeBeforePauseB)

    act(() => {
      fireEvent.click(screen.getByTestId('timer-global-reset'))
    })

    expect(screen.getByTestId('timer-time-task-a').textContent).toBe('00:00')
    expect(screen.getByTestId('timer-time-task-b').textContent).toBe('00:00')

    act(() => {
      fireEvent.click(screen.getByTestId('timer-global-delete'))
    })

    expect(screen.queryByTestId('timer-row-task-a')).not.toBeInTheDocument()
    expect(screen.queryByTestId('timer-row-task-b')).not.toBeInTheDocument()
  })
})
