import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskSearch } from './useTaskSearch';
import { SearchFilters } from '../types/kanban';
import { Task } from '../lib/database/kanban-queries';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock lodash debounce
jest.mock('lodash/debounce', () => {
  return (fn: any, delay: number) => {
    const debouncedFn = (...args: any[]) => {
      clearTimeout(debouncedFn.timeoutId);
      debouncedFn.timeoutId = setTimeout(() => fn(...args), delay);
    };
    debouncedFn.cancel = () => clearTimeout(debouncedFn.timeoutId);
    debouncedFn.flush = () => {
      clearTimeout(debouncedFn.timeoutId);
      fn();
    };
    return debouncedFn;
  };
});

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'First test task',
    status: 'todo',
    priority: 'high',
    due_date: '2025-01-15',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: 'user-1',
    order_index: 0,
  },
  {
    id: '2',
    title: 'Another Task',
    description: 'Second test task',
    status: 'doing',
    priority: 'medium',
    due_date: '2025-01-20',
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    user_id: 'user-1',
    order_index: 1,
  },
];

const defaultFilters: SearchFilters = {
  q: '',
  status: '',
  priority: '',
  category: '',
  tags: [],
  dueDateFrom: '',
  dueDateTo: '',
  overdue: false,
};

describe('useTaskSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useTaskSearch());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.filters).toEqual(defaultFilters);
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.searchError).toBe(null);
      expect(result.current.isSearchMode).toBe(false);
    });
  });

  describe('Search Query Management', () => {
    it('updates search query', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    it('triggers search when query is set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      // Fast-forward debounce delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/search?q=test');
      });

      expect(result.current.searchResults).toEqual(mockTasks);
      expect(result.current.isSearchMode).toBe(true);
    });

    it('does not search for empty query', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isSearchMode).toBe(false);
    });

    it('debounces search requests', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('t');
      });

      act(() => {
        result.current.setSearchQuery('te');
      });

      act(() => {
        result.current.setSearchQuery('tes');
      });

      act(() => {
        result.current.setSearchQuery('test');
      });

      // Fast-forward debounce delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only make one request with the final query
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/search?q=test');
    });
  });

  describe('Filter Management', () => {
    it('updates individual filters', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          status: 'todo',
          priority: 'high',
        });
      });

      expect(result.current.filters.status).toBe('todo');
      expect(result.current.filters.priority).toBe('high');
    });

    it('triggers search when filters change', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          status: 'todo',
        });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/search?status=todo');
      });

      expect(result.current.searchResults).toEqual(mockTasks);
      expect(result.current.isSearchMode).toBe(true);
    });

    it('combines query and filters in search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
        result.current.setFilters({
          ...defaultFilters,
          status: 'todo',
          priority: 'high',
        });
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/search?q=test&status=todo&priority=high');
      });
    });

    it('handles tag filters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          tags: ['1', '2'],
        });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/search?tags=1%2C2');
      });
    });

    it('handles date range filters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          dueDateFrom: '2025-01-01',
          dueDateTo: '2025-01-31',
        });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/search?dueDateFrom=2025-01-01&dueDateTo=2025-01-31');
      });
    });

    it('handles overdue filter correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTasks }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          overdue: true,
        });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/search?overdue=true');
      });
    });
  });

  describe('Clear Functions', () => {
    it('clears search query', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.isSearchMode).toBe(false);
      expect(result.current.searchResults).toEqual([]);
    });

    it('clears all filters', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          status: 'todo',
          priority: 'high',
          tags: ['1', '2'],
        });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual(defaultFilters);
    });

    it('clears everything', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test query');
        result.current.setFilters({
          ...defaultFilters,
          status: 'todo',
        });
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.filters).toEqual(defaultFilters);
      expect(result.current.isSearchMode).toBe(false);
      expect(result.current.searchResults).toEqual([]);
    });
  });

  describe('Active Filter Count', () => {
    it('calculates active filter count correctly', () => {
      const { result } = renderHook(() => useTaskSearch());

      expect(result.current.activeFilterCount).toBe(0);

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          status: 'todo',
          priority: 'high',
          tags: ['1', '2'],
        });
      });

      expect(result.current.activeFilterCount).toBe(3);
    });

    it('does not count empty filters', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          status: 'todo',
          priority: '',
          category: '',
          tags: [],
        });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts overdue filter when true', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setFilters({
          ...defaultFilters,
          overdue: true,
        });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });
  });

  describe('Search Loading State', () => {
    it('shows loading state during search', async () => {
      let resolvePromise: (value: any) => void;
      const searchPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(searchPromise);

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.isSearching).toBe(true);

      act(() => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        });
      });

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles search API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Search failed' }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.searchError).toBe('Search failed');
      });

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearching).toBe(false);
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.searchError).toBe('Network error');
      });
    });

    it('clears error on successful search', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockTasks }),
        });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.searchError).toBe('Network error');
      });

      act(() => {
        result.current.setSearchQuery('test2');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.searchError).toBe(null);
      });
    });
  });

  describe('Search Statistics', () => {
    it('calculates search statistics correctly', async () => {
      const tasksWithDifferentStatuses = [
        { ...mockTasks[0], status: 'todo' as const },
        { ...mockTasks[1], status: 'done' as const },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: tasksWithDifferentStatuses }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.searchStats).toEqual({
          total: 2,
          completed: 1,
          inProgress: 1,
        });
      });
    });

    it('handles empty search results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.searchStats).toEqual({
          total: 0,
          completed: 0,
          inProgress: 0,
        });
      });
    });
  });

  describe('URL Parameter Building', () => {
    it('builds URL parameters correctly', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test query');
        result.current.setFilters({
          ...defaultFilters,
          status: 'todo',
          priority: 'high',
          tags: ['1', '2'],
          dueDateFrom: '2025-01-01',
          overdue: true,
        });
      });

      // This is tested indirectly through the fetch calls
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test%20query')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=todo')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('priority=high')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tags=1%2C2')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('dueDateFrom=2025-01-01')
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('overdue=true')
      );
    });
  });

  describe('Cleanup', () => {
    it('cancels pending debounced search on unmount', () => {
      const { result, unmount } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      unmount();

      // Fast-forward time to see if search would have been triggered
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('cancels pending debounced search when query changes', () => {
      const { result } = renderHook(() => useTaskSearch());

      act(() => {
        result.current.setSearchQuery('test1');
      });

      act(() => {
        result.current.setSearchQuery('test2');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only make one request with the final query
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/search?q=test2');
    });
  });
}); 