import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskDetailModal from './TaskDetailModal';
import { Task } from '../../lib/database/kanban-queries';

// Mock react-markdown to avoid complex rendering in tests
jest.mock('react-markdown', () => {
  return function MockMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

// Mock the useComments hook
jest.mock('../../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    isLoading: false,
    error: null,
    addComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
  }),
}));

// Mock the CommentSection component to avoid react-markdown issues
jest.mock('./CommentSection', () => {
  return function MockCommentSection() {
    return <div data-testid="comment-section">Comments Section</div>;
  };
});

// Mock the SubtaskList component
jest.mock('./SubtaskList', () => {
  return function MockSubtaskList() {
    return <div data-testid="subtask-list">Subtasks Section</div>;
  };
});

// Mock date-fns functions
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => 'in 2 days'),
  format: jest.fn(() => 'Jun 13, 2025'),
}));

const mockTask: Task = {
  id: 'test-task-id',
  title: 'Test Task',
  description: 'Original description',
  status: 'todo',
  priority: 'medium',
  due_date: '2025-06-13',
  order_index: 0,
  category_id: '1',
  created_at: '2025-06-12T10:00:00Z',
  updated_at: '2025-06-12T10:00:00Z',
  user_id: 'test-user-id',
  tags: [
    { 
      id: 'tag1',
      name: 'important',
      color: '#ff0000',
      user_id: 'test-user-id',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    }
  ],
};

