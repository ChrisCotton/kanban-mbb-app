import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GoalDetailPanel from '../GoalDetailPanel';
import { useGoalsStore } from '../../../stores/goals.store';
import { GoalWithRelations, GoalMilestone } from '../../../types/goals';
import { mockGoal, TEST_CATEGORY_ID } from '../../../test/fixtures/goals';

// Mock Goals store
jest.mock('../../../stores/goals.store', () => ({
  useGoalsStore: jest.fn(),
}));

// Mock GoalModal
jest.mock('../GoalModal', () => {
  return function MockGoalModal({
    isOpen,
    onClose,
    goal,
  }: {
    isOpen: boolean;
    onClose: () => void;
    goal?: any;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="goal-modal">
        {goal ? 'Edit Goal' : 'Create Goal'}
      </div>
    );
  };
});

const createMockGoalWithRelations = (
  overrides?: Partial<GoalWithRelations>
): GoalWithRelations => {
  return {
    ...mockGoal,
    category: {
      id: TEST_CATEGORY_ID,
      name: 'Development',
      color: '#8B5CF6',
    },
    vision_images: [
      {
        id: 'img-1',
        url: 'http://example.com/img1.jpg',
        thumbnail_url: 'http://example.com/img1-thumb.jpg',
      },
    ],
    milestones: [],
    linked_tasks_count: 0,
    ...overrides,
  };
};

