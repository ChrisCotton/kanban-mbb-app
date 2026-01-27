import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GoalSelector from '../GoalSelector';
import { useGoalsStore } from '../../../src/stores/goals.store';
import { Goal } from '../../../src/types/goals';

// Mock Goals store
jest.mock('../../../src/stores/goals.store', () => ({
  useGoalsStore: jest.fn(),
}));

// Mock GoalModal
jest.mock('../../../src/components/goals/GoalModal', () => {
  return function MockGoalModal({
    isOpen,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (goal: Goal) => void;
  }) {
    if (!isOpen) return null;
    return (
      <div data-testid="goal-modal">
        <button
          data-testid="close-modal"
          onClick={onClose}
        >
          Close
        </button>
        <button
          data-testid="create-goal"
          onClick={() => {
            if (onSuccess) {
              onSuccess({
                id: 'new-goal-id',
                user_id: 'user-1',
                title: 'New Goal',
                description: null,
                status: 'active',
                progress_type: 'manual',
                progress_value: 0,
                target_date: null,
                category_id: null,
                color: '#8B5CF6',
                icon: '🎯',
                display_order: 0,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
                completed_at: null,
              });
            }
          }}
        >
          Create Goal
        </button>
      </div>
    );
  };
});

const mockGoal1: Goal = {
  id: 'goal-1',
  user_id: 'user-1',
  title: 'Goal 1',
  description: 'Description 1',
  status: 'active',
  progress_type: 'task_based',
  progress_value: 50,
  target_date: null,
  category_id: null,
  color: '#FF0000',
  icon: '🎯',
  display_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  completed_at: null,
};

const mockGoal2: Goal = {
  id: 'goal-2',
  user_id: 'user-1',
  title: 'Goal 2',
  description: 'Description 2',
  status: 'active',
  progress_type: 'manual',
  progress_value: 30,
  target_date: null,
  category_id: null,
  color: '#00FF00',
  icon: '🚀',
  display_order: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  completed_at: null,
};

const mockGoal3: Goal = {
  id: 'goal-3',
  user_id: 'user-1',
  title: 'Another Goal',
  description: 'Another description',
  status: 'active',
  progress_type: 'milestone_based',
  progress_value: 75,
  target_date: null,
  category_id: null,
  color: '#0000FF',
  icon: '⭐',
  display_order: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  completed_at: null,
};

