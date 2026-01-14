/**
 * TDD Test: Category Dropdown Population Bug
 * 
 * Reproduces the bug where category dropdown fails to populate
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useCategories } from '../../hooks/useCategories'

// Mock Supabase
const mockGetSession = jest.fn()
const mockGetUser = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
    },
  })),
}))

// Mock fetch
global.fetch = jest.fn()

describe('useCategories - Dropdown Population Bug', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('🐛 Bug Reproduction: Categories fail to populate', () => {
    test('FAIL: When user IS logged in, categories should load', async () => {
      // Setup: User is authenticated
      const mockSession = {
        access_token: 'valid-token-abc123',
        user: { id: 'user-123', email: 'test@example.com' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      // Mock successful API response
      const mockCategories = [
        { id: '1', name: 'CHORE', hourly_rate_usd: 100, created_by: 'user-123' },
        { id: '2', name: 'MBB DEVELOPMENT', hourly_rate_usd: 150, created_by: 'user-123' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockCategories })
      })

      // Render hook
      const { result } = renderHook(() => useCategories())

      // Wait for categories to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 3000 })

      // BUG: Categories should be populated but might be empty
      console.log('Categories loaded:', result.current.categories.length)
      console.log('Error:', result.current.error)

      expect(result.current.categories.length).toBeGreaterThan(0)
      expect(result.current.categories).toEqual(mockCategories)
      expect(result.current.error).toBeNull()
    })

    test('FAIL: When user NOT logged in, should show friendly error', async () => {
      // Setup: User is NOT authenticated
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      // Mock 401 response (API requires auth)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ 
          success: false, 
          error: 'Authentication required to view categories' 
        })
      })

      // Render hook
      const { result } = renderHook(() => useCategories())

      // Wait for load to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 3000 })

      // Should have error message
      expect(result.current.error).toBeTruthy()
      expect(result.current.error).toContain('Authentication')
      
      // Categories should be empty
      expect(result.current.categories.length).toBe(0)
    })

    test('FAIL: Authorization header should be included when token exists', async () => {
      const mockToken = 'test-token-xyz'
      mockGetSession.mockResolvedValue({
        data: { 
          session: { 
            access_token: mockToken,
            user: { id: 'user-456' }
          } 
        },
        error: null
      })

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [] })
      })

      renderHook(() => useCategories())

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      // Verify Authorization header was included
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const headers = fetchCall[1]?.headers

      expect(headers).toBeDefined()
      expect(headers['Authorization']).toBe(`Bearer ${mockToken}`)
    })
  })

  describe('✅ Expected Behavior', () => {
    test('Should retry on network error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null
      })

      // First call fails, second succeeds
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: [] })
        })

      const { result } = renderHook(() => useCategories())

      // Initial load fails
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()

      // Retry
      await result.current.loadCategories()

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('🔧 Edge Cases', () => {
    test('Should handle expired token gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { 
          session: { 
            access_token: 'expired-token',
            user: { id: 'user-789' }
          } 
        },
        error: null
      })

      // API returns 401 for expired token
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ 
          success: false, 
          error: 'Invalid authentication token' 
        })
      })

      const { result } = renderHook(() => useCategories())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('401')
      expect(result.current.categories.length).toBe(0)
    })

    test('Should not crash if Supabase returns error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Supabase connection failed')
      })

      const { result } = renderHook(() => useCategories())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should handle gracefully, not crash
      expect(result.current.categories).toEqual([])
    })
  })
})
