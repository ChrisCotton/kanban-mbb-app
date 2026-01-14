/**
 * Integration Tests: TaskDetailModal Category Update
 * 
 * Tests the category dropdown and Update Task button interaction
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TaskDetailModal from '../TaskDetailModal'
import { Task } from '../../../lib/database/kanban-queries'

// Mock the hooks
jest.mock('../../../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    isLoading: false,
    error: null,
    addComment: jest.fn(),
    editComment: jest.fn(),
    deleteComment: jest.fn(),
  }),
}))

jest.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      {
        id: 'category-1',
        name: 'Development',
        hourly_rate: 100,
        color: '#3b82f6',
        is_active: true,
        total_hours: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        created_by: 'user-1',
        task_count: 0,
      },
      {
        id: 'category-2',
        name: 'Design',
        hourly_rate: 150,
        color: '#8b5cf6',
        is_active: true,
        total_hours: 0,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        created_by: 'user-1',
        task_count: 0,
      },
    ],
    loading: false,
    error: null,
    loadCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    bulkUpload: jest.fn(),
    getCategoryById: jest.fn(),
    getCategoriesByIds: jest.fn(),
    getActiveCategories: jest.fn(),
    searchCategories: jest.fn(),
    validateCategoryName: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
    refresh: jest.fn(),
    submitting: false,
  }),
}))

describe('TaskDetailModal - Category Update Integration', () => {
  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test description',
    status: 'todo',
    priority: 'medium',
    order_index: 0,
    user_id: 'user-1',
    category_id: null,
    due_date: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  const mockOnUpdate = jest.fn()
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('✅ Category Dropdown Interaction', () => {
    test('should render category selector when editing', async () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Category selector should be visible
      await waitFor(() => {
        expect(screen.getByText('Category')).toBeInTheDocument()
      })
    })

    test('should display "No Category" when task has no category', async () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Should show "No Category" initially
      await waitFor(() => {
        expect(screen.getByText('No Category')).toBeInTheDocument()
      })
    })

    test('should allow selecting a category from dropdown', async () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Open category dropdown
      await waitFor(() => {
        const categoryButton = screen.getByText('No Category')
        fireEvent.click(categoryButton)
      })

      // Categories should be listed
      await waitFor(() => {
        expect(screen.getByText('Development')).toBeInTheDocument()
        expect(screen.getByText('Design')).toBeInTheDocument()
      })
    })

    test('should enable Update Task button when category changes', async () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Update Task button should be disabled initially (no changes)
      let updateButton = screen.getByText('Update Task') as HTMLButtonElement
      expect(updateButton.disabled).toBe(true)

      // Open category dropdown and select a category
      await waitFor(() => {
        const categoryButton = screen.getByText('No Category')
        fireEvent.click(categoryButton)
      })

      await waitFor(() => {
        const developmentOption = screen.getByText('Development')
        fireEvent.click(developmentOption)
      })

      // Update Task button should now be enabled
      await waitFor(() => {
        updateButton = screen.getByText('Update Task') as HTMLButtonElement
        expect(updateButton.disabled).toBe(false)
      })
    })
  })

  describe('✅ Update Task Button', () => {
    test('should call onUpdate with category_id when Update Task is clicked', async () => {
      mockOnUpdate.mockResolvedValue(undefined)

      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Select a category
      await waitFor(() => {
        const categoryButton = screen.getByText('No Category')
        fireEvent.click(categoryButton)
      })

      await waitFor(() => {
        const developmentOption = screen.getByText('Development')
        fireEvent.click(developmentOption)
      })

      // Click Update Task
      await waitFor(() => {
        const updateButton = screen.getByText('Update Task')
        fireEvent.click(updateButton)
      })

      // Verify onUpdate was called with category_id
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          'task-123',
          expect.objectContaining({
            category_id: 'category-1',
          })
        )
      })
    })

    test('should show loading state while updating', async () => {
      // Mock slow update
      mockOnUpdate.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Select a category
      await waitFor(() => {
        const categoryButton = screen.getByText('No Category')
        fireEvent.click(categoryButton)
      })

      await waitFor(() => {
        const developmentOption = screen.getByText('Development')
        fireEvent.click(developmentOption)
      })

      // Click Update Task
      await waitFor(() => {
        const updateButton = screen.getByText('Update Task')
        fireEvent.click(updateButton)
      })

      // Should show "Updating..." text
      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument()
      })
    })

    test('should allow changing category from one to another', async () => {
      const taskWithCategory = { ...mockTask, category_id: 'category-1' }
      mockOnUpdate.mockResolvedValue(undefined)

      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={taskWithCategory}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Should show current category
      await waitFor(() => {
        expect(screen.getByText('Development')).toBeInTheDocument()
      })

      // Change to Design category
      await waitFor(() => {
        const categoryButton = screen.getByText('Development')
        fireEvent.click(categoryButton)
      })

      await waitFor(() => {
        const designOption = screen.getByText('Design')
        fireEvent.click(designOption)
      })

      // Click Update Task
      await waitFor(() => {
        const updateButton = screen.getByText('Update Task')
        fireEvent.click(updateButton)
      })

      // Verify onUpdate was called with new category_id
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          'task-123',
          expect.objectContaining({
            category_id: 'category-2',
          })
        )
      })
    })

    test('should allow clearing category (set to null)', async () => {
      const taskWithCategory = { ...mockTask, category_id: 'category-1' }
      mockOnUpdate.mockResolvedValue(undefined)

      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={taskWithCategory}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Open category dropdown
      await waitFor(() => {
        const categoryButton = screen.getByText('Development')
        fireEvent.click(categoryButton)
      })

      // Select "No Category" option
      await waitFor(() => {
        const noCategoryOption = screen.getAllByText('No Category')[1] // Second instance in dropdown
        fireEvent.click(noCategoryOption)
      })

      // Click Update Task
      await waitFor(() => {
        const updateButton = screen.getByText('Update Task')
        fireEvent.click(updateButton)
      })

      // Verify onUpdate was called with null category_id
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          'task-123',
          expect.objectContaining({
            category_id: null,
          })
        )
      })
    })
  })

  describe('❌ Error Handling', () => {
    test('should handle update failure gracefully', async () => {
      mockOnUpdate.mockRejectedValue(new Error('Failed to update task'))

      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      )

      // Click Edit Task button
      const editButton = screen.getByText('Edit Task')
      fireEvent.click(editButton)

      // Select a category
      await waitFor(() => {
        const categoryButton = screen.getByText('No Category')
        fireEvent.click(categoryButton)
      })

      await waitFor(() => {
        const developmentOption = screen.getByText('Development')
        fireEvent.click(developmentOption)
      })

      // Click Update Task
      await waitFor(() => {
        const updateButton = screen.getByText('Update Task')
        fireEvent.click(updateButton)
      })

      // Modal should remain open (not close on error)
      await waitFor(() => {
        expect(screen.getByText('Task Details')).toBeInTheDocument()
      })
    })
  })
})