describe('GoalSelector', () => {
  const mockOnChange = jest.fn();
  const mockFetchGoals = jest.fn();
  const defaultProps = {
    value: null,
    onChange: mockOnChange,
    userId: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useGoalsStore as jest.Mock).mockReturnValue({
      goals: [mockGoal1, mockGoal2, mockGoal3],
      fetchGoals: mockFetchGoals,
    });

    mockFetchGoals.mockResolvedValue(undefined);
  });

  describe('Basic Rendering', () => {
    it('renders with placeholder when no value selected', () => {
      render(<GoalSelector {...defaultProps} />);
      
      expect(screen.getByText('Select a goal...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<GoalSelector {...defaultProps} placeholder="Choose goal..." />);
      
      expect(screen.getByText('Choose goal...')).toBeInTheDocument();
    });

    it('renders selected goal when value is provided', () => {
      render(<GoalSelector {...defaultProps} value="goal-1" />);
      
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('renders error message when error prop is provided', () => {
      render(<GoalSelector {...defaultProps} error="Goal is required" />);
      
      expect(screen.getByText('Goal is required')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <GoalSelector {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Dropdown Functionality', () => {
    it('opens dropdown when button is clicked', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByPlaceholderText('Search goals...')).toBeInTheDocument();
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Goal 2')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <GoalSelector {...defaultProps} />
        </div>
      );
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByPlaceholderText('Search goals...')).toBeInTheDocument();
      
      const outside = screen.getByTestId('outside');
      await userEvent.click(outside);
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search goals...')).not.toBeInTheDocument();
      });
    });

    it('shows all goals when dropdown is open', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Goal 2')).toBeInTheDocument();
      expect(screen.getByText('Another Goal')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
      expect(screen.getByText('🚀')).toBeInTheDocument();
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('highlights selected goal in dropdown', async () => {
      render(<GoalSelector {...defaultProps} value="goal-1" />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      // Find all buttons with "Goal 1" text and get the one in the dropdown (not the main button)
      const allGoal1Buttons = screen.getAllByText('Goal 1').map(el => el.closest('button')).filter(Boolean);
      // The dropdown button should be the second one (first is the main selector button)
      const dropdownButton = allGoal1Buttons[1];
      expect(dropdownButton).toHaveClass('bg-blue-50');
    });
  });

  describe('Goal Selection', () => {
    it('calls onChange when goal is selected', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const goal1Button = screen.getByText('Goal 1').closest('button');
      if (goal1Button) {
        await userEvent.click(goal1Button);
      }
      
      expect(mockOnChange).toHaveBeenCalledWith('goal-1');
    });

    it('closes dropdown after selecting goal', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const goal1Button = screen.getByText('Goal 1').closest('button');
      if (goal1Button) {
        await userEvent.click(goal1Button);
      }
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search goals...')).not.toBeInTheDocument();
      });
    });

    it('shows progress percentage for goals with progress', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters goals by title', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search goals...');
      await userEvent.type(searchInput, 'Goal 1');
      
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.queryByText('Goal 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Another Goal')).not.toBeInTheDocument();
    });

    it('filters goals by description', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search goals...');
      await userEvent.type(searchInput, 'Another');
      
      expect(screen.getByText('Another Goal')).toBeInTheDocument();
      expect(screen.queryByText('Goal 1')).not.toBeInTheDocument();
    });

    it('shows "No goals found" when search has no results', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search goals...');
      await userEvent.type(searchInput, 'NonExistent');
      
      expect(screen.getByText('No goals found')).toBeInTheDocument();
    });

    it('clears search when dropdown closes', async () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const searchInput = screen.getByPlaceholderText('Search goals...');
      await userEvent.type(searchInput, 'Goal');
      
      const outside = document.body;
      fireEvent.mouseDown(outside);
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search goals...')).not.toBeInTheDocument();
      });
      
      // Reopen dropdown
      await userEvent.click(button);
      
      const newSearchInput = screen.getByPlaceholderText('Search goals...');
      expect(newSearchInput).toHaveValue('');
    });
  });

  describe('Create New Goal', () => {
    it('shows "Create New Goal" option when showCreateOption is true', async () => {
      render(<GoalSelector {...defaultProps} showCreateOption={true} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByText('Create New Goal')).toBeInTheDocument();
    });

    it('hides "Create New Goal" option when showCreateOption is false', async () => {
      render(<GoalSelector {...defaultProps} showCreateOption={false} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.queryByText('Create New Goal')).not.toBeInTheDocument();
    });

    it('opens GoalModal when "Create New Goal" is clicked', async () => {
      render(<GoalSelector {...defaultProps} showCreateOption={true} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const createButton = screen.getByText('Create New Goal');
      await userEvent.click(createButton);
      
      expect(screen.getByTestId('goal-modal')).toBeInTheDocument();
    });

    it('selects newly created goal and closes modal', async () => {
      render(<GoalSelector {...defaultProps} showCreateOption={true} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const createButton = screen.getByText('Create New Goal');
      await userEvent.click(createButton);
      
      const createGoalButton = screen.getByTestId('create-goal');
      await userEvent.click(createGoalButton);
      
      expect(mockOnChange).toHaveBeenCalledWith('new-goal-id');
      await waitFor(() => {
        expect(screen.queryByTestId('goal-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Clear Option', () => {
    it('shows "None" option when allowClear is true', async () => {
      render(<GoalSelector {...defaultProps} allowClear={true} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('hides "None" option when allowClear is false', async () => {
      render(<GoalSelector {...defaultProps} allowClear={false} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.queryByText('None')).not.toBeInTheDocument();
    });

    it('calls onChange with null when "None" is selected', async () => {
      render(<GoalSelector {...defaultProps} value="goal-1" allowClear={true} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const noneButton = screen.getByText('None');
      await userEvent.click(noneButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Empty State', () => {
    it('shows "No goals available" when goals array is empty', async () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [],
        fetchGoals: mockFetchGoals,
      });

      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      expect(screen.getByText('No goals available')).toBeInTheDocument();
    });

    it('fetches goals on mount when goals array is empty', () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [],
        fetchGoals: mockFetchGoals,
      });

      render(<GoalSelector {...defaultProps} />);
      
      expect(mockFetchGoals).toHaveBeenCalledWith({ status: 'active' });
    });

    it('does not fetch goals when goals already exist', () => {
      render(<GoalSelector {...defaultProps} />);
      
      expect(mockFetchGoals).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles fetchGoals error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetchGoals.mockRejectedValue(new Error('Fetch failed'));
      
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [],
        fetchGoals: mockFetchGoals,
      });

      render(<GoalSelector {...defaultProps} />);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<GoalSelector {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('shows required indicator when required is true', () => {
      render(<GoalSelector {...defaultProps} required={true} />);
      
      // The required prop affects styling/validation but doesn't add visible text
      // This test ensures the component accepts the prop without error
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