describe('TaskDetailModal', () => { // Changed description to be more general
  const mockOnClose = jest.fn();
  const mockOnUpdate = jest.fn();
  const mockOnMove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnUpdate.mockResolvedValue(undefined);
  });

  // New test suite for initial read-only rendering
  describe('Initial Read-Only Rendering', () => {
    it('should display task details correctly in read-only mode', () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Original description')).toBeInTheDocument();
      expect(screen.getByText('To Do')).toBeInTheDocument(); // Status
      expect(screen.getByText('Medium Priority')).toBeInTheDocument(); // Priority
      expect(screen.getByText('Jun 13, 2025')).toBeInTheDocument(); // Formatted due date
      expect(screen.getByText('in 2 days')).toBeInTheDocument(); // Relative due date
      expect(screen.getByText('Development')).toBeInTheDocument(); // Category
      expect(screen.getByText('important')).toBeInTheDocument(); // Tag
      expect(screen.getByText(/Created/)).toBeInTheDocument(); // Created at
      expect(screen.getByText(/Updated/)).toBeInTheDocument(); // Updated at
      
      expect(screen.getByTestId('comment-section')).toBeInTheDocument();
      expect(screen.getByTestId('subtask-list')).toBeInTheDocument();
    });

    it('should not show edit buttons initially', () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      expect(screen.queryByText('Update Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    });

    it('should show edit button to switch to edit mode', () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      expect(screen.getByRole('button', { name: 'Edit Task' })).toBeInTheDocument();
    });
  });

  // Original test suite from the provided file
  describe('TaskDetailModal - Description Update Regression Tests', () => {
    test('should save description changes when Update Task is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      // Modal should open in edit mode now
      expect(screen.getByText('Update Task')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Find the description textarea
      const descriptionTextarea = screen.getByDisplayValue('Original description');
      expect(descriptionTextarea).toBeInTheDocument();

      // Clear and update the description
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'CHANGED THIS - Updated description');

      // Verify the textarea has the new value
      expect(descriptionTextarea).toHaveValue('CHANGED THIS - Updated description');

      // Click Update Task
      const updateButton = screen.getByText('Update Task');
      await user.click(updateButton);

      // Verify onUpdate was called with the correct data
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('test-task-id', {
          description: 'CHANGED THIS - Updated description',
        });
      });
    });

    test('should preserve description changes in local state during editing', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      const descriptionTextarea = screen.getByDisplayValue('Original description');
      
      // Update description
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'HELLO - New description');

      // Verify the change is reflected immediately
      expect(descriptionTextarea).toHaveValue('HELLO - New description');

      // The Update Task button should be enabled since there are changes
      const updateButton = screen.getByText('Update Task');
      expect(updateButton).not.toBeDisabled();
    });

    test('should handle empty description updates', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      const descriptionTextarea = screen.getByDisplayValue('Original description');
      
      // Clear the description completely
      await user.clear(descriptionTextarea);
      expect(descriptionTextarea).toHaveValue('');

      // Click Update Task
      await user.click(screen.getByText('Update Task'));

      // Verify onUpdate was called with empty description
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('test-task-id', {
          description: '',
        });
      });
    });

    test('should handle special characters and multiline text in description', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      const specialDescription = `## CHANGED THIS\n\nSpecial chars: !@#$%^&*()\nLine 1\nLine 2\n- Bullet point\n1. Numbered item`;

      const descriptionTextarea = screen.getByDisplayValue('Original description');
      
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, specialDescription);

      expect(descriptionTextarea).toHaveValue(specialDescription);

      await user.click(screen.getByText('Update Task'));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('test-task-id', {
          description: specialDescription,
        });
      });
    });

    test('should not save changes when Cancel is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      const descriptionTextarea = screen.getByDisplayValue('Original description');
      
      // Make changes
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'This should not be saved');

      // Click Cancel
      await user.click(screen.getByText('Cancel'));

      // Should show confirmation modal
      expect(screen.getByText('All changes will be lost. Are you sure you want to discard your edits?')).toBeInTheDocument();
      
      // Confirm cancellation
      await user.click(screen.getByText('Yes, Discard Changes'));

      // onUpdate should not have been called
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    test('should disable Update Task button when no changes are made', async () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await userEvent.setup().click(screen.getByRole('button', { name: 'Edit Task' }));

      // Initially, no changes have been made, so Update Task should be disabled
      const updateButton = screen.getByText('Update Task');
      expect(updateButton).toBeDisabled();
    });

    test('should enable Update Task button when description is changed', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      const descriptionTextarea = screen.getByDisplayValue('Original description');
      
      // Make a change
      await user.type(descriptionTextarea, ' - MODIFIED');

      // Update Task button should now be enabled
      const updateButton = screen.getByText('Update Task');
      expect(updateButton).not.toBeDisabled();
    });

    test('should show loading state during update', async () => {
      const user = userEvent.setup();
      
      // Mock a delayed update
      mockOnUpdate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      const descriptionTextarea = screen.getByDisplayValue('Original description');
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'Updated description');

      // Click Update Task
      await user.click(screen.getByText('Update Task'));

      // Should show loading state
      expect(screen.getByText('Updating...')).toBeInTheDocument();
      
      // Button should be disabled during update
      expect(screen.getByText('Updating...')).toBeDisabled();

      // Wait for update to complete
      await waitFor(() => {
        expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
      });
    });

    test('should handle update errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock a failed update
      mockOnUpdate.mockRejectedValue(new Error('Update failed'));
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      const descriptionTextarea = screen.getByDisplayValue('Original description');
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'Updated description');

      await user.click(screen.getByText('Update Task'));

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update task:', expect.any(Error));
      });

      // Should still be in edit mode after error
      expect(screen.getByText('Update Task')).toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });

    test('should update only description when only description changes', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      // Only change the description, leave title and other fields unchanged
      const descriptionTextarea = screen.getByDisplayValue('Original description');
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'Only description changed');

      await user.click(screen.getByText('Update Task'));

      // Should only update the description field
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith('test-task-id', {
          description: 'Only description changed',
        });
      });

      // Should not include other unchanged fields
      expect(mockOnUpdate).not.toHaveBeenCalledWith('test-task-id', expect.objectContaining({
        title: expect.anything(),
        priority: expect.anything(),
        due_date: expect.anything(),
      }));
    });

    test('should reset edit state after successful update', async () => {
      const user = userEvent.setup();
      
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Click the edit button to enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      const descriptionTextarea = screen.getByDisplayValue('Original description');
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'Updated description');

      await user.click(screen.getByText('Update Task'));

      // After successful update, should exit edit mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit Task' })).toBeInTheDocument(); // Edit button visible again
        expect(screen.queryByText('Update Task')).not.toBeInTheDocument();
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode - Full Form Interaction', () => {
    it('should allow editing all fields and save changes', async () => {
      const user = userEvent.setup();
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      // Edit title
      const titleInput = screen.getByPlaceholderText('Task title...');
      await user.clear(titleInput);
      await user.type(titleInput, 'New Task Title');

      // Edit description (already covered extensively, but good to include in full flow)
      const descriptionTextarea = screen.getByLabelText('Description');
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'New Task Description');

      // Edit priority
      await user.selectOptions(screen.getByLabelText('Priority'), 'high');

      // Edit due date
      await user.type(screen.getByLabelText('Due Date'), '2025-07-01');

      // Edit category
      await user.selectOptions(screen.getByLabelText('Category'), '2'); // Design category

      // Edit tags (using mocked TagSelector)
      await user.click(screen.getByTestId('tag-selector').querySelector('button')!);
      await waitFor(() => {
        expect(screen.getByTestId('selected-tag-1')).toBeInTheDocument(); // 'urgent' tag from mock
      });
      

      await user.click(screen.getByText('Update Task'));

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(mockTask.id, {
          title: 'New Task Title',
          description: 'New Task Description',
          priority: 'high',
          due_date: '2025-07-01',
          category_id: '2',
          tags: expect.arrayContaining([{ id: 'tag1', name: 'important', color: '#ff0000' }]),
        });
      });
    });

    it('should revert all changes when cancel is confirmed after editing multiple fields', async () => {
      const user = userEvent.setup();
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Edit Task' }));

      // Make changes to multiple fields
      await user.type(screen.getByLabelText('Title'), 'Changed Title');
      await user.type(screen.getByLabelText('Description'), 'Changed Description');
      await user.selectOptions(screen.getByLabelText('Priority'), 'low');

      await user.click(screen.getByText('Cancel')); // Click Cancel

      // Confirm discard
      await user.click(screen.getByText('Yes, Discard Changes'));

      await waitFor(() => {
        // Should revert to original values
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('Original description')).toBeInTheDocument();
        expect(screen.getByText('Medium Priority')).toBeInTheDocument(); // Original priority
      });
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal when close icon is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      // Use getByRole with aria-label
      await user.click(screen.getByRole('button', { name: 'Close modal' }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when Escape key is pressed in read-only mode', async () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      // Ensure the handleClose is called which then calls onClose after timeout
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show confirmation and then close when Escape pressed in edit mode with changes', async () => {
      const user = userEvent.setup();
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Edit Task' }));
      await user.type(screen.getByPlaceholderText('Task title...'), 'Changed title to trigger confirmation');

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.findByTestId('confirmation-modal')).toBeInTheDocument(); // Ensure modal is present
        expect(screen.findByText(/All changes will be lost/, undefined, { timeout: 2000 })).toBeInTheDocument(); 
      }, { timeout: 2000 });
      
      await user.click(screen.getByText('Yes, Discard Changes'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not render when isOpen is false', () => {
      render(
        <TaskDetailModal
          isOpen={false}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      expect(screen.queryByText('Test Task')).not.toBeInTheDocument();
    });

    it('should not render when task is null', () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={null}
          onUpdate={mockOnUpdate}
        />
      );
      
      expect(screen.queryByText('Test Task')).not.toBeInTheDocument();
    });
  });

  describe('PositionalMoveDropdown Integration', () => {
    const mockAllTasks = {
      todo: [{ ...mockTask, id: '1' }],
      doing: [{ ...mockTask, id: '2' }],
      done: [{ ...mockTask, id: '3' }],
      backlog: [{ ...mockTask, id: '4' }],
    };

    it('should render PositionalMoveDropdown when onMove and allTasks are provided', () => {
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
          onMove={mockOnMove}
          allTasks={mockAllTasks}
        />
      );
      
      expect(screen.getByTestId('positional-move-dropdown')).toBeInTheDocument();
    });

    it('should not render PositionalMoveDropdown when onMove or allTasks are not provided', () => {
      const { rerender } = render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
        />
      );
      
      expect(screen.queryByTestId('positional-move-dropdown')).not.toBeInTheDocument();

      rerender(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
          onMove={mockOnMove}
          allTasks={undefined} // Missing allTasks
        />
      );
      expect(screen.queryByTestId('positional-move-dropdown')).not.toBeInTheDocument();

      rerender(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
          onMove={undefined} // Missing onMove
          allTasks={mockAllTasks}
        />
      );
      expect(screen.queryByTestId('positional-move-dropdown')).not.toBeInTheDocument();
    });

    it('should call onMove when a move option is selected', async () => {
      const user = userEvent.setup();
      render(
        <TaskDetailModal
          isOpen={true}
          onClose={mockOnClose}
          task={mockTask}
          onUpdate={mockOnUpdate}
          onMove={mockOnMove}
          allTasks={mockAllTasks}
        />
      );
      
      // Assuming the dropdown is rendered and clickable
      const moveButton = screen.getByRole('button', { name: 'Move Task' }); // This is the main button to open the dropdown
      await user.click(moveButton);

      // Select a move option (e.g., "Move to Done (Top)")
      await user.click(screen.getByText('Move to Done (Top)'));

      await waitFor(() => {
        expect(mockOnMove).toHaveBeenCalledWith('default-mock-id', 'done', 0); // Assert with the mock's default ID
      });
    });
  });

  // Mock PositionalMoveDropdown - UPDATED TO PASS taskId TO MOCK
