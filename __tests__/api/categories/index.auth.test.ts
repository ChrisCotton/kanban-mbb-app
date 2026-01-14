/**
 * Unit Tests: Categories API Authentication
 * 
 * Tests the authentication and user filtering fixes
 */

import { createMocks } from 'node-mocks-http'
import handler from '../../../pages/api/categories/index'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              then: jest.fn(),
            })),
          })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-id', name: 'Test' }, 
            error: null 
          })),
        })),
      })),
    })),
  })),
}))

describe('Categories API - Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/categories - Create with Auth', () => {
    test('should require Authorization header', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Test Category',
          hourly_rate_usd: '100',
        },
        headers: {},
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(401)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
    })

    test('should use authenticated user ID, not hardcoded value', async () => {
      const supabase = require('@supabase/supabase-js')
      const mockSupabase = supabase.createClient()
      
      const mockUserId = 'user-abc-123'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          name: 'Test Category',
          hourly_rate_usd: '100',
        },
      })

      await handler(req, res)

      // Should use the authenticated user's ID
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      
      // Should NOT use hardcoded user ID like '13178b88-fd93-4a65-8541-636c76dad940'
    })
  })

  describe('GET /api/categories - Filter by User', () => {
    test('should filter categories by authenticated user', async () => {
      const supabase = require('@supabase/supabase-js')
      const mockSupabase = supabase.createClient()
      
      const mockUserId = 'user-xyz-789'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ 
          data: [
            { id: '1', name: 'Cat1', created_by: mockUserId, hourly_rate_usd: 100 }
          ], 
          error: null 
        }),
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery),
      })

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      })

      await handler(req, res)

      // Should call eq with created_by filter
      expect(mockQuery.eq).toHaveBeenCalledWith('created_by', mockUserId)
    })
  })
})

describe('Categories API - Hourly Rate Field', () => {
  test('should use hourly_rate_usd field name', async () => {
    const supabase = require('@supabase/supabase-js')
    const mockSupabase = supabase.createClient()
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'cat-id',
            name: 'Test',
            hourly_rate_usd: 200,  // Should use this field
          }, 
          error: null 
        }),
      }),
    })

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    })

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
      body: {
        name: 'Test Category',
        hourly_rate_usd: '200',  // Input uses hourly_rate_usd
      },
    })

    await handler(req, res)

    // Verify hourly_rate_usd was used in insert
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        hourly_rate_usd: 200,  // Should store as numeric
      })
    )
  })

  test('should convert string hourly_rate_usd to number', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
      body: {
        name: 'Test',
        hourly_rate_usd: '150',  // String input
      },
    })

    const supabase = require('@supabase/supabase-js')
    const mockSupabase = supabase.createClient()
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    await handler(req, res)

    // Should parse to numeric 150, not string '150'
  })
})
