import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import KanbanBoard from '../../../components/kanban/KanbanBoard';
import { useKanban } from '../../../hooks/useKanban';
import { useGoalsStore } from '../../../src/stores/goals.store';
import { Task } from '../../../lib/database/kanban-queries';

// Mock hooks
jest.mock('../../../hooks/useKanban');
jest.mock('../../../src/stores/goals.store');
jest.mock('../../../hooks/useTaskSearch', () => ({
  useTaskSearch: jest.fn(() => ({
    organizedResults: {},
    searchStats: {},
    isSearching: false,
    searchError: null,
    activeFilters: {},
    isSearchMode: false,
    hasActiveFilters: false,
    performSearch: jest.fn(),
    clearSearch: jest.fn(),
    clearError: jest.fn(),
  })),
}));

jest.mock('../../../hooks/useDragAndDrop', () => ({
  useDragAndDrop: jest.fn(() => ({
    handleDragEnd: jest.fn(),
    handleDragStart: jest.fn(),
    handleDragUpdate: jest.fn(),
  })),
}));

jest.mock('../../../hooks/useMultiSelect', () => ({
  useMultiSelect: jest.fn(() => ({
    selectedTaskIds: [],
    isMultiSelectMode: false,
    toggleTaskSelection: jest.fn(),
    clearSelection: jest.fn(),
    toggleMultiSelectMode: jest.fn(),
  })),
}));

// Mock GoalsHeaderStrip
jest.mock('../../../src/components/goals/GoalsHeaderStrip', () => {
  return function MockGoalsHeaderStrip({
    goals,
    activeGoalId,
    onGoalClick,
  }: {
    goals: any[];
    activeGoalId: string | null;
    onGoalClick: (goalId: string) => void;
  }) {
    return (
      <div data-testid="goals-header-strip">
        {goals.map((goal) => (
          <button
            key={goal.id}
            data-testid={`goal-filter-${goal.id}`}
            onClick={() => onGoalClick(goal.id)}
            className={activeGoalId === goal.id ? 'active' : ''}
          >
            {goal.title}
          </button>
        ))}
      </div>
    );
  };
});

