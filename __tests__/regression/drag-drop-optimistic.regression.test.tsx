import React from 'react'
import { render, screen, act, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import KanbanBoard from '../../components/kanban/KanbanBoard'
import { Task } from '../../lib/database/kanban-queries'

// Mock global fetch for goal filtering API calls
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true, data: [] }),
})
global.fetch = mockFetch as unknown as typeof global.fetch

// Mock DragDropContext to capture onDragEnd
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => {
    // @ts-ignore
    global.onDragEnd = onDragEnd || jest.fn()
    return <div data-testid="drag-drop-context">{children}</div>
  },
  Droppable: ({ children }: any) => children({
    droppableProps: {},
    innerRef: jest.fn(),
    placeholder: null,
  }, { isDraggingOver: false }),
  Draggable: ({ children }: any) => children({
    draggableProps: {},
    dragHandleProps: {},
    innerRef: jest.fn(),
  }, { isDragging: false }),
}))

// Mock child components to keep focus on ordering behavior
jest.mock('../../components/kanban/SwimLane', () => {
  return function MockSwimLane({ status, tasks }: any) {
    return (
      <div data-testid={`lane-${status}`}>
        {tasks.map((task: any) => (
          <div
            key={task.id}
            data-testid={`lane-${status}-task-${task.id}`}
            data-task-id={task.id}
          >
            {task.title}
          </div>
        ))}
      </div>
    )
  }
})

jest.mock('../../components/kanban/TaskModal', () => () => null)
jest.mock('../../components/kanban/TaskDetailModal', () => () => null)
jest.mock('../../components/kanban/BulkActionsToolbar', () => () => null)
jest.mock('../../components/kanban/BulkDeleteConfirmDialog', () => () => null)
jest.mock('../../components/kanban/SearchAndFilter', () => () => null)

// Mock hooks used by KanbanBoard
const mockMoveTask = jest.fn().mockResolvedValue({})
const mockUpdateTask = jest.fn().mockResolvedValue({})
const mockDeleteTask = jest.fn().mockResolvedValue({})
const mockCreateTask = jest.fn().mockResolvedValue({})
const mockFetchTasks = jest.fn().mockResolvedValue({})

let mockTasksState: Record<Task['status'], Task[]> = {
  backlog: [],
  todo: [],
  doing: [],
  done: [],
}

const mockBuildStats = (tasks: Record<Task['status'], Task[]>) => ({
  total: Object.values(tasks).flat().length,
  backlog: tasks.backlog.length,
  todo: tasks.todo.length,
  doing: tasks.doing.length,
  done: tasks.done.length,
})

jest.mock('../../hooks/useKanban', () => ({
  useKanban: () => ({
    tasks: mockTasksState,
    isLoading: false,
    error: null,
    stats: mockBuildStats(mockTasksState),
    createTask: mockCreateTask,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
    moveTask: mockMoveTask,
    getTask: jest.fn(),
    clearError: jest.fn(),
    refetchTasks: mockFetchTasks,
  }),
}))

jest.mock('../../hooks/useTaskSearch', () => ({
  useTaskSearch: () => ({
    organizedResults: mockTasksState,
    searchStats: mockBuildStats(mockTasksState),
    isSearching: false,
    searchError: null,
    activeFilters: {},
    isSearchMode: false,
    hasActiveFilters: false,
    performSearch: jest.fn(),
    clearSearch: jest.fn(),
    clearError: jest.fn(),
  }),
}))

jest.mock('../../hooks/useMultiSelect', () => ({
  useMultiSelect: () => ({
    selectedTaskIds: [],
    selectedCount: 0,
    isMultiSelectMode: false,
    toggleMultiSelectMode: jest.fn(),
    toggleTaskSelection: jest.fn(),
    selectAllTasks: jest.fn(),
    clearSelection: jest.fn(),
    isTaskSelected: jest.fn().mockReturnValue(false),
  }),
}))

// Mock the goals store to prevent authentication errors
jest.mock('../../src/stores/goals.store', () => ({
  useGoalsStore: () => ({
    goals: [],
    isLoading: false,
    error: null,
    fetchGoals: jest.fn().mockResolvedValue([]),
    activeGoalFilter: null,
    setActiveGoalFilter: jest.fn(),
  }),
}))

const makeTask = (id: string, title: string, status: Task['status'], order_index: number): Task => ({
  id,
  title,
  description: '',
  status,
  priority: 'medium',
  due_date: undefined,
  category_id: undefined,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  user_id: 'user-1',
  order_index,
})

const getTodoOrder = () => {
  const lane = screen.getByTestId('lane-todo')
  return within(lane)
    .getAllByTestId(/^lane-todo-task-/)
    .map(node => node.getAttribute('data-task-id'))
}

const getDoingOrder = () => {
  const lane = screen.getByTestId('lane-doing')
  return within(lane)
    .getAllByTestId(/^lane-doing-task-/)
    .map(node => node.getAttribute('data-task-id'))
}

