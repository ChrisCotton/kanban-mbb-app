import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import KanbanBoard from './KanbanBoard'

// Mock the child components
jest.mock('./SwimLane', () => {
  return function MockSwimLane({ title, status, tasks, onTaskMove, color }: any) {
    return (
      <div data-testid={`swim-lane-${status}`}>
        <h2>{title}</h2>
        <div data-testid={`task-count-${status}`}>{tasks.length}</div>
        <div data-testid={`color-${color}`}>{color}</div>
        {tasks.map((task: any) => (
          <div key={task.id} data-testid={`task-${task.id}`}>
            {task.title}
          </div>
        ))}
        <button 
          onClick={() => onTaskMove('test-id', status, 0)}
          data-testid={`move-button-${status}`}
        >
          Move Task
        </button>
      </div>
    )
  }
})

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockTasks = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'Test description 1',
    status: 'backlog' as const,
    priority: 'high' as const,
    due_date: '2025-01-15',
    mbb_impact: 100,
    order_index: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'Test Task 2',
    description: 'Test description 2',
    status: 'todo' as const,
    priority: 'medium' as const,
    due_date: '2025-01-20',
    mbb_impact: 75,
    order_index: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '3',
    title: 'Test Task 3',
    description: 'Test description 3',
    status: 'doing' as const,
    priority: 'low' as const,
    due_date: '2025-01-25',
    mbb_impact: 50,
    order_index: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '4',
    title: 'Test Task 4',
    description: 'Test description 4',
    status: 'done' as const,
    priority: 'high' as const,
    due_date: '2025-01-10',
    mbb_impact: 200,
    order_index: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

describe('KanbanBoard', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<KanbanBoard />)
    
    expect(screen.getByText('Loading kanban board...')).toBeInTheDocument()
  })

  it('renders kanban board with all swim lanes after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTasks
      })
    } as Response)

    render(<KanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('Kanban Board')).toBeInTheDocument()
    })

    // Check all swim lanes are rendered
    expect(screen.getByTestId('swim-lane-backlog')).toBeInTheDocument()
    expect(screen.getByTestId('swim-lane-todo')).toBeInTheDocument()
    expect(screen.getByTestId('swim-lane-doing')).toBeInTheDocument()
    expect(screen.getByTestId('swim-lane-done')).toBeInTheDocument()

    // Check swim lane titles using more specific selectors
    expect(screen.getByTestId('swim-lane-backlog')).toHaveTextContent('Backlog')
    expect(screen.getByTestId('swim-lane-todo')).toHaveTextContent('To Do')
    expect(screen.getByTestId('swim-lane-doing')).toHaveTextContent('Doing')
    expect(screen.getByTestId('swim-lane-done')).toHaveTextContent('Done')
  })

  it('groups tasks by status correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTasks
      })
    } as Response)

    render(<KanbanBoard />)

    await waitFor(() => {
      expect(screen.getByTestId('task-count-backlog')).toHaveTextContent('1')
      expect(screen.getByTestId('task-count-todo')).toHaveTextContent('1')
      expect(screen.getByTestId('task-count-doing')).toHaveTextContent('1')
      expect(screen.getByTestId('task-count-done')).toHaveTextContent('1')
    })

    // Check specific tasks are in correct lanes
    expect(screen.getByTestId('task-1')).toBeInTheDocument()
    expect(screen.getByTestId('task-2')).toBeInTheDocument()
    expect(screen.getByTestId('task-3')).toBeInTheDocument()
    expect(screen.getByTestId('task-4')).toBeInTheDocument()
  })

  it('displays correct colors for each swim lane', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTasks
      })
    } as Response)

    render(<KanbanBoard />)

    await waitFor(() => {
      expect(screen.getByTestId('color-gray')).toHaveTextContent('gray')
      expect(screen.getByTestId('color-blue')).toHaveTextContent('blue')
      expect(screen.getByTestId('color-yellow')).toHaveTextContent('yellow')
      expect(screen.getByTestId('color-green')).toHaveTextContent('green')
    })
  })

  it('displays task statistics correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTasks
      })
    } as Response)

    render(<KanbanBoard />)

    await waitFor(() => {
      // Check statistics section using test ids
      expect(screen.getByTestId('task-count-backlog')).toHaveTextContent('1')
      expect(screen.getByTestId('task-count-todo')).toHaveTextContent('1')
      expect(screen.getByTestId('task-count-doing')).toHaveTextContent('1')
      expect(screen.getByTestId('task-count-done')).toHaveTextContent('1')
    })
  })

  it('handles task move operations', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTasks
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTasks
        })
      } as Response)

    render(<KanbanBoard />)

    await waitFor(() => {
      expect(screen.getByTestId('move-button-backlog')).toBeInTheDocument()
    })

    // Simulate task move
    fireEvent.click(screen.getByTestId('move-button-backlog'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/kanban/tasks/test-id/move',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'backlog',
            order_index: 0
          })
        })
      )
    })
  })

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    } as Response)

    render(<KanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Board')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch tasks: Internal Server Error')).toBeInTheDocument()
    })

    // Check retry button is present
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('retries fetching tasks when retry button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockTasks
        })
      } as Response)

    render(<KanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try Again'))

    await waitFor(() => {
      expect(screen.getByText('Kanban Board')).toBeInTheDocument()
    })
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<KanbanBoard />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Board')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('handles empty task list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    } as Response)

    render(<KanbanBoard />)

    await waitFor(() => {
      expect(screen.getByTestId('task-count-backlog')).toHaveTextContent('0')
      expect(screen.getByTestId('task-count-todo')).toHaveTextContent('0')
      expect(screen.getByTestId('task-count-doing')).toHaveTextContent('0')
      expect(screen.getByTestId('task-count-done')).toHaveTextContent('0')
    })
  })
}) 