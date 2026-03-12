/**
 * REGRESSION TEST: Categories Load in Task Modal
 *
 * Bug: Category dropdown hangs on "Loading categories..." when creating or viewing tasks
 * Fix: Share categories from KanbanBoard so modals show list immediately
 *
 * This test ensures:
 * 1. Create Task modal shows categories (not stuck on Loading)
 * 2. Task Detail modal shows categories when provided from parent
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import TaskModal from '../../components/kanban/TaskModal'
import TaskDetailModal from '../../components/kanban/TaskDetailModal'
import { Task } from '../../lib/database/kanban-queries'

const mockCategories = [
  { id: 'cat-1', name: 'Development', hourly_rate_usd: 100 },
  { id: 'cat-2', name: 'Design', hourly_rate_usd: 80 },
  { id: 'cat-3', name: 'Research', hourly_rate_usd: 120 },
]

jest.mock('../../src/stores/goals.store', () => ({
  useGoalsStore: () => ({
    goals: [],
    fetchGoals: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
  }),
}))

jest.mock('../../hooks/useTags', () => ({
  useTaskTags: () => ({
    tags: [],
    addTagToTask: jest.fn(),
    removeTagFromTask: jest.fn(),
  }),
}))

jest.mock('../../hooks/useSubtasks', () => ({
  useSubtasks: () => ({
    subtasks: [],
    isLoading: false,
    addSubtask: jest.fn(),
    updateSubtask: jest.fn(),
    deleteSubtask: jest.fn(),
    toggleSubtask: jest.fn(),
  }),
}))

jest.mock('../../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    isLoading: false,
    addComment: jest.fn(),
    editComment: jest.fn(),
    deleteComment: jest.fn(),
  }),
}))

jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: React.ReactNode }) {
    return <div data-testid="markdown">{children}</div>
  }
})
jest.mock('remark-gfm', () => ({}))
jest.mock('rehype-highlight', () => ({}))

describe('Categories Load in Task Modal - Regression', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('REGRESSION: Create Task modal shows categories when shared from parent (no Loading hang)', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn().mockResolvedValue(undefined)
    const onClose = jest.fn()

    render(
      <TaskModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        categories={mockCategories}
        categoriesLoading={false}
        categoriesError={null}
        onLoadCategories={jest.fn().mockResolvedValue(undefined)}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Create New Task')).toBeInTheDocument()
    })

    // Must NOT show "Loading categories..." when categories are provided
    expect(screen.queryByText('Loading categories...')).not.toBeInTheDocument()

    // Category dropdown should show "No Category" or a category when opened (categories are available)
    const categoryLabel = screen.getByText('Category', { selector: 'label' })
    expect(categoryLabel).toBeInTheDocument()

    // Open the category dropdown
    const categoryButton = screen.getByRole('button', { name: /No Category|Development|Design|Research/i })
    await user.click(categoryButton)

    // Should see category options (not loading state)
    await waitFor(() => {
      expect(screen.getByText('Development')).toBeInTheDocument()
      expect(screen.getByText('Design')).toBeInTheDocument()
      expect(screen.getByText('Research')).toBeInTheDocument()
    })
  })

  test('REGRESSION: Task Detail modal shows category when shared from parent', async () => {
    const mockTask: Task = {
      id: 'task-1',
      user_id: 'user-1',
      title: 'Test Task',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: null,
      order_index: 0,
      category_id: 'cat-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    render(
      <TaskDetailModal
        isOpen={true}
        onClose={jest.fn()}
        task={mockTask}
        onUpdate={jest.fn().mockResolvedValue(undefined)}
        onMove={jest.fn()}
        categories={mockCategories}
        categoriesLoading={false}
        categoriesError={null}
        onLoadCategories={jest.fn().mockResolvedValue(undefined)}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument()
    })

    // Must NOT show "Loading categories..." or "Loading..."
    expect(screen.queryByText('Loading categories...')).not.toBeInTheDocument()

    // Task has category_id cat-1 (Development), so compact selector should show "Development"
    await waitFor(() => {
      expect(screen.getByText('Development')).toBeInTheDocument()
    })
  })

  test('REGRESSION: Category dropdown does not hang when loading=false and categories provided', async () => {
    render(
      <TaskModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn().mockResolvedValue(undefined)}
        categories={mockCategories}
        categoriesLoading={false}
        categoriesError={null}
        onLoadCategories={jest.fn().mockResolvedValue(undefined)}
      />
    )

    // Wait for modal to render
    await waitFor(() => {
      expect(screen.getByText('Create New Task')).toBeInTheDocument()
    })

    // Should never show loading state when categories are pre-loaded
    expect(screen.queryByText('Loading categories...')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })
})
