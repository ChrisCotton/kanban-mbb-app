import { renderHook, act } from '@testing-library/react'
import { useDragAndDrop } from './useDragAndDrop'
import { Task } from '../lib/database/kanban-queries'

const mockTasks: Record<Task['status'], Task[]> = {
  backlog: [
    {
      id: '1',
      title: 'Backlog Task 1',
      description: 'Test description',
      status: 'backlog',
      priority: 'high',
      order_index: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      user_id: 'test-user'
    },
    {
      id: '2', 
      title: 'Backlog Task 2',
      description: 'Test description',
      status: 'backlog',
      priority: 'medium',
      order_index: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      user_id: 'test-user'
    }
  ],
  todo: [
    {
      id: '3',
      title: 'Todo Task 1',
      description: 'Test description',
      status: 'todo',
      priority: 'low',
      order_index: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      user_id: 'test-user'
    }
  ],
  doing: [],
  done: []
}

const mockOnTaskMove = jest.fn()
const mockOnOptimisticUpdate = jest.fn()

describe('useDragAndDrop', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    expect(result.current.dragDropState).toEqual({
      isDragging: false,
      draggedTaskId: null,
      sourceStatus: null,
      destinationStatus: null
    })
  })

  it('handles drag start correctly', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const dragStart = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 }
    }

    act(() => {
      result.current.handleDragStart(dragStart)
    })

    expect(result.current.dragDropState).toEqual({
      isDragging: true,
      draggedTaskId: '1',
      sourceStatus: 'backlog',
      destinationStatus: 'backlog'
    })
  })

  it('handles drag update correctly', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    // Start drag first
    const dragStart = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 }
    }

    act(() => {
      result.current.handleDragStart(dragStart)
    })

    // Update destination
    const dragUpdate = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 },
      destination: { droppableId: 'todo', index: 0 }
    }

    act(() => {
      result.current.handleDragUpdate(dragUpdate)
    })

    expect(result.current.dragDropState.destinationStatus).toBe('todo')
  })

  it('handles drag update with no destination', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    // Start drag first
    const dragStart = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 }
    }

    act(() => {
      result.current.handleDragStart(dragStart)
    })

    // Update with no destination
    const dragUpdate = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 },
      destination: null
    }

    act(() => {
      result.current.handleDragUpdate(dragUpdate)
    })

    expect(result.current.dragDropState.destinationStatus).toBe('backlog')
  })

  it('reorders tasks within the same column', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const reorderedTasks = result.current.reorderTasksInColumn('backlog', mockTasks.backlog)

    expect(reorderedTasks).toHaveLength(2)
    expect(reorderedTasks[0].order_index).toBe(0)
    expect(reorderedTasks[1].order_index).toBe(1)
  })

  it('moves task between different columns', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const source = { droppableId: 'backlog', index: 0 }
    const destination = { droppableId: 'todo', index: 1 }

    const updatedTasks = result.current.moveTaskBetweenColumns(source, destination, mockTasks)

    // Check source column
    expect(updatedTasks.backlog).toHaveLength(1)
    expect(updatedTasks.backlog[0].id).toBe('2')

    // Check destination column
    expect(updatedTasks.todo).toHaveLength(2)
    expect(updatedTasks.todo[1].id).toBe('1')
    expect(updatedTasks.todo[1].status).toBe('todo')
  })

  it('handles successful drag end', async () => {
    mockOnTaskMove.mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const dropResult = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 },
      destination: { droppableId: 'todo', index: 0 },
      reason: 'DROP' as const
    }

    await act(async () => {
      await result.current.handleDragEnd(dropResult)
    })

    expect(mockOnOptimisticUpdate).toHaveBeenCalled()
    expect(mockOnTaskMove).toHaveBeenCalledWith('1', 'todo', 0)
    expect(result.current.dragDropState.isDragging).toBe(false)
  })

  it('handles drag end with no destination', async () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const dropResult = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 },
      destination: null,
      reason: 'CANCEL' as const
    }

    await act(async () => {
      await result.current.handleDragEnd(dropResult)
    })

    expect(mockOnOptimisticUpdate).not.toHaveBeenCalled()
    expect(mockOnTaskMove).not.toHaveBeenCalled()
    expect(result.current.dragDropState.isDragging).toBe(false)
  })

  it('handles drag end with same position', async () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const dropResult = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 },
      destination: { droppableId: 'backlog', index: 0 },
      reason: 'DROP' as const
    }

    await act(async () => {
      await result.current.handleDragEnd(dropResult)
    })

    expect(mockOnOptimisticUpdate).not.toHaveBeenCalled()
    expect(mockOnTaskMove).not.toHaveBeenCalled()
    expect(result.current.dragDropState.isDragging).toBe(false)
  })

  it('handles drag end error and reverts optimistic update', async () => {
    const error = new Error('Failed to move task')
    mockOnTaskMove.mockRejectedValue(error)

    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const dropResult = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 },
      destination: { droppableId: 'todo', index: 0 },
      reason: 'DROP' as const
    }

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    await act(async () => {
      try {
        await result.current.handleDragEnd(dropResult)
      } catch (e) {
        // Expected to throw
      }
    })

    expect(mockOnOptimisticUpdate).toHaveBeenCalledTimes(2) // Once for optimistic, once for revert
    expect(consoleSpy).toHaveBeenCalledWith('Failed to move task:', error)

    consoleSpy.mockRestore()
  })

  it('works without optimistic update callback', async () => {
    mockOnTaskMove.mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove
        // No onOptimisticUpdate provided
      })
    )

    const dropResult = {
      draggableId: '1',
      type: 'DEFAULT',
      source: { droppableId: 'backlog', index: 0 },
      destination: { droppableId: 'todo', index: 0 },
      reason: 'DROP' as const
    }

    await act(async () => {
      await result.current.handleDragEnd(dropResult)
    })

    expect(mockOnTaskMove).toHaveBeenCalledWith('1', 'todo', 0)
    expect(result.current.dragDropState.isDragging).toBe(false)
  })

  it('handles reordering within the same column', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const source = { droppableId: 'backlog', index: 0 }
    const destination = { droppableId: 'backlog', index: 1 }

    const updatedTasks = result.current.moveTaskBetweenColumns(source, destination, mockTasks)

    expect(updatedTasks.backlog).toHaveLength(2)
    expect(updatedTasks.backlog[0].id).toBe('2')
    expect(updatedTasks.backlog[1].id).toBe('1')
    expect(updatedTasks.backlog[0].order_index).toBe(0)
    expect(updatedTasks.backlog[1].order_index).toBe(1)
  })

  it('maintains task properties when moving between columns', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({
        tasks: mockTasks,
        onTaskMove: mockOnTaskMove,
        onOptimisticUpdate: mockOnOptimisticUpdate
      })
    )

    const source = { droppableId: 'backlog', index: 0 }
    const destination = { droppableId: 'doing', index: 0 }

    const updatedTasks = result.current.moveTaskBetweenColumns(source, destination, mockTasks)

    const movedTask = updatedTasks.doing[0]
    expect(movedTask.id).toBe('1')
    expect(movedTask.title).toBe('Backlog Task 1')
    expect(movedTask.description).toBe('Test description')
    expect(movedTask.priority).toBe('high')
    expect(movedTask.status).toBe('doing')
    expect(movedTask.order_index).toBe(0)
  })
}) 