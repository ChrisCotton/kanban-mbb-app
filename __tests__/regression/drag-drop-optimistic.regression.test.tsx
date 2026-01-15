import React from 'react'
import { render, screen, act, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import KanbanBoard from '../../components/kanban/KanbanBoard'
import { Task } from '../../lib/database/kanban-queries'

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
})
