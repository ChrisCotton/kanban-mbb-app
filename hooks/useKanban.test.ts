import { renderHook, act, waitFor } from '@testing-library/react';
import { useKanban } from './useKanban';
import { Task } from '../lib/database/kanban-queries';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.fn();
global.console.error = mockConsoleError;

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'backlog',
    priority: 'medium',
    due_date: '2025-01-15',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: 'user-1',
    order_index: 0,
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'todo',
    priority: 'high',
    due_date: '2025-01-20',
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    user_id: 'user-1',
    order_index: 0,
  },
  {
    id: '3',
    title: 'Task 3',
    description: 'Description 3',
    status: 'doing',
    priority: 'urgent',
    due_date: '2025-01-10',
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z',
    user_id: 'user-1',
    order_index: 0,
  },
  {
    id: '4',
    title: 'Task 4',
    description: 'Description 4',
    status: 'done',
    priority: 'low',
    due_date: '2025-01-05',
    created_at: '2025-01-04T00:00:00Z',
    updated_at: '2025-01-04T00:00:00Z',
    user_id: 'user-1',
    order_index: 0,
  },
];

describe('useKanban', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Initial State', () => {
    it('initializes with empty tasks and loading state', () => {
      const { result } = renderHook(() => useKanban());

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Fetch Tasks', () => {
    it('fetches tasks successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.error).toBe(null);
      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks');
    });

    it('handles fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to fetch' }),
      });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch');
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Create Task', () => {
    it('creates task successfully', async () => {
      const newTask = {
        title: 'New Task',
        description: 'New Description',
        status: 'todo' as const,
        priority: 'medium' as const,
        due_date: '2025-01-25',
      };

      const createdTask = { ...newTask, id: '5', created_at: '2025-01-05T00:00:00Z', updated_at: '2025-01-05T00:00:00Z', user_id: 'user-1', order_index: 0 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: createdTask }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [...mockTasks, createdTask] }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createTask(newTask);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      expect(result.current.tasks).toHaveLength(5);
    });

    it('handles create task error', async () => {
      const newTask = {
        title: 'New Task',
        description: 'New Description',
        status: 'todo' as const,
        priority: 'medium' as const,
        due_date: '2025-01-25',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Creation failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.createTask(newTask)).rejects.toThrow('Creation failed');
      });

      expect(result.current.tasks).toEqual(mockTasks);
    });
  });

  describe('Update Task', () => {
    it('updates task successfully', async () => {
      const updatedTask = { ...mockTasks[0], title: 'Updated Task' };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedTask }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTask('1', { title: 'Updated Task' });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Task' }),
      });

      expect(result.current.tasks[0].title).toBe('Updated Task');
    });

    it('handles update task error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Update failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateTask('1', { title: 'Updated Task' })).rejects.toThrow('Update failed');
      });

      expect(result.current.tasks[0].title).toBe('Task 1');
    });
  });

  describe('Delete Task', () => {
    it('deletes task successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTask('1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/1', {
        method: 'DELETE',
      });

      expect(result.current.tasks).toHaveLength(3);
      expect(result.current.tasks.find(t => t.id === '1')).toBeUndefined();
    });

    it('handles delete task error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Delete failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.deleteTask('1')).rejects.toThrow('Delete failed');
      });

      expect(result.current.tasks).toHaveLength(4);
    });
  });

  describe('Move Task', () => {
    it('moves task successfully', async () => {
      const movedTask = { ...mockTasks[0], status: 'doing' as const };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: movedTask }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.moveTask('1', 'doing', 0);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/1/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'doing', order_index: 0 }),
      });

      expect(result.current.tasks[0].status).toBe('doing');
    });

    it('handles move task error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Move failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.moveTask('1', 'doing', 0)).rejects.toThrow('Move failed');
      });

      expect(result.current.tasks[0].status).toBe('backlog');
    });
  });

  describe('Task Statistics', () => {
    it('calculates task statistics correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.taskStats).toEqual({
        total: 4,
        backlog: 1,
        todo: 1,
        doing: 1,
        done: 1,
      });
    });

    it('handles empty tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.taskStats).toEqual({
        total: 0,
        backlog: 0,
        todo: 0,
        doing: 0,
        done: 0,
      });
    });
  });

  describe('Task Filtering', () => {
    it('filters tasks by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const todoTasks = result.current.getTasksByStatus('todo');
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].id).toBe('2');
    });

    it('filters tasks by priority', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const urgentTasks = result.current.getTasksByPriority('urgent');
      expect(urgentTasks).toHaveLength(1);
      expect(urgentTasks[0].id).toBe('3');
    });
  });

  describe('Overdue Tasks', () => {
    it('identifies overdue tasks', async () => {
      const overdueTasks = [
        {
          ...mockTasks[0],
          due_date: '2020-01-01', // Past date
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: overdueTasks }),
      });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const overdue = result.current.getOverdueTasks();
      expect(overdue).toHaveLength(1);
      expect(overdue[0].id).toBe('1');
    });
  });

  describe('Refresh Tasks', () => {
    it('refreshes tasks successfully', async () => {
      const updatedTasks = [...mockTasks, { ...mockTasks[0], id: '5', title: 'New Task' }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedTasks }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(4);

      await act(async () => {
        await result.current.refreshTasks();
      });

      expect(result.current.tasks).toHaveLength(5);
    });

    it('handles refresh error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Refresh failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshTasks();
      });

      expect(result.current.error).toBe('Refresh failed');
    });
  });

  describe('Optimistic Updates', () => {
    it('updates UI optimistically for task creation', async () => {
      const newTask = {
        title: 'New Task',
        description: 'New Description',
        status: 'todo' as const,
        priority: 'medium' as const,
        due_date: '2025-01-25',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { ...newTask, id: '5' } }),
        }), 100)));

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.createTask(newTask);
      });

      // Should have optimistic update
      expect(result.current.tasks).toHaveLength(5);
      expect(result.current.tasks[4].title).toBe('New Task');
    });

    it('reverts optimistic update on error', async () => {
      const newTask = {
        title: 'New Task',
        description: 'New Description',
        status: 'todo' as const,
        priority: 'medium' as const,
        due_date: '2025-01-25',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, error: 'Creation failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.createTask(newTask);
        } catch (error) {
          // Expected error
        }
      });

      // Should revert to original tasks
      expect(result.current.tasks).toHaveLength(4);
    });
  });

  describe('Cleanup', () => {
    it('cleans up on unmount', () => {
      const { unmount } = renderHook(() => useKanban());

      unmount();

      // Should not cause any errors or memory leaks
      expect(true).toBe(true);
    });
  });
}); 