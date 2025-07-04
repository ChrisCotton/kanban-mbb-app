import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { DragDropContext } from '@hello-pangea/dnd'
import SubtaskList from './SubtaskList'

// Mock the useSubtasks hook
const mockSubtasks = [
  {
    id: '1',
    task_id: 'task-1',
    title: 'First subtask',
    completed: false,
    order_index: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    task_id: 'task-1',
    title: 'Second subtask',
    completed: true,
    order_index: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

const mockUseSubtasks = {
  subtasks: mockSubtasks,
  loading: false,
  error: null,
  createSubtask: jest.fn(),
  updateSubtask: jest.fn(),
  toggleSubtask: jest.fn(),
  deleteSubtask: jest.fn(),
  reorderSubtasks: jest.fn(),
  refetch: jest.fn()
}

jest.mock('../../hooks/useSubtasks', () => ({
  useSubtasks: () => mockUseSubtasks
}))

// Mock drag and drop
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => (
    <div data-testid="drag-drop-context" data-ondragend={onDragEnd?.toString()}>
      {children}
    </div>
  ),
  Droppable: ({ children }: any) => (
    <div data-testid="droppable">
      {children({ innerRef: jest.fn(), droppableProps: {}, placeholder: null }, { isDraggingOver: false })}
    </div>
  ),
  Draggable: ({ children, draggableId }: any) => (
    <div data-testid={`draggable-${draggableId}`}>
      {children(
        { 
          innerRef: jest.fn(), 
          draggableProps: { 'data-testid': `draggable-props-${draggableId}` }, 
          dragHandleProps: { 'data-testid': `drag-handle-${draggableId}` } 
        }, 
        { isDragging: false }
      )}
    </div>
  )
}))

