import { renderHook, act, waitFor } from '@testing-library/react';
import { useTags } from './useTags';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useTags', () => {
  const userId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('initializes correctly', () => {
    const { result } = renderHook(() => useTags(userId));

    expect(result.current.tags).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.createTag).toBe('function');
    expect(typeof result.current.updateTag).toBe('function');
    expect(typeof result.current.deleteTag).toBe('function');
    expect(typeof result.current.refreshTags).toBe('function');
  });

  it('fetches tags successfully', async () => {
    const mockTags = [
      {
        id: '1',
        name: 'urgent',
        color: '#ef4444',
        created_by: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tags: mockTags }),
    });

    const { result } = renderHook(() => useTags(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tags).toEqual(mockTags);
    expect(result.current.error).toBe(null);
  });

  it('handles fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch' }),
    });

    const { result } = renderHook(() => useTags(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch');
  });

  it('creates tag successfully', async () => {
    const newTag = {
      id: '2',
      name: 'design',
      color: '#f59e0b',
      created_by: 'user-1',
      created_at: '2025-01-04T00:00:00Z',
      updated_at: '2025-01-04T00:00:00Z',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag: newTag }),
      });

    const { result } = renderHook(() => useTags(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const created = await result.current.createTag('design', '#f59e0b');
      expect(created).toEqual(newTag);
    });

    expect(result.current.tags).toContain(newTag);
  });

  it('does not fetch when userId is empty', () => {
    renderHook(() => useTags(''));
    expect(mockFetch).not.toHaveBeenCalled();
  });
}); 