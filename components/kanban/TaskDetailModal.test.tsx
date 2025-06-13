import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskDetailModal from './TaskDetailModal';
import { Task } from '../../lib/database/kanban-queries';

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
  created_at: '2025-06-12T10:00:00Z',
  updated_at: '2025-06-12T10:00:00Z',
  user_id: 'test-user-id',
};

describe('TaskDetailModal - Description Update Regression Tests', () => {
  const mockOnClose = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnUpdate.mockResolvedValue(undefined);
  });

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

    // Modal should open in edit mode by default
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

    const specialDescription = `## CHANGED THIS

Special chars: !@#$%^&*()
Line 1
Line 2
- Bullet point
1. Numbered item`;

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

    const descriptionTextarea = screen.getByDisplayValue('Original description');
    await user.clear(descriptionTextarea);
    await user.type(descriptionTextarea, 'Updated description');

    await user.click(screen.getByText('Update Task'));

    // After successful update, should exit edit mode
    await waitFor(() => {
      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.queryByText('Update Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });
}); 