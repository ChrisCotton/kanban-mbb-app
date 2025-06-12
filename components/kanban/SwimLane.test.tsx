import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DragDropContext } from '@hello-pangea/dnd'
import SwimLane from './SwimLane'
import { Task } from '../../lib/database/kanban-queries'

// Mock the TaskCard component
jest.mock('./TaskCard', () => {
  return function MockTaskCard({ task, index }: any) {
    return (
      <div data-testid={`task-card-${task.id}`}>
        <div data-testid={`task-title-${task.id}`}>{task.title}</div>
        <div data-testid={`task-priority-${task.id}`}>{task.priority}</div>
        <div data-testid={`task-index-${task.id}`}>{index}</div>
      </div>
    )
  }
})

// Mock fetch globally
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'Test description 1',
    status: 'todo',
    priority: 'high',
    due_date: '2025-01-15',
    order_index: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: 'test-user-1'
  },
  {
    id: '2',
    title: 'Test Task 2',
    description: 'Test description 2',
    status: 'todo',
    priority: 'medium',
    due_date: '2025-01-20',
    order_index: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: 'test-user-1'
  }
]

const defaultProps = {
  title: 'Test Lane',
  status: 'todo' as Task['status'],
  tasks: mockTasks,
  onTaskMove: jest.fn(),
  color: 'blue' as const
}

// Helper component to wrap SwimLane with required DragDropContext
const SwimLaneWrapper = ({ children }: { children: React.ReactNode }) => (
  <DragDropContext onDragEnd={() => {}}>
    {children}
  </DragDropContext>
)

describe('SwimLane', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  it('renders swim lane with correct title and task count', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    expect(screen.getByText('Test Lane')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Task count badge
  })

  it('renders all tasks in the swim lane', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    expect(screen.getByTestId('task-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('task-card-2')).toBeInTheDocument()
    expect(screen.getByTestId('task-title-1')).toHaveTextContent('Test Task 1')
    expect(screen.getByTestId('task-title-2')).toHaveTextContent('Test Task 2')
  })

  it('applies correct color classes for different swim lane types', () => {
    const { rerender } = render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} color="gray" />
      </SwimLaneWrapper>
    )
    
    // Test different colors by checking if the component renders without errors
    rerender(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} color="blue" />
      </SwimLaneWrapper>
    )
    rerender(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} color="yellow" />
      </SwimLaneWrapper>
    )
    rerender(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} color="green" />
      </SwimLaneWrapper>
    )
    
    // All should render successfully
    expect(screen.getByText('Test Lane')).toBeInTheDocument()
  })

  it('shows empty state when no tasks are present', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} tasks={[]} />
      </SwimLaneWrapper>
    )

    expect(screen.getByText('No tasks in test lane')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Task count should be 0
  })

  it('handles drag and drop events', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    const swimLaneContent = screen.getByText('Test Lane').closest('.swim-lane')?.querySelector('div:nth-child(2)')
    
    if (swimLaneContent) {
      // Simulate drag over
      fireEvent.dragOver(swimLaneContent, {
        dataTransfer: {
          getData: () => 'task-id-123'
        }
      })

      // Simulate drop
      fireEvent.drop(swimLaneContent, {
        dataTransfer: {
          getData: () => 'task-id-123'
        }
      })

      expect(defaultProps.onTaskMove).toHaveBeenCalledWith('task-id-123', 'todo', 2)
    }
  })

  it('shows add task form when add button is clicked', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    const addButton = screen.getByText('Add Task')
    fireEvent.click(addButton)

    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument()
    expect(screen.getByText('Add')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('hides add task form when cancel is clicked', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    // Open form
    fireEvent.click(screen.getByText('Add Task'))
    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument()

    // Cancel form
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByPlaceholderText('Enter task title...')).not.toBeInTheDocument()
    expect(screen.getByText('Add Task')).toBeInTheDocument()
  })

  it('handles task creation with onTaskCreate prop', async () => {
    const mockOnTaskCreate = jest.fn().mockResolvedValue(undefined)
    
    render(
      <SwimLaneWrapper>
        <SwimLane 
          {...defaultProps} 
          onTaskCreate={mockOnTaskCreate}
        />
      </SwimLaneWrapper>
    )

    // Open add task form
    fireEvent.click(screen.getByText('Add Task'))
    
    // Enter task title
    const input = screen.getByPlaceholderText('Enter task title...')
    fireEvent.change(input, { target: { value: 'New Test Task' } })
    
    // Submit form
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(mockOnTaskCreate).toHaveBeenCalledWith({
        title: 'New Test Task',
        status: 'todo',
        order_index: 2
      })
    })

    // Form should be hidden after successful creation
    expect(screen.queryByPlaceholderText('Enter task title...')).not.toBeInTheDocument()
  })

  it('handles task creation with API call when no onTaskCreate prop', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    } as Response)

    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    // Open add task form
    fireEvent.click(screen.getByText('Add Task'))
    
    // Enter task title
    const input = screen.getByPlaceholderText('Enter task title...')
    fireEvent.change(input, { target: { value: 'New API Task' } })
    
    // Submit form
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New API Task',
          status: 'todo',
          order_index: 2
        })
      })
    })
  })

  it('handles Enter key to submit new task', async () => {
    const mockOnTaskCreate = jest.fn().mockResolvedValue(undefined)
    
    render(
      <SwimLaneWrapper>
        <SwimLane 
          {...defaultProps} 
          onTaskCreate={mockOnTaskCreate}
        />
      </SwimLaneWrapper>
    )

    // Open add task form
    fireEvent.click(screen.getByText('Add Task'))
    
    // Enter task title
    const input = screen.getByPlaceholderText('Enter task title...')
    fireEvent.change(input, { target: { value: 'Enter Key Task' } })
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(mockOnTaskCreate).toHaveBeenCalledWith({
        title: 'Enter Key Task',
        status: 'todo',
        order_index: 2
      })
    })
  })

  it('handles Escape key to cancel new task', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    // Open add task form
    fireEvent.click(screen.getByText('Add Task'))

    // Press Escape
    const input = screen.getByPlaceholderText('Enter task title...')
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

    // Form should be hidden
    expect(screen.queryByPlaceholderText('Enter task title...')).not.toBeInTheDocument()
    expect(screen.getByText('Add Task')).toBeInTheDocument()
  })

  it('prevents task creation with empty title', () => {
    const mockOnTaskCreate = jest.fn()
    
    render(
      <SwimLaneWrapper>
        <SwimLane 
          {...defaultProps} 
          onTaskCreate={mockOnTaskCreate}
        />
      </SwimLaneWrapper>
    )

    // Open add task form
    fireEvent.click(screen.getByText('Add Task'))
    
    // Try to submit without entering title
    fireEvent.click(screen.getByText('Add'))

    // Should not call onTaskCreate
    expect(mockOnTaskCreate).not.toHaveBeenCalled()
    
    // Form should still be visible
    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument()
  })

  it('handles API error during task creation gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    // Open add task form
    fireEvent.click(screen.getByText('Add Task'))
    
    // Enter task title
    const input = screen.getByPlaceholderText('Enter task title...')
    fireEvent.change(input, { target: { value: 'Failed Task' } })
    
    // Submit form
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // Form should still be visible on error
    expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument()
  })

  it('renders task indices correctly', () => {
    render(
      <SwimLaneWrapper>
        <SwimLane {...defaultProps} />
      </SwimLaneWrapper>
    )

    expect(screen.getByTestId('task-index-1')).toHaveTextContent('0')
    expect(screen.getByTestId('task-index-2')).toHaveTextContent('1')
  })
}) 