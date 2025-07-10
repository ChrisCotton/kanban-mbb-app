import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TaskModal from './TaskModal';
import { Task } from '../../lib/database/kanban-queries';

// Mock the hooks
jest.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: '1', name: 'Development', hourly_rate: 100 },
      { id: '2', name: 'Design', hourly_rate: 80 },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../hooks/useTags', () => ({
  useTags: () => ({
    tags: [
      { id: '1', name: 'urgent', color: '#ef4444' },
      { id: '2', name: 'frontend', color: '#3b82f6' },
    ],
    isLoading: false,
    error: null,
    createTag: jest.fn(),
  }),
}));

jest.mock('../../hooks/useSubtasks', () => ({
  useSubtasks: () => ({
    subtasks: [],
    isLoading: false,
    error: null,
    addSubtask: jest.fn(),
    updateSubtask: jest.fn(),
    deleteSubtask: jest.fn(),
    toggleSubtask: jest.fn(),
    reorderSubtasks: jest.fn(),
  }),
}));

// Mock TagSelector component
jest.mock('../../components/ui/TagSelector', () => {
  return function MockTagSelector({ selectedTags, onTagsChange }: any) {
    return (
      <div data-testid="tag-selector">
        <button
          onClick={() => onTagsChange([...selectedTags, { id: '1', name: 'urgent', color: '#ef4444' }])}
        >
          Add Tag
        </button>
        {selectedTags.map((tag: any) => (
          <span key={tag.id} data-testid={`selected-tag-${tag.id}`}>
            {tag.name}
          </span>
        ))}
      </div>
    );
  };
});

// Mock SubtaskList component
jest.mock('./SubtaskList', () => {
  return function MockSubtaskList({ taskId }: any) {
    return <div data-testid="subtask-list">Subtasks for task {taskId}</div>;
  };
});

const mockTask: Task = {
  id: 'test-task-1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'todo',
  priority: 'medium',
  due_date: '2025-01-15',
  category_id: '1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  user_id: 'test-user',
  order_index: 0,
};

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  onSubmit: jest.fn(),
};

describe('TaskModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders create modal with correct title', () => {
      render(<TaskModal {...defaultProps} />);
      
      expect(screen.getByText('Create New Task')).toBeInTheDocument();
      expect(screen.getByText('Create Task')).toBeInTheDocument();
    });

    it('renders all form fields for creation', () => {
      render(<TaskModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('does not show subtasks section for new tasks', () => {
      render(<TaskModal {...defaultProps} />);
      
      expect(screen.queryByTestId('subtask-list')).not.toBeInTheDocument();
    });

    it('submits form with correct data', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.type(screen.getByLabelText('Title'), 'New Task');
      await user.type(screen.getByLabelText('Description'), 'New Description');
      await user.selectOptions(screen.getByLabelText('Priority'), 'high');
      await user.type(screen.getByLabelText('Due Date'), '2025-02-01');
      await user.selectOptions(screen.getByLabelText('Category'), '1');
      
      await user.click(screen.getByText('Create Task'));
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          title: 'New Task',
          description: 'New Description',
          priority: 'high',
          due_date: '2025-02-01',
          category_id: '1',
          tags: [],
        });
      });
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.click(screen.getByText('Create Task'));
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('handles tag selection', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.click(screen.getByText('Add Tag'));
      
      expect(screen.getByTestId('selected-tag-1')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const editProps = {
      ...defaultProps,
      task: mockTask,
    };

    it('renders edit modal with correct title', () => {
      render(<TaskModal {...editProps} />);
      
      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByText('Update Task')).toBeInTheDocument();
    });

    it('pre-fills form with task data', () => {
      render(<TaskModal {...editProps} />);
      
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('medium')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2025-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('shows subtasks section for existing tasks', () => {
      render(<TaskModal {...editProps} />);
      
      expect(screen.getByTestId('subtask-list')).toBeInTheDocument();
      expect(screen.getByText('Subtasks for task test-task-1')).toBeInTheDocument();
    });

    it('submits updated task data', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...editProps} />);
      
      await user.clear(screen.getByLabelText('Title'));
      await user.type(screen.getByLabelText('Title'), 'Updated Task');
      
      await user.click(screen.getByText('Update Task'));
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          title: 'Updated Task',
          description: 'Test Description',
          priority: 'medium',
          due_date: '2025-01-15',
          category_id: '1',
          tags: [],
        });
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty title', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.click(screen.getByText('Create Task'));
      
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('shows error for title too long', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      const longTitle = 'a'.repeat(256);
      await user.type(screen.getByLabelText('Title'), longTitle);
      await user.click(screen.getByText('Create Task'));
      
      await waitFor(() => {
        expect(screen.getByText('Title must be less than 255 characters')).toBeInTheDocument();
      });
    });

    it('shows error for past due date', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.type(screen.getByLabelText('Title'), 'Valid Title');
      await user.type(screen.getByLabelText('Due Date'), '2020-01-01');
      await user.click(screen.getByText('Create Task'));
      
      await waitFor(() => {
        expect(screen.getByText('Due date cannot be in the past')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.click(screen.getByLabelText('Close'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes modal when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.click(screen.getByText('Cancel'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes modal when Escape key is pressed', async () => {
      render(<TaskModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not render when isOpen is false', () => {
      render(<TaskModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
    });
  });

  describe('Priority Selection', () => {
    it('renders all priority options', () => {
      render(<TaskModal {...defaultProps} />);
      
      const prioritySelect = screen.getByLabelText('Priority');
      expect(prioritySelect).toBeInTheDocument();
      
      expect(screen.getByRole('option', { name: 'Low' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Medium' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Urgent' })).toBeInTheDocument();
    });

    it('updates priority when selection changes', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.selectOptions(screen.getByLabelText('Priority'), 'urgent');
      
      expect(screen.getByDisplayValue('urgent')).toBeInTheDocument();
    });
  });

  describe('Category Selection', () => {
    it('renders category options from hook', () => {
      render(<TaskModal {...defaultProps} />);
      
      expect(screen.getByRole('option', { name: 'Development' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Design' })).toBeInTheDocument();
    });

    it('updates category when selection changes', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      await user.selectOptions(screen.getByLabelText('Category'), '2');
      
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TaskModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('focuses first input when opened', async () => {
      render(<TaskModal {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toHaveFocus();
      });
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();
      render(<TaskModal {...defaultProps} />);
      
      // Tab through all focusable elements
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();
      
      // Should cycle back to first element
      expect(screen.getByLabelText('Title')).toHaveFocus();
    });
  });

  describe('Loading States', () => {
    it('disables submit button while submitting', async () => {
      const user = userEvent.setup();
      const slowOnSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<TaskModal {...defaultProps} onSubmit={slowOnSubmit} />);
      
      await user.type(screen.getByLabelText('Title'), 'Test Task');
      await user.click(screen.getByText('Create Task'));
      
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(screen.getByText('Creating...')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when submission fails', async () => {
      const user = userEvent.setup();
      const failingOnSubmit = jest.fn(() => Promise.reject(new Error('Submission failed')));
      
      render(<TaskModal {...defaultProps} onSubmit={failingOnSubmit} />);
      
      await user.type(screen.getByLabelText('Title'), 'Test Task');
      await user.click(screen.getByText('Create Task'));
      
      await waitFor(() => {
        expect(screen.getByText('Failed to create task. Please try again.')).toBeInTheDocument();
      });
    });
  });
}); 