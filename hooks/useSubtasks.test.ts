import { renderHook, act, waitFor } from '@testing-library/react'
import { useSubtasks } from './useSubtasks'
import { Subtask } from '../lib/database/kanban-queries'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  }
}
jest.mock('../lib/supabase', () => ({
  supabase: mockSupabase
}))

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
})

const mockSubtasks: Subtask[] = [
  {
    id: 'subtask-1',
    task_id: 'task-1',
    title: 'First subtask',
    completed: false,
    order_index: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: 'user-1'
  },
  {
    id: 'subtask-2',
    task_id: 'task-1',
    title: 'Second subtask',
    completed: true,
    order_index: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_id: 'user-1'
  }
]

const mockUser = {
  id: 'user-1',
  email: 'test@example.com'
}

describe('useSubtasks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  describe('Initial State', () => {
    it('should initialize with loading state', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      expect(result.current.loading).toBe(true)
      expect(result.current.subtasks).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should provide all expected functions', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      expect(typeof result.current.createSubtask).toBe('function')
      expect(typeof result.current.updateSubtask).toBe('function')
      expect(typeof result.current.toggleSubtask).toBe('function')
      expect(typeof result.current.deleteSubtask).toBe('function')
      expect(typeof result.current.reorderSubtasks).toBe('function')
      expect(typeof result.current.refetch).toBe('function')
    })
  })

  describe('Fetching Subtasks', () => {
    it('should fetch subtasks on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/task-1/subtasks')
      expect(result.current.subtasks).toEqual(mockSubtasks)
      expect(result.current.error).toBeNull()
    })

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch subtasks' })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to fetch subtasks')
      expect(result.current.subtasks).toEqual([])
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.subtasks).toEqual([])
    })

    it('should refetch when taskId changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result, rerender } = renderHook(
        ({ taskId }) => useSubtasks(taskId),
        { initialProps: { taskId: 'task-1' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Change taskId
      rerender({ taskId: 'task-2' })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/task-2/subtasks')
      })
    })

    it('should not fetch if taskId is empty', async () => {
      const { result } = renderHook(() => useSubtasks(''))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.subtasks).toEqual([])
    })
  })

  describe('Creating Subtasks', () => {
    it('should create a new subtask', async () => {
      const newSubtask = {
        id: 'subtask-3',
        task_id: 'task-1',
        title: 'New subtask',
        completed: false,
        order_index: 2,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        user_id: 'user-1'
      }

      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock create request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newSubtask })
      })

      await act(async () => {
        await result.current.createSubtask('New subtask')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/task-1/subtasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New subtask',
          order_index: 2,
          user_id: 'user-1'
        }),
      })

      expect(result.current.subtasks).toHaveLength(3)
      expect(result.current.subtasks[2]).toEqual(newSubtask)
    })

    it('should handle create error', async () => {
      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock create error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create subtask' })
      })

      await act(async () => {
        await expect(result.current.createSubtask('New subtask')).rejects.toThrow('Failed to create subtask')
      })

      expect(result.current.error).toBe('Failed to create subtask')
      expect(result.current.subtasks).toHaveLength(2) // Should not add the failed subtask
    })

    it('should handle auth error when creating subtask', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Not authenticated') })

      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await expect(result.current.createSubtask('New subtask')).rejects.toThrow('User not authenticated')
      })

      expect(result.current.error).toBe('User not authenticated')
    })
  })

  describe('Updating Subtasks', () => {
    it('should update a subtask', async () => {
      const updatedSubtask = {
        ...mockSubtasks[0],
        title: 'Updated subtask'
      }

      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock update request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedSubtask })
      })

      await act(async () => {
        await result.current.updateSubtask('subtask-1', { title: 'Updated subtask' })
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/subtasks/subtask-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated subtask' }),
      })

      expect(result.current.subtasks[0].title).toBe('Updated subtask')
    })

    it('should handle update error', async () => {
      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock update error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to update subtask' })
      })

      await act(async () => {
        await expect(result.current.updateSubtask('subtask-1', { title: 'Updated subtask' })).rejects.toThrow('Failed to update subtask')
      })

      expect(result.current.error).toBe('Failed to update subtask')
      expect(result.current.subtasks[0].title).toBe('First subtask') // Should not change
    })
  })

  describe('Toggling Subtasks', () => {
    it('should toggle subtask completion with optimistic update', async () => {
      const toggledSubtask = {
        ...mockSubtasks[0],
        completed: true
      }

      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock toggle request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: toggledSubtask })
      })

      await act(async () => {
        await result.current.toggleSubtask('subtask-1')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/subtasks/subtask-1', {
        method: 'PATCH',
      })

      expect(result.current.subtasks[0].completed).toBe(true)
    })

    it('should revert optimistic update on error', async () => {
      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock toggle error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to toggle subtask' })
      })

      await act(async () => {
        await expect(result.current.toggleSubtask('subtask-1')).rejects.toThrow('Failed to toggle subtask')
      })

      expect(result.current.error).toBe('Failed to toggle subtask')
      expect(result.current.subtasks[0].completed).toBe(false) // Should revert
    })
  })

  describe('Deleting Subtasks', () => {
    it('should delete a subtask', async () => {
      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock delete request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      await act(async () => {
        await result.current.deleteSubtask('subtask-1')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/subtasks/subtask-1', {
        method: 'DELETE',
      })

      expect(result.current.subtasks).toHaveLength(1)
      expect(result.current.subtasks[0].id).toBe('subtask-2')
    })

    it('should handle delete error', async () => {
      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock delete error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to delete subtask' })
      })

      await act(async () => {
        await expect(result.current.deleteSubtask('subtask-1')).rejects.toThrow('Failed to delete subtask')
      })

      expect(result.current.error).toBe('Failed to delete subtask')
      expect(result.current.subtasks).toHaveLength(2) // Should not remove
    })
  })

  describe('Reordering Subtasks', () => {
    it('should reorder subtasks with optimistic update', async () => {
      const reorderedSubtasks = [mockSubtasks[1], mockSubtasks[0]]

      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock reorder requests
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })

      await act(async () => {
        await result.current.reorderSubtasks(reorderedSubtasks)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/subtasks/subtask-2', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_index: 0 }),
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/subtasks/subtask-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_index: 1 }),
      })

      expect(result.current.subtasks[0].id).toBe('subtask-2')
      expect(result.current.subtasks[1].id).toBe('subtask-1')
    })

    it('should refetch on reorder error', async () => {
      const reorderedSubtasks = [mockSubtasks[1], mockSubtasks[0]]

      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock reorder error
      mockFetch.mockRejectedValueOnce(new Error('Failed to reorder'))

      // Mock refetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      await act(async () => {
        await expect(result.current.reorderSubtasks(reorderedSubtasks)).rejects.toThrow('Failed to reorder')
      })

      expect(result.current.error).toBe('Failed to reorder subtasks')
      // Should have refetched to get correct order
      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/task-1/subtasks')
    })
  })

  describe('Refetch Function', () => {
    it('should refetch subtasks manually', async () => {
      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock refetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [...mockSubtasks, { id: 'subtask-3', title: 'New subtask' }] })
      })

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/kanban/tasks/task-1/subtasks')
    })
  })

  describe('Error Handling', () => {
    it('should clear error on successful operation', async () => {
      // Mock initial fetch with error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Initial error' })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error')
      })

      // Mock successful refetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle string errors', async () => {
      // Mock initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockSubtasks })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock string error
      mockFetch.mockRejectedValueOnce('String error')

      await act(async () => {
        await expect(result.current.createSubtask('New subtask')).rejects.toThrow('Failed to create subtask')
      })

      expect(result.current.error).toBe('Failed to create subtask')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty subtasks array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.subtasks).toEqual([])
    })

    it('should handle missing data in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.subtasks).toEqual([])
    })

    it('should handle network error during fetch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useSubtasks('task-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Network error')
    })
  })

  describe('Memory Management', () => {
    it('should not update state after unmount', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(promise)

      const { result, unmount } = renderHook(() => useSubtasks('task-1'))

      // Unmount before promise resolves
      unmount()

      // Resolve promise after unmount
      act(() => {
        resolvePromise!({
          ok: true,
          json: async () => ({ data: mockSubtasks })
        })
      })

      // Should not throw error or update state
      expect(result.current.loading).toBe(true)
    })
  })
}) 