const mockTask1: Task = {
  id: 'task-1',
  title: 'Task 1',
  description: 'Description 1',
  status: 'todo',
  priority: 'medium',
  order_index: 0,
  due_date: null,
  category_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockTask2: Task = {
  id: 'task-2',
  title: 'Task 2',
  description: 'Description 2',
  status: 'doing',
  priority: 'high',
  order_index: 0,
  due_date: null,
  category_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockTask3: Task = {
  id: 'task-3',
  title: 'Task 3',
  description: 'Description 3',
  status: 'done',
  priority: 'low',
  order_index: 0,
  due_date: null,
  category_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('Kanban Goal Filtering', () => {
  const mockFetchTasks = jest.fn();
  const mockCreateTask = jest.fn();
  const mockUpdateTask = jest.fn();
  const mockDeleteTask = jest.fn();
  const mockMoveTask = jest.fn();
  const mockSetActiveGoalFilter = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useKanban as jest.Mock).mockReturnValue({
      tasks: {
        backlog: [],
        todo: [mockTask1],
        doing: [mockTask2],
        done: [mockTask3],
      },
      isLoading: false,
      error: null,
      stats: {
        total: 3,
        backlog: 0,
        todo: 1,
        doing: 1,
        done: 1,
      },
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      deleteTask: mockDeleteTask,
      moveTask: mockMoveTask,
      fetchTasks: mockFetchTasks,
      clearError: mockClearError,
      refetchTasks: mockFetchTasks,
    });

    (useGoalsStore as jest.Mock).mockReturnValue({
      goals: [
        { id: 'goal-1', title: 'Goal 1', status: 'active' },
        { id: 'goal-2', title: 'Goal 2', status: 'active' },
      ],
      activeGoalFilter: null,
      setActiveGoalFilter: mockSetActiveGoalFilter,
      clearError: jest.fn(),
    });

    mockCreateTask.mockResolvedValue(mockTask1);
  });

  describe('Goal Filtering', () => {
    it('clicking goal in header filters tasks', async () => {
      await act(async () => {
        render(<KanbanBoard />);
      });

      await waitFor(() => {
        const goalButton = screen.getByTestId('goal-filter-goal-1');
        fireEvent.click(goalButton);
      });

      expect(mockSetActiveGoalFilter).toHaveBeenCalledWith('goal-1');
    });

    it('only tasks linked to selected goal show', async () => {
      // Mock tasks with goal relationships
      const tasksWithGoals = {
        backlog: [],
        todo: [{ ...mockTask1, goal_id: 'goal-1' }],
        doing: [{ ...mockTask2, goal_id: 'goal-2' }],
        done: [{ ...mockTask3, goal_id: 'goal-1' }],
      };

      (useKanban as jest.Mock).mockReturnValue({
        tasks: tasksWithGoals,
        isLoading: false,
        error: null,
        stats: {
          total: 3,
          backlog: 0,
          todo: 1,
          doing: 1,
          done: 1,
        },
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        deleteTask: mockDeleteTask,
        moveTask: mockMoveTask,
        fetchTasks: mockFetchTasks,
        clearError: mockClearError,
        refetchTasks: mockFetchTasks,
      });

      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [{ id: 'goal-1', title: 'Goal 1', status: 'active' }],
        activeGoalFilter: 'goal-1',
        setActiveGoalFilter: mockSetActiveGoalFilter,
        clearError: jest.fn(),
      });

      await act(async () => {
        render(<KanbanBoard />);
      });

      await waitFor(() => {
        // Should only show tasks linked to goal-1
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 3')).toBeInTheDocument();
        // Task 2 should not be visible (linked to goal-2)
        expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
      });
    });

    it('column counts update to filtered counts', async () => {
      const tasksWithGoals = {
        backlog: [],
        todo: [{ ...mockTask1, goal_id: 'goal-1' }],
        doing: [],
        done: [{ ...mockTask3, goal_id: 'goal-1' }],
      };

      (useKanban as jest.Mock).mockReturnValue({
        tasks: tasksWithGoals,
        isLoading: false,
        error: null,
        stats: {
          total: 2,
          backlog: 0,
          todo: 1,
          doing: 0,
          done: 1,
        },
        createTask: mockCreateTask,
        updateTask: mockUpdateTask,
        deleteTask: mockDeleteTask,
        moveTask: mockMoveTask,
        fetchTasks: mockFetchTasks,
        clearError: mockClearError,
        refetchTasks: mockFetchTasks,
      });

      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [{ id: 'goal-1', title: 'Goal 1', status: 'active' }],
        activeGoalFilter: 'goal-1',
        setActiveGoalFilter: mockSetActiveGoalFilter,
        clearError: jest.fn(),
      });

      await act(async () => {
        render(<KanbanBoard />);
      });

      await waitFor(() => {
        // Column counts should reflect filtered tasks
        const todoCount = screen.getByText(/todo.*1/i);
        const doneCount = screen.getByText(/done.*1/i);
        expect(todoCount).toBeInTheDocument();
        expect(doneCount).toBeInTheDocument();
      });
    });

    it('filter indicator bar appears', async () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [{ id: 'goal-1', title: 'Goal 1', status: 'active' }],
        activeGoalFilter: 'goal-1',
        setActiveGoalFilter: mockSetActiveGoalFilter,
        clearError: jest.fn(),
      });

      await act(async () => {
        render(<KanbanBoard />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('goal-filter-indicator')).toBeInTheDocument();
        expect(screen.getByText(/filtered by goal/i)).toBeInTheDocument();
      });
    });

    it('clicking X clears filter', async () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [{ id: 'goal-1', title: 'Goal 1', status: 'active' }],
        activeGoalFilter: 'goal-1',
        setActiveGoalFilter: mockSetActiveGoalFilter,
        clearError: jest.fn(),
      });

      await act(async () => {
        render(<KanbanBoard />);
      });

      await waitFor(() => {
        const clearButton = screen.getByLabelText(/clear filter|remove filter/i);
        fireEvent.click(clearButton);
      });

      expect(mockSetActiveGoalFilter).toHaveBeenCalledWith(null);
    });

    it('clicking same goal clears filter', async () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [{ id: 'goal-1', title: 'Goal 1', status: 'active' }],
        activeGoalFilter: 'goal-1',
        setActiveGoalFilter: mockSetActiveGoalFilter,
        clearError: jest.fn(),
      });

      await act(async () => {
        render(<KanbanBoard />);
      });

      await waitFor(() => {
        const goalButton = screen.getByTestId('goal-filter-goal-1');
        fireEvent.click(goalButton);
      });

      // Clicking the same goal should clear the filter
      expect(mockSetActiveGoalFilter).toHaveBeenCalledWith(null);
    });

    it('new task in filtered mode auto-links to goal', async () => {
      (useGoalsStore as jest.Mock).mockReturnValue({
        goals: [{ id: 'goal-1', title: 'Goal 1', status: 'active' }],
        activeGoalFilter: 'goal-1',
        setActiveGoalFilter: mockSetActiveGoalFilter,
        clearError: jest.fn(),
      });

      await act(async () => {
        render(<KanbanBoard />);
      });

      await waitFor(() => {
        const addTaskButton = screen.getByText(/add task/i);
        fireEvent.click(addTaskButton);
      });

      await waitFor(() => {
        // Task modal should be open with goal_id pre-filled
        const taskModal = screen.getByTestId('task-modal');
        expect(taskModal).toBeInTheDocument();
      });

      // When task is created, it should include goal_id
      const newTask = { ...mockTask1, title: 'New Task' };
      await act(async () => {
        // Simulate task creation
        mockCreateTask.mockResolvedValue(newTask);
      });

      // Verify createTask was called with goal_id
      await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalledWith(
          expect.objectContaining({
            goal_id: 'goal-1',
          })
        );
      });
    });
  });
});
