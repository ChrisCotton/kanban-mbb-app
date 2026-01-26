import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/router';
import GoalsPage from '../../pages/goals';
import { useGoalsStore } from '../../src/stores/goals.store';
import { GoalWithRelations } from '../../src/types/goals';
import { mockGoal, mockGoalMinimal, mockGoalCompleted, TEST_CATEGORY_ID } from '../../src/test/fixtures/goals';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock Layout component
jest.mock('../../components/layout/Layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock GoalCard component
jest.mock('../../src/components/goals/GoalCard', () => {
  return function MockGoalCard({
    goal,
    onClick,
  }: {
    goal: GoalWithRelations;
    onClick: () => void;
  }) {
    return (
      <div data-testid="goal-card" onClick={onClick}>
        {goal.title}
      </div>
    );
  };
});

// Mock Goals store
jest.mock('../../src/stores/goals.store', () => ({
  useGoalsStore: jest.fn(),
}));

// Mock supabase
jest.mock('../../lib/supabase', () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  }));

  return {
    supabase: {
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: { id: 'test-user-id' } },
            error: null,
          })
        ),
      },
      from: mockFrom,
    },
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
    vision_images: [],
    ...overrides,
  };
};

describe('Goals Page', () => {
  const mockPush = jest.fn();
  const mockFetchGoals = jest.fn();
  const mockCreateGoal = jest.fn();
  const mockSetActiveGoalFilter = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      pathname: '/goals',
    });

    (useGoalsStore as jest.Mock).mockReturnValue({
      goals: [],
      isLoading: false,
      error: null,
      activeGoalFilter: null,
      fetchGoals: mockFetchGoals,
      createGoal: mockCreateGoal,
      setActiveGoalFilter: mockSetActiveGoalFilter,
      getActiveGoals: jest.fn(() => []),
      getCompletedGoals: jest.fn(() => []),
    });
  });

  describe('Basic Rendering', () => {
    it('renders page title "Goals"', async () => {
      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('Goals')).toBeInTheDocument();
      });
    });

    it('renders "+ New Goal" button', async () => {
      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText(/New Goal/i)).toBeInTheDocument();
      });
    });

    it('shows loading skeleton while fetching', async () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [],
        isLoading: true,
        error: null,
        activeGoalFilter: null,
        fetchGoals: mockFetchGoals,
        createGoal: mockCreateGoal,
        setActiveGoalFilter: mockSetActiveGoalFilter,
        getActiveGoals: jest.fn(() => []),
        getCompletedGoals: jest.fn(() => []),
      });

      await act(async () => {
        render(<GoalsPage />);
      });

      // Wait for user to load, then check for skeleton
      await waitFor(() => {
        // Should show skeleton elements when store isLoading is true
        const skeletons = screen.queryAllByTestId('skeleton');
        expect(skeletons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Goal Cards', () => {
    it('renders goal cards in grid layout', async () => {
      const goals = [
        createMockGoalWithRelations({ ...mockGoal, id: 'goal-1' }),
        createMockGoalWithRelations({ ...mockGoalMinimal, id: 'goal-2' }),
      ];

      (useGoalsStore as jest.Mock).mockReturnValue({
        goals,
        isLoading: false,
        error: null,
        activeGoalFilter: null,
        fetchGoals: mockFetchGoals,
        createGoal: mockCreateGoal,
        setActiveGoalFilter: mockSetActiveGoalFilter,
        getActiveGoals: jest.fn(() => goals.filter((g) => g.status === 'active')),
        getCompletedGoals: jest.fn(() => []),
      });

      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        const goalCards = screen.getAllByTestId('goal-card');
        expect(goalCards).toHaveLength(2);
        expect(screen.getByText(mockGoal.title)).toBeInTheDocument();
        expect(screen.getByText(mockGoalMinimal.title)).toBeInTheDocument();
      });
    });

    it('shows empty state when no goals', async () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [],
        isLoading: false,
        error: null,
        activeGoalFilter: null,
        fetchGoals: mockFetchGoals,
        createGoal: mockCreateGoal,
        setActiveGoalFilter: mockSetActiveGoalFilter,
        getActiveGoals: jest.fn(() => []),
        getCompletedGoals: jest.fn(() => []),
      });

      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        // Should show empty state message
        expect(screen.getByText('No Goals Yet')).toBeInTheDocument();
      });
    });
  });

  describe('Filter/Sort Controls', () => {
    it('renders filter dropdown', async () => {
      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        // Should have filter controls - check for Status select
        expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      });
    });

    it('renders sort dropdown', async () => {
      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        // Should have sort controls - check for Sort by select
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('opens creation modal on "+ New Goal" button click', async () => {
      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        const newGoalButton = screen.getByText(/New Goal/i);
        fireEvent.click(newGoalButton);
      });

      // Should show modal or form
      await waitFor(() => {
        const modal = screen.queryByTestId(/modal|form|create/i);
        expect(modal).toBeInTheDocument();
      });
    });

    it('opens detail panel on card click', async () => {
      const goal = createMockGoalWithRelations();

      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [goal],
        isLoading: false,
        error: null,
        activeGoalFilter: null,
        fetchGoals: mockFetchGoals,
        createGoal: mockCreateGoal,
        setActiveGoalFilter: mockSetActiveGoalFilter,
        getActiveGoals: jest.fn(() => [goal]),
        getCompletedGoals: jest.fn(() => []),
      });

      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        const goalCard = screen.getByTestId('goal-card');
        fireEvent.click(goalCard);
      });

      // Should open detail panel or navigate
      expect(mockSetActiveGoalFilter).toHaveBeenCalledWith(goal.id);
    });
  });

  describe('Completed Goals Section', () => {
    it('renders completed goals section', async () => {
      const completedGoal = createMockGoalWithRelations({
        ...mockGoalCompleted,
        id: 'completed-1',
      });

      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [completedGoal],
        isLoading: false,
        error: null,
        activeGoalFilter: null,
        fetchGoals: mockFetchGoals,
        createGoal: mockCreateGoal,
        setActiveGoalFilter: mockSetActiveGoalFilter,
        getActiveGoals: jest.fn(() => []),
        getCompletedGoals: jest.fn(() => [completedGoal]),
      });

      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText(/completed goals/i)).toBeInTheDocument();
      });
    });

    it('collapsible completed goals section', async () => {
      const completedGoal = createMockGoalWithRelations({
        ...mockGoalCompleted,
        id: 'completed-1',
      });

      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [completedGoal],
        isLoading: false,
        error: null,
        activeGoalFilter: null,
        fetchGoals: mockFetchGoals,
        createGoal: mockCreateGoal,
        setActiveGoalFilter: mockSetActiveGoalFilter,
        getActiveGoals: jest.fn(() => []),
        getCompletedGoals: jest.fn(() => [completedGoal]),
      });

      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        const toggleButton = screen.getByRole('button', { name: /completed goals/i });
        expect(toggleButton).toBeInTheDocument();
        fireEvent.click(toggleButton);
      });

      // Section should collapse/expand - check for completed goal card
      await waitFor(() => {
        const completedCard = screen.getByText('Completed Goal');
        expect(completedCard).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching', () => {
    it('fetches goals on mount', async () => {
      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        expect(mockFetchGoals).toHaveBeenCalled();
      });
    });

    it('handles fetch errors', async () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [],
        isLoading: false,
        error: 'Failed to fetch goals',
        activeGoalFilter: null,
        fetchGoals: mockFetchGoals,
        createGoal: mockCreateGoal,
        setActiveGoalFilter: mockSetActiveGoalFilter,
        getActiveGoals: jest.fn(() => []),
        getCompletedGoals: jest.fn(() => []),
      });

      await act(async () => {
        render(<GoalsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });
  });
});
