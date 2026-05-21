import { renderHook, act, waitFor } from '@testing-library/react';
import { useKanban, TasksByStatus } from './useKanban';
import { Task } from '../lib/database/kanban-queries';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const emptyTasksByStatus = (): TasksByStatus => ({
  backlog: [],
  todo: [],
  doing: [],
  done: [],
});

const AUTH_HEADERS = expect.objectContaining({
  Authorization: 'Bearer test-access-token',
});

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-access-token' } },
      }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  },
}))

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

/** Board shape after grouping mockTasks in fetch-order (one per lane). */
const tasksGroupedFromMockTasks: TasksByStatus = {
  backlog: [mockTasks[0]],
  todo: [mockTasks[1]],
  doing: [mockTasks[2]],
  done: [mockTasks[3]],
};

describe('useKanban', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Initial State', () => {
    it('initializes with empty tasks and loading state', () => {
      const { result } = renderHook(() => useKanban());

      expect(result.current.tasks).toEqual(emptyTasksByStatus());
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

      expect(result.current.tasks).toEqual(tasksGroupedFromMockTasks);
      expect(result.current.error).toBe(null);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/kanban/tasks',
        expect.objectContaining({
          headers: AUTH_HEADERS,
        }),
      )
    });

    it('handles fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({ success: false, error: 'Failed to fetch' }),
      });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual(emptyTasksByStatus());
      expect(result.current.error).toBe('Failed to fetch tasks: Bad Request');
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual(emptyTasksByStatus());
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

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/kanban/tasks',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ ...newTask, user_id: 'user-1' }),
        }),
      );

      expect(result.current.stats.total).toBe(5);
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
          ok: true,
          json: async () => ({ success: false, error: 'Creation failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.createTask(newTask)).rejects.toThrow('Creation failed');
      });

      expect(result.current.tasks).toEqual(tasksGroupedFromMockTasks);
    });
  });

  describe('Update Task', () => {
    it('updates task successfully', async () => {
      const updatedTask = { ...mockTasks[0], title: 'Updated Task' };
      const tasksAfterUpdate = mockTasks.map((t) => (t.id === '1' ? updatedTask : t));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: updatedTask }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: tasksAfterUpdate }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateTask('1', { title: 'Updated Task' });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/kanban/tasks/1',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ title: 'Updated Task' }),
        }),
      );

      expect(result.current.tasks).toEqual({
        ...tasksGroupedFromMockTasks,
        backlog: [updatedTask],
      });
    });

    it('handles update task error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false, error: 'Update failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.updateTask('1', { title: 'Updated Task' })).rejects.toThrow('Update failed');
      });

      expect(result.current.tasks.backlog[0]?.title).toBe('Task 1');
    });
  });

  describe('Delete Task', () => {
    it('deletes task successfully', async () => {
      const tasksAfterDelete = mockTasks.filter((t) => t.id !== '1');

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'deleted' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: tasksAfterDelete }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTask('1');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/kanban/tasks/1',
        expect.objectContaining({
          method: 'DELETE',
          headers: AUTH_HEADERS,
        }),
      );

      expect(result.current.tasks).toEqual({
        backlog: [],
        todo: [mockTasks[1]],
        doing: [mockTasks[2]],
        done: [mockTasks[3]],
      });
    });

    it('handles delete task error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false, error: 'Delete failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.deleteTask('1')).rejects.toThrow('Delete failed');
      });

      expect(result.current.stats.total).toBe(4);
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

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/kanban/tasks/1/move',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ status: 'doing', order_index: 0 }),
        }),
      );
    });

    it('handles move task error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false, error: 'Move failed' }),
        });

      const { result } = renderHook(() => useKanban());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.moveTask('1', 'doing', 0)).rejects.toThrow('Move failed');
      });

      expect(result.current.tasks.backlog[0]?.id).toBe('1');
      expect(result.current.tasks.backlog[0]?.status).toBe('backlog');
    });
  });

  describe.skip('Legacy useKanban tests (referenced taskStats, getTasksByStatus, refreshTasks)', () => {
    it('placeholder until suite is rewritten for current hook API', () => {
      expect(true).toBe(true);
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