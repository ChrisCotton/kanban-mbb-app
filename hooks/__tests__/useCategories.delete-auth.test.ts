/**
 * Integration Test: Category Deletion with Auth
 * 
 * This test verifies the fix for the bug where category deletion
 * failed with "Not authorized to delete this category" error.
 * 
 * Root Cause: Frontend was using localStorage user_id instead of
 * actual Supabase authenticated user ID.
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { useCategories } from '../useCategories'
import { supabase } from '../../lib/supabase'

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    }
  }
}))

// Mock fetch
global.fetch = jest.fn()

describe('useCategories - Delete with Proper Auth', () => {
  const mockAuthUser = {
    id: 'auth-user-123',
    email: 'test@example.com'
  }

  const mockCategory = {
    id: 'cat-1',
    name: 'Test Category',
    hourly_rate: 100,
    color: '#FF0000',
    is_active: true,
    total_hours: 0,
    created_by: 'auth-user-123',  // Matches auth user
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful auth
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockAuthUser },
      error: null
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should use Supabase auth user ID when deleting category', async () => {
    // Load categories
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: [mockCategory] 
      })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.categories).toHaveLength(1)
    })

    // Mock successful delete
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        success: true,
        message: 'Category deleted successfully'
      })
    })

    // Delete category
    let deleted: boolean = false
    await act(async () => {
      deleted = await result.current.deleteCategory('cat-1')
    })

    // Should succeed
    expect(deleted).toBe(true)
    expect(result.current.categories).toHaveLength(0)
    
    // CRITICAL: Verify it called API with SUPABASE auth user ID
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('user_id=auth-user-123'),
      expect.objectContaining({ method: 'DELETE' })
    )
    
    // Verify Supabase auth was called
    expect(supabase.auth.getUser).toHaveBeenCalled()
  })

  it('should NOT use localStorage for user ID', async () => {
    // Set a WRONG user_id in localStorage
    const mockLocalStorage = {
      getItem: jest.fn().mockReturnValue('wrong-user-from-localstorage'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0
    }
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    // Load categories
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: [mockCategory] 
      })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock successful delete
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })

    await act(async () => {
      await result.current.deleteCategory('cat-1')
    })

    // Should use Supabase auth (auth-user-123), NOT localStorage
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('user_id=auth-user-123'),
      expect.anything()
    )

    // Should NOT use the wrong localStorage value
    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('user_id=wrong-user-from-localstorage'),
      expect.anything()
    )
  })

  it('should fail gracefully when user is not authenticated', async () => {
    // Mock auth failure
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' }
    })

    // Load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: [mockCategory] 
      })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Try to delete - should fail
    let deleted: boolean = true
    await act(async () => {
      deleted = await result.current.deleteCategory('cat-1')
    })

    // Should fail
    expect(deleted).toBe(false)
    expect(result.current.error).toContain('Not authenticated')
    
    // Should NOT call the API
    expect(fetch).toHaveBeenCalledTimes(1) // Only the initial load
  })

  it('should handle 403 when user does not own the category', async () => {
    // Category owned by different user
    const otherUserCategory = {
      ...mockCategory,
      created_by: 'other-user-456'
    }

    // Load categories
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: [otherUserCategory] 
      })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock 403 response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ 
        success: false,
        error: 'Not authorized to delete this category'
      })
    })

    // Try to delete
    let deleted: boolean = true
    await act(async () => {
      deleted = await result.current.deleteCategory('cat-1')
    })

    // Should fail
    expect(deleted).toBe(false)
    expect(result.current.error).toContain('Not authorized')
  })
})