describe('GoalDetailPanel', () => {
  const mockOnClose = jest.fn();
  const mockOnEdit = jest.fn();
  const mockCompleteGoal = jest.fn();
  const mockDeleteGoal = jest.fn();
  const mockUpdateGoal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useGoalsStore as jest.Mock).mockReturnValue({
      completeGoal: mockCompleteGoal,
      deleteGoal: mockDeleteGoal,
      updateGoal: mockUpdateGoal,
    });

    mockCompleteGoal.mockResolvedValue({ ...mockGoal, status: 'completed' });
    mockDeleteGoal.mockResolvedValue(undefined);
    mockUpdateGoal.mockResolvedValue(mockGoal);
  });

  describe('Basic Rendering', () => {
    it('renders goal title and description', async () => {
      const goal = createMockGoalWithRelations({
        title: 'Test Goal',
        description: 'Test description',
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Test Goal')).toBeInTheDocument();
        expect(screen.getByText('Test description')).toBeInTheDocument();
      });
    });

    it('does not render when isOpen is false', () => {
      const goal = createMockGoalWithRelations();
      render(<GoalDetailPanel goal={goal} isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText(goal.title)).not.toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows progress bar and percentage', async () => {
      const goal = createMockGoalWithRelations({
        progress_value: 65,
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText(/65%/i)).toBeInTheDocument();
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('aria-valuenow', '65');
      });
    });
  });

  describe('Due Date Display', () => {
    it('displays due date with overdue indicator', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const goal = createMockGoalWithRelations({
        target_date: pastDate.toISOString().split('T')[0],
        status: 'active',
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const dateElement = screen.getByText(/overdue/i);
        expect(dateElement).toBeInTheDocument();
      });
    });

    it('displays due date without overdue indicator for completed goals', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const goal = createMockGoalWithRelations({
        target_date: pastDate.toISOString().split('T')[0],
        status: 'completed',
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        // Should show date but not overdue indicator
        expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Linked Tasks', () => {
    it('shows linked tasks list', async () => {
      const goal = createMockGoalWithRelations({
        linked_tasks_count: 3,
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText(/linked tasks/i)).toBeInTheDocument();
        expect(screen.getByText(/3/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when no linked tasks', async () => {
      const goal = createMockGoalWithRelations({
        linked_tasks_count: 0,
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText(/no linked tasks/i)).toBeInTheDocument();
      });
    });
  });

  describe('Milestones', () => {
    it('shows milestones with checkboxes', async () => {
      const milestones: GoalMilestone[] = [
        {
          id: 'milestone-1',
          goal_id: mockGoal.id,
          title: 'Milestone 1',
          is_complete: false,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        },
        {
          id: 'milestone-2',
          goal_id: mockGoal.id,
          title: 'Milestone 2',
          is_complete: true,
          display_order: 1,
          created_at: '2026-01-01T00:00:00Z',
          completed_at: '2026-01-15T00:00:00Z',
        },
      ];

      const goal = createMockGoalWithRelations({
        milestones,
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Milestone 1')).toBeInTheDocument();
        expect(screen.getByText('Milestone 2')).toBeInTheDocument();
        
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(2);
        expect(checkboxes[0]).not.toBeChecked();
        expect(checkboxes[1]).toBeChecked();
      });
    });

    it('milestone checkbox toggles completion', async () => {
      const milestones: GoalMilestone[] = [
        {
          id: 'milestone-1',
          goal_id: mockGoal.id,
          title: 'Milestone 1',
          is_complete: false,
          display_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          completed_at: null,
        },
      ];

      const goal = createMockGoalWithRelations({
        milestones,
        progress_type: 'milestone_based', // Must be milestone_based for toggle to work
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
      });

      await act(async () => {
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
      });

      // Milestone toggle should call updateGoal for milestone_based goals
      await waitFor(() => {
        expect(mockUpdateGoal).toHaveBeenCalled();
      });
    });
  });

  describe('Actions', () => {
    it('edit button opens modal', async () => {
      const goal = createMockGoalWithRelations();

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} onEdit={mockOnEdit} />);
      });

      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit/i });
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('goal-modal')).toBeInTheDocument();
      });
    });

    it('complete button triggers confirmation', async () => {
      const goal = createMockGoalWithRelations({
        status: 'active',
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const completeButton = screen.getByRole('button', { name: /complete/i });
        fireEvent.click(completeButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
        expect(screen.getByText(/complete goal/i)).toBeInTheDocument();
      });
    });

    it('archive button triggers confirmation', async () => {
      const goal = createMockGoalWithRelations({
        status: 'active',
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const archiveButton = screen.getByRole('button', { name: /archive/i });
        fireEvent.click(archiveButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
        expect(screen.getByText(/archive goal/i)).toBeInTheDocument();
      });
    });

    it('back button closes panel', async () => {
      const goal = createMockGoalWithRelations();

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back|close/i });
        fireEvent.click(backButton);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Confirmation Dialogs', () => {
    it('confirms and completes goal', async () => {
      const goal = createMockGoalWithRelations({
        status: 'active',
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const completeButton = screen.getByRole('button', { name: /complete/i });
        fireEvent.click(completeButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /yes|confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockCompleteGoal).toHaveBeenCalledWith(goal.id);
      });
    });

    it('confirms and archives goal', async () => {
      const goal = createMockGoalWithRelations({
        status: 'active',
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const archiveButton = screen.getByRole('button', { name: /archive/i });
        fireEvent.click(archiveButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /yes|confirm/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockDeleteGoal).toHaveBeenCalledWith(goal.id);
      });
    });

    it('cancels confirmation dialog', async () => {
      const goal = createMockGoalWithRelations({
        status: 'active',
      });

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const completeButton = screen.getByRole('button', { name: /complete/i });
        fireEvent.click(completeButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel|no/i });
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
        expect(mockCompleteGoal).not.toHaveBeenCalled();
      });
    });
  });

  describe('Panel Animation', () => {
    it('applies slide-in animation when opening', async () => {
      const goal = createMockGoalWithRelations();

      await act(async () => {
        render(<GoalDetailPanel goal={goal} isOpen={true} onClose={mockOnClose} />);
      });

      await waitFor(() => {
        const panel = screen.getByTestId('goal-detail-panel');
        expect(panel).toHaveClass(/translate-x-0|slide-in/);
      });
    });
  });
});
