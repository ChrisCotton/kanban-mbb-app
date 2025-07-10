import { renderHook, act, waitFor } from '@testing-library/react';
import { useComments } from './useComments';

// Mock supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useComments', () => {
  const taskId = 'task-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('initializes correctly', () => {
    const { result } = renderHook(() => useComments(taskId));

    expect(result.current.comments).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.addComment).toBe('function');
    expect(typeof result.current.editComment).toBe('function');
    expect(typeof result.current.deleteComment).toBe('function');
    expect(typeof result.current.refreshComments).toBe('function');
  });

  it('fetches comments successfully', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        task_id: 'task-1',
        content: 'Test comment',
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z',
        user_id: 'user-1',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockComments }),
    });

    const { result } = renderHook(() => useComments(taskId));

    await waitFor(() => {
      expect(result.current.comments).toEqual(mockComments);
    });

    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/task-1/comments');
  });

  it('handles fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch comments' }),
    });

    const { result } = renderHook(() => useComments(taskId));

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch comments');
    });

    expect(result.current.comments).toEqual([]);
  });

  it('adds comment successfully', async () => {
    const newComment = {
      id: 'comment-2',
      task_id: 'task-1',
      content: 'New comment',
      created_at: '2025-01-01T11:00:00Z',
      updated_at: '2025-01-01T11:00:00Z',
      user_id: 'user-1',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newComment }),
      });

    const { result } = renderHook(() => useComments(taskId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addComment('New comment');
    });

    expect(result.current.comments).toContain(newComment);
  });

  it('handles add comment error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to add comment' }),
      });

    const { result } = renderHook(() => useComments(taskId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.addComment('New comment');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    expect(result.current.error).toBe('Failed to add comment');
  });

  it('does not fetch when taskId is empty', () => {
    renderHook(() => useComments(''));
    expect(mockFetch).not.toHaveBeenCalled();
  });
}); 