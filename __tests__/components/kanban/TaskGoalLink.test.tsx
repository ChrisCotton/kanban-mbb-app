import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskGoalLink from '../../../components/kanban/TaskGoalLink';
import { Task } from '../../../lib/database/kanban-queries';
import { Goal } from '../../../src/types/goals';

// Mock hooks
jest.mock('../../../src/stores/goals.store', () => ({
  useGoalsStore: jest.fn(),
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockTask: Task = {
  id: 'task-1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'todo',
  priority: 'medium',
  order_index: 0,
  due_date: null,
  category_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  user_id: 'user-1',
};

const mockGoal1: Goal = {
  id: 'goal-1',
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
  user_id: 'user-1',
};

const mockGoal2: Goal = {
  id: 'goal-2',
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
  user_id: 'user-1',
};

const mockLinkedGoals = [
  { goal_id: 'goal-1', task_id: 'task-1', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
];

describe('TaskGoalLink', () => {
  const mockFetchGoals = jest.fn();
  const mockLinkTaskToGoal = jest.fn();
  const mockUnlinkTaskFromGoal = jest.fn();
  const mockOnLinkChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { useGoalsStore } = require('../../../src/stores/goals.store');
    useGoalsStore.mockReturnValue({
      goals: [mockGoal1, mockGoal2],
      fetchGoals: mockFetchGoals,
    });

    global.fetch = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });

    const { supabase } = require('../../../lib/supabase');
    supabase.auth.getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'mock-token',
          user: { id: 'user-1' },
        },
      },
    });
  });

  it('renders goals section in Task Detail Panel', async () => {
    await act(async () => {
      render(
        <TaskGoalLink
          task={mockTask}
          linkedGoals={[]}
          onLinkChange={mockOnLinkChange}
        />
      );
    });

    expect(screen.getByTestId('task-goal-link')).toBeInTheDocument();
    expect(screen.getByText(/goals/i)).toBeInTheDocument();
  });

  it('shows "+ Link" button that opens goal selector dropdown', async () => {
    await act(async () => {
      render(
        <TaskGoalLink
          task={mockTask}
          linkedGoals={[]}
          onLinkChange={mockOnLinkChange}
        />
      );
    });

    const linkButton = screen.getByTestId('link-goal-button');
    expect(linkButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(linkButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('goal-selector-dropdown')).toBeInTheDocument();
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Goal 2')).toBeInTheDocument();
    });
  });

  it('selecting goal creates link', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { goal_id: 'goal-1', task_id: 'task-1', contribution_weight: 1 },
      }),
    });

    await act(async () => {
      render(
        <TaskGoalLink
          task={mockTask}
          linkedGoals={[]}
          onLinkChange={mockOnLinkChange}
        />
      );
    });

    const linkButton = screen.getByText(/\+ link/i);
    await act(async () => {
      fireEvent.click(linkButton);
    });

    await waitFor(() => {
      const goalOption = screen.getByText('Goal 1');
      fireEvent.click(goalOption);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/goals/goal-1/tasks'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(mockOnLinkChange).toHaveBeenCalled();
    });
  });

  it('X button removes link', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await act(async () => {
      render(
        <TaskGoalLink
          task={mockTask}
          linkedGoals={mockLinkedGoals}
          onLinkChange={mockOnLinkChange}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
    });

    const removeButton = screen.getByTestId('remove-goal-goal-1');
    await act(async () => {
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/goals/goal-1/tasks'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
    
    expect(mockOnLinkChange).toHaveBeenCalled();
  });

  it('task can link to multiple goals', async () => {
    const multipleLinks = [
      { goal_id: 'goal-1', task_id: 'task-1', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
      { goal_id: 'goal-2', task_id: 'task-1', contribution_weight: 1, created_at: '2026-01-01T00:00:00Z' },
    ];

    await act(async () => {
      render(
        <TaskGoalLink
          task={mockTask}
          linkedGoals={multipleLinks}
          onLinkChange={mockOnLinkChange}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Goal 2')).toBeInTheDocument();
    });
  });

  it('filters out already linked goals from dropdown', async () => {
    await act(async () => {
      render(
        <TaskGoalLink
          task={mockTask}
          linkedGoals={mockLinkedGoals}
          onLinkChange={mockOnLinkChange}
        />
      );
    });

    const linkButton = screen.getByTestId('link-goal-button');
    await act(async () => {
      fireEvent.click(linkButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('goal-selector-dropdown')).toBeInTheDocument();
    });

    // Goal 1 should not appear in dropdown (already linked)
    const dropdown = screen.getByTestId('goal-selector-dropdown');
    expect(dropdown).not.toHaveTextContent('Goal 1');
    // Goal 2 should appear (not linked)
    expect(dropdown).toHaveTextContent('Goal 2');
  });
});