describe('SubtaskList', () => {
  const defaultProps = {
    taskId: 'task-1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders subtask list with header and progress', () => {
      render(<SubtaskList {...defaultProps} />)
      
      expect(screen.getByText('Subtasks')).toBeInTheDocument()
      expect(screen.getByText('1 of 2 completed')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('renders all subtasks', () => {
      render(<SubtaskList {...defaultProps} />)
      
      expect(screen.getByText('First subtask')).toBeInTheDocument()
      expect(screen.getByText('Second subtask')).toBeInTheDocument()
    })

    it('shows completed subtasks with strikethrough', () => {
      render(<SubtaskList {...defaultProps} />)
      
      const completedSubtask = screen.getByText('Second subtask')
      expect(completedSubtask).toHaveClass('line-through')
    })

    it('renders progress bar with correct percentage', () => {
      render(<SubtaskList {...defaultProps} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveStyle('width: 50%') // 1 of 2 completed
    })

    it('renders add subtask button', () => {
      render(<SubtaskList {...defaultProps} />)
      
      expect(screen.getByText('Add subtask')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading state when loading', () => {
      const loadingUseSubtasks = { ...mockUseSubtasks, loading: true, subtasks: [] }
      
      // Temporarily override the mock
      jest.doMock('../../hooks/useSubtasks', () => ({
        useSubtasks: () => loadingUseSubtasks
      }))

      // Re-import and render with new mock
      const SubtaskListWithLoadingMock = require('./SubtaskList').default
      render(<SubtaskListWithLoadingMock {...defaultProps} />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getAllByText('Loading...')).toHaveLength(1) // Only one loading text
    })
  })

  describe('Error State', () => {
    it('shows error message when there is an error', () => {
      const errorUseSubtasks = { ...mockUseSubtasks, error: 'Failed to load subtasks', subtasks: [] }
      
      // Temporarily override the mock
      jest.doMock('../../hooks/useSubtasks', () => ({
        useSubtasks: () => errorUseSubtasks
      }))

      // Re-import and render with new mock
      const SubtaskListWithErrorMock = require('./SubtaskList').default
      render(<SubtaskListWithErrorMock {...defaultProps} />)
      
      expect(screen.getByText('Failed to load subtasks')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no subtasks exist', () => {
      const emptyUseSubtasks = { ...mockUseSubtasks, subtasks: [] }
      
      // Temporarily override the mock
      jest.doMock('../../hooks/useSubtasks', () => ({
        useSubtasks: () => emptyUseSubtasks
      }))

      // Re-import and render with new mock
      const SubtaskListWithEmptyMock = require('./SubtaskList').default
      render(<SubtaskListWithEmptyMock {...defaultProps} />)
      
      expect(screen.getByText('No subtasks yet')).toBeInTheDocument()
      expect(screen.getByText('Break this task down into smaller steps')).toBeInTheDocument()
    })
  })

  describe('Subtask Interactions', () => {
    it('toggles subtask completion when checkbox is clicked', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const checkbox = screen.getAllByRole('button')[0] // First checkbox
      await user.click(checkbox)
      
      expect(mockUseSubtasks.toggleSubtask).toHaveBeenCalledWith('1')
    })

    it('enables editing when subtask title is clicked', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const title = screen.getByText('First subtask')
      await user.click(title)
      
      expect(screen.getByDisplayValue('First subtask')).toBeInTheDocument()
    })

    it('saves subtask when Enter is pressed during editing', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const title = screen.getByText('First subtask')
      await user.click(title)
      
      const input = screen.getByDisplayValue('First subtask')
      await user.clear(input)
      await user.type(input, 'Updated subtask')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(mockUseSubtasks.updateSubtask).toHaveBeenCalledWith('1', { title: 'Updated subtask' })
      })
    })

    it('cancels editing when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const title = screen.getByText('First subtask')
      await user.click(title)
      
      const input = screen.getByDisplayValue('First subtask')
      await user.clear(input)
      await user.type(input, 'Updated subtask')
      await user.keyboard('{Escape}')
      
      expect(screen.getByText('First subtask')).toBeInTheDocument()
      expect(mockUseSubtasks.updateSubtask).not.toHaveBeenCalled()
    })

    it('shows delete confirmation when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      // Hover to show action buttons
      const subtaskItem = screen.getByText('First subtask').closest('div')
      await user.hover(subtaskItem!)
      
      const deleteButton = screen.getByTitle('Delete subtask "First subtask"')
      await user.click(deleteButton)
      
      expect(screen.getByText('Delete Subtask')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete "First subtask"?')).toBeInTheDocument()
    })

    it('deletes subtask when confirmed', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      // Hover to show action buttons
      const subtaskItem = screen.getByText('First subtask').closest('div')
      await user.hover(subtaskItem!)
      
      const deleteButton = screen.getByTitle('Delete subtask "First subtask"')
      await user.click(deleteButton)
      
      const confirmButton = screen.getByText('Delete')
      await user.click(confirmButton)
      
      expect(mockUseSubtasks.deleteSubtask).toHaveBeenCalledWith('1')
    })
  })

  describe('Creating New Subtasks', () => {
    it('shows create form when add subtask button is clicked', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const addButton = screen.getByText('Add subtask')
      await user.click(addButton)
      
      expect(screen.getByPlaceholderText('Enter subtask title...')).toBeInTheDocument()
      expect(screen.getByText('Add')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('creates new subtask when Add button is clicked', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const addButton = screen.getByText('Add subtask')
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Enter subtask title...')
      await user.type(input, 'New subtask')
      
      const createButton = screen.getByText('Add')
      await user.click(createButton)
      
      expect(mockUseSubtasks.createSubtask).toHaveBeenCalledWith('New subtask')
    })

    it('creates new subtask when Enter is pressed', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const addButton = screen.getByText('Add subtask')
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Enter subtask title...')
      await user.type(input, 'New subtask')
      await user.keyboard('{Enter}')
      
      expect(mockUseSubtasks.createSubtask).toHaveBeenCalledWith('New subtask')
    })

    it('cancels creating when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const addButton = screen.getByText('Add subtask')
      await user.click(addButton)
      
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
      
      expect(screen.queryByPlaceholderText('Enter subtask title...')).not.toBeInTheDocument()
    })

    it('cancels creating when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const addButton = screen.getByText('Add subtask')
      await user.click(addButton)
      
      const input = screen.getByPlaceholderText('Enter subtask title...')
      await user.keyboard('{Escape}')
      
      expect(screen.queryByPlaceholderText('Enter subtask title...')).not.toBeInTheDocument()
    })

    it('does not create subtask with empty title', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      const addButton = screen.getByText('Add subtask')
      await user.click(addButton)
      
      const createButton = screen.getByText('Add')
      expect(createButton).toBeDisabled()
    })
  })

  describe('Drag and Drop', () => {
    it('renders drag and drop context', () => {
      render(<SubtaskList {...defaultProps} />)
      
      expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument()
      expect(screen.getByTestId('droppable')).toBeInTheDocument()
    })

    it('renders draggable items for each subtask', () => {
      render(<SubtaskList {...defaultProps} />)
      
      expect(screen.getByTestId('draggable-1')).toBeInTheDocument()
      expect(screen.getByTestId('draggable-2')).toBeInTheDocument()
    })

    it('shows drag handles on hover', () => {
      render(<SubtaskList {...defaultProps} />)
      
      expect(screen.getByTestId('drag-handle-1')).toBeInTheDocument()
      expect(screen.getByTestId('drag-handle-2')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SubtaskList {...defaultProps} />)
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(7) // 2 checkboxes + 2 edit buttons + 2 delete buttons + 1 add button
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SubtaskList {...defaultProps} />)
      
      // Tab through interactive elements
      await user.tab()
      expect(screen.getAllByRole('button')[0]).toHaveFocus()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<SubtaskList {...defaultProps} className="custom-class" />)
      
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
}) 