describe('REGRESSION: Kanban optimistic drag & drop', () => {
  beforeEach(() => {
    mockTasksState = {
      backlog: [],
      todo: [
        makeTask('task-a', 'Task A', 'todo', 0),
        makeTask('task-b', 'Task B', 'todo', 1),
      ],
      doing: [],
      done: [],
    }
    mockMoveTask.mockClear()
    mockFetch.mockClear()
  })

  afterEach(() => {
    // @ts-ignore
    global.onDragEnd = undefined
  })

  test('keeps optimistic order when server returns stale order', () => {
    const { rerender } = render(<KanbanBoard />)

    expect(getTodoOrder()).toEqual(['task-a', 'task-b'])

    // Simulate drag: move task-b to index 0
    act(() => {
      // @ts-ignore
      global.onDragEnd({
        draggableId: 'task-b',
        source: { droppableId: 'todo', index: 1 },
        destination: { droppableId: 'todo', index: 0 },
        reason: 'DROP',
        type: 'DEFAULT',
      })
    })

    expect(getTodoOrder()).toEqual(['task-b', 'task-a'])

    // Server responds with stale order (original)
    mockTasksState = {
      ...mockTasksState,
      todo: [
        makeTask('task-a', 'Task A', 'todo', 0),
        makeTask('task-b', 'Task B', 'todo', 1),
      ],
    }
    rerender(<KanbanBoard />)

    // Optimistic order should remain
    expect(getTodoOrder()).toEqual(['task-b', 'task-a'])

    // Server now matches optimistic order
    mockTasksState = {
      ...mockTasksState,
      todo: [
        makeTask('task-b', 'Task B', 'todo', 0),
        makeTask('task-a', 'Task A', 'todo', 1),
      ],
    }
    rerender(<KanbanBoard />)

    expect(getTodoOrder()).toEqual(['task-b', 'task-a'])
  })

  /**
   * REGRESSION TEST: Cross-swimlane drag snap-back prevention
   * 
   * Bug: When dragging a task to a different swimlane (e.g., todo -> doing),
   * the task would visually snap back to the original swimlane after ~1000ms,
   * even though the backend update was successful.
   * 
   * Root cause: The optimistic state was being cleared too early, before
   * the tasks prop had been updated with the correct data from the server.
   * 
   * Fix: Verify that the moved task is actually in the expected status
   * AND that the tasks prop has changed before clearing optimistic state.
   */
  test('prevents snap-back when dragging task across swimlanes', () => {
    const { rerender } = render(<KanbanBoard />)

    expect(getTodoOrder()).toEqual(['task-a', 'task-b'])
    expect(screen.getByTestId('lane-doing').children.length).toBe(0)

    // Simulate drag: move task-b from todo to doing
    act(() => {
      // @ts-ignore
      global.onDragEnd({
        draggableId: 'task-b',
        source: { droppableId: 'todo', index: 1 },
        destination: { droppableId: 'doing', index: 0 },
        reason: 'DROP',
        type: 'DEFAULT',
      })
    })

    // Optimistic update should show task-b in doing
    expect(getTodoOrder()).toEqual(['task-a'])
    expect(getDoingOrder()).toEqual(['task-b'])

    // Server returns STALE data (task-b still in todo)
    // This simulates the race condition where fetchTasks returns before DB is updated
    mockTasksState = {
      backlog: [],
      todo: [
        makeTask('task-a', 'Task A', 'todo', 0),
        makeTask('task-b', 'Task B', 'todo', 1), // Still in todo!
      ],
      doing: [],
      done: [],
    }
    rerender(<KanbanBoard />)

    // CRITICAL: Task should STILL appear in doing (optimistic state preserved)
    // This is the snap-back bug we fixed
    expect(getTodoOrder()).toEqual(['task-a'])
    expect(getDoingOrder()).toEqual(['task-b'])

    // Server eventually returns correct data
    mockTasksState = {
      backlog: [],
      todo: [
        makeTask('task-a', 'Task A', 'todo', 0),
      ],
      doing: [
        makeTask('task-b', 'Task B', 'doing', 0), // Now in doing
      ],
      done: [],
    }
    rerender(<KanbanBoard />)

    // Task should remain in doing (now from server data)
    expect(getTodoOrder()).toEqual(['task-a'])
    expect(getDoingOrder()).toEqual(['task-b'])
  })

  /**
   * REGRESSION TEST: Server returns tasks in different order
   * 
   * Bug: When the server returned tasks in a different order (but same set),
   * the comparison logic would fail and keep optimistic state indefinitely.
   * 
   * Fix: Compare task IDs as sets (ignoring order) instead of strict order comparison.
   */
  test('handles server returning same tasks in different order', () => {
    const { rerender } = render(<KanbanBoard />)

    // Simulate drag within same swimlane
    act(() => {
      // @ts-ignore
      global.onDragEnd({
        draggableId: 'task-b',
        source: { droppableId: 'todo', index: 1 },
        destination: { droppableId: 'todo', index: 0 },
        reason: 'DROP',
        type: 'DEFAULT',
      })
    })

    expect(getTodoOrder()).toEqual(['task-b', 'task-a'])

    // Server returns same tasks but in DIFFERENT order
    // (server might sort by created_at or other criteria)
    mockTasksState = {
      ...mockTasksState,
      todo: [
        // Same two tasks, just different indices
        makeTask('task-b', 'Task B', 'todo', 0),
        makeTask('task-a', 'Task A', 'todo', 1),
      ],
    }
    rerender(<KanbanBoard />)

    // Should clear optimistic state since same task IDs are present
    // (set-based comparison should succeed)
    expect(getTodoOrder()).toEqual(['task-b', 'task-a'])
  })
})
