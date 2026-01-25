/**
 * REGRESSION TEST: Task Description Persistence
 * 
 * Bug: Updated task description doesn't persist after saving and reopening task
 * Steps to reproduce:
 * 1. Click Edit Task
 * 2. Change description
 * 3. Click Update Task
 * 4. Close task
 * 5. Re-open task
 * 6. Verify description is still present
 * 
 * This test ensures the description persists correctly.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Task } from '../../lib/database/kanban-queries';

// Mock react-markdown to avoid Jest parsing issues
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: React.ReactNode }) {
    return <div data-testid="markdown">{children}</div>;
  };
});

jest.mock('remark-gfm', () => ({}));
jest.mock('rehype-highlight', () => ({}));

// Mock the useComments hook
jest.mock('../../hooks/useComments', () => ({
  useComments: () => ({
    comments: [],
    isLoading: false,
    error: null,
    addComment: jest.fn(),
    editComment: jest.fn(),
    deleteComment: jest.fn(),
  }),
}));

// Mock useSubtasks
jest.mock('../../hooks/useSubtasks', () => ({
  useSubtasks: () => ({
    subtasks: [],
    isLoading: false,
    error: null,
    addSubtask: jest.fn(),
    updateSubtask: jest.fn(),
    deleteSubtask: jest.fn(),
    toggleSubtask: jest.fn(),
  }),
}));

// Mock useCategories
jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [],
    isLoading: false,
    error: null,
  }),
}));

// Import TaskDetailModal after mocks
import TaskDetailModal from '../../components/kanban/TaskDetailModal';

describe('Task Description Persistence Regression Test', () => {
  const mockTask: Task = {
    id: 'test-task-id',
    user_id: 'test-user-id',
    title: 'Test Task',
    description: 'Original description',
    status: 'backlog',
    priority: 'medium',
    due_date: null,
    order_index: 0,
    category_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockOnUpdate = jest.fn().mockResolvedValue(undefined);
  const mockOnClose = jest.fn();
  const mockOnMove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('REGRESSION: Description persists after update, close, and reopen', async () => {
    const user = userEvent.setup();
    
    // Initial render with original description
    const { rerender } = render(
      <TaskDetailModal
        isOpen={true}
        onClose={mockOnClose}
        task={mockTask}
        onUpdate={mockOnUpdate}
        onMove={mockOnMove}
        allTasks={[mockTask]}
      />
    );

    // Wait for modal to be visible
    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    // Click Edit Task button if it exists (modal might open in edit mode)
    const editButton = screen.queryByText('Edit Task');
    if (editButton) {
      await user.click(editButton);
    }

    // Find the description textarea
    const descriptionTextarea = screen.getByPlaceholderText(/description/i) as HTMLTextAreaElement;
    expect(descriptionTextarea).toBeInTheDocument();
    expect(descriptionTextarea.value).toBe('Original description');

    // Change the description
    await user.clear(descriptionTextarea);
    const newDescription = 'Updated description that should persist';
    await user.type(descriptionTextarea, newDescription);
    expect(descriptionTextarea.value).toBe(newDescription);

    // Click Update Task button
    const updateButton = screen.getByText('Update Task');
    expect(updateButton).not.toBeDisabled();
    await user.click(updateButton);

    // Verify onUpdate was called with the new description
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({
          description: newDescription,
        })
      );
    });

    // Create updated task object (simulating what the API would return)
    const updatedTask: Task = {
      ...mockTask,
      description: newDescription,
      updated_at: new Date().toISOString(),
    };

    // Close the modal
    const cancelButton = screen.queryByText('Cancel') || screen.queryByLabelText(/close/i);
    if (cancelButton) {
      await user.click(cancelButton);
    } else {
      mockOnClose();
    }

    // Reopen the modal with the updated task
    rerender(
      <TaskDetailModal
        isOpen={true}
        onClose={mockOnClose}
        task={updatedTask}
        onUpdate={mockOnUpdate}
        onMove={mockOnMove}
        allTasks={[updatedTask]}
      />
    );

    // Wait for modal to reopen
    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    // Click Edit Task to see the description field
    const editButtonAfterReopen = screen.queryByText('Edit Task');
    if (editButtonAfterReopen) {
      await user.click(editButtonAfterReopen);
    }

    // Verify the description is still present in the textarea or displayed
    await waitFor(() => {
      const descriptionField = screen.queryByPlaceholderText(/description/i) as HTMLTextAreaElement | null;
      const descriptionDisplay = screen.queryByText(newDescription);
      
      // Description should be either in textarea (edit mode) or displayed (view mode)
      expect(descriptionField?.value || descriptionDisplay?.textContent).toContain(newDescription);
    });
  });

  test('REGRESSION: Empty description persists correctly', async () => {
    const user = userEvent.setup();
    
    const taskWithDescription: Task = {
      ...mockTask,
      description: 'Has a description',
    };

    render(
      <TaskDetailModal
        isOpen={true}
        onClose={mockOnClose}
        task={taskWithDescription}
        onUpdate={mockOnUpdate}
        onMove={mockOnMove}
        allTasks={[taskWithDescription]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    // Click Edit Task if needed
    const editButton = screen.queryByText('Edit Task');
    if (editButton) {
      await user.click(editButton);
    }

    // Clear the description
    const descriptionTextarea = screen.getByPlaceholderText(/description/i) as HTMLTextAreaElement;
    await user.clear(descriptionTextarea);
    expect(descriptionTextarea.value).toBe('');

    // Update task
    const updateButton = screen.getByText('Update Task');
    await user.click(updateButton);

    // Verify update was called with empty description
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        taskWithDescription.id,
        expect.objectContaining({
          description: '',
        })
      );
    });
  });

  test('REGRESSION: Description update includes special characters correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TaskDetailModal
        isOpen={true}
        onClose={mockOnClose}
        task={mockTask}
        onUpdate={mockOnUpdate}
        onMove={mockOnMove}
        allTasks={[mockTask]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    const editButton = screen.queryByText('Edit Task');
    if (editButton) {
      await user.click(editButton);
    }

    // Update description with special characters
    const descriptionTextarea = screen.getByPlaceholderText(/description/i) as HTMLTextAreaElement;
    await user.clear(descriptionTextarea);
    const specialDescription = 'Multi-line\ndescription\nwith special chars: !@#$%';
    await user.type(descriptionTextarea, specialDescription);

    // Update task
    await user.click(screen.getByText('Update Task'));

    // Verify the exact description was sent
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({
          description: specialDescription,
        })
      );
    });

    // Verify the update payload contains description
    const updateCall = mockOnUpdate.mock.calls[0];
    expect(updateCall[1]).toHaveProperty('description');
    expect(updateCall[1].description).toBe(specialDescription);
  });
});