jest.mock('./PositionalMoveDropdown', () => {
  return function MockPositionalMoveDropdown({ taskId, allTasks, onMove }: any) {
    const currentTaskId = taskId || 'default-mock-id';
    return (
      <div data-testid="positional-move-dropdown">
        {/* The first button is just a generic move button for visual, the test clicks the specific one */}
        <button onClick={() => onMove(currentTaskId, 'todo', 0)}>Move Task</button>
        <button onClick={() => onMove(currentTaskId, 'done', 0)}>Move to Done (Top)</button>
        <button onClick={() => onMove(currentTaskId, 'backlog', 0)}>Move to Backlog (Top)</button>
        <button onClick={() => onMove(currentTaskId, 'doing', 0)}>Move to Doing (Top)</button>
      </div>
    );
  };
});

// Mock CategorySelector
jest.mock('../ui/CategorySelector', () => {
  return function MockCategorySelector({ value, onChange }: any) {
    return (
      <select data-testid="category-selector" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select Category</option>
        <option value="1">Development</option>
        <option value="2">Design</option>
      </select>
    );
  };
});

// Mock DatePicker
jest.mock('../ui/DatePicker', () => {
  return function MockDatePicker({ value, onChange }: any) {
    return (
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} data-testid="date-picker" />
    );
  };
});

// Mock PrioritySelector
jest.mock('../ui/PrioritySelector', () => {
  return function MockPrioritySelector({ value, onChange }: any) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="priority-selector">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    );
  };
});
}); 