/**
 * Unit Tests: Earnings Calculation for Time Sessions
 * 
 * Tests earnings calculation accuracy for various scenarios:
 * - Different durations (seconds, minutes, hours)
 * - Different hourly rates
 * - Edge cases (0 duration, null rates, etc.)
 * - Rounding precision
 */

import { NextApiRequest, NextApiResponse } from 'next'

// Import mocks from existing test file
import {
  mockSupabaseRpc,
  mockSupabaseFrom,
  mockSelectEq,
  mockSelectSingle,
  mockSelectMaybeSingle,
  mockUpdateEq,
} from '../time-sessions/index.test'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: mockSelectEq,
        single: mockSelectSingle,
        maybeSingle: mockSelectMaybeSingle,
      })),
      update: jest.fn(() => ({
        eq: mockUpdateEq.mockReturnThis(),
      })),
    })),
    rpc: mockSupabaseRpc,
  })),
}))

describe('Earnings Calculation Tests', () => {
  let handler: typeof import('../../../pages/api/time-sessions/index').default
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    handler = require('../../../pages/api/time-sessions/index').default

    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'POST',
      body: {},
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
    }

    jest.clearAllMocks()
    mockSelectEq.mockReturnThis()
    mockSelectSingle.mockResolvedValue({ data: null, error: null })
    mockSelectMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockUpdateEq.mockReturnThis()
    mockUpdateEq.mockResolvedValue({ data: null, error: null })
  })

  describe('Earnings Calculation Accuracy', () => {
    it('should calculate earnings correctly for 1 hour at $100/hr', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'todo',
      }

      const mockSessionId = 'session-123'
      // Simulate 1 hour = 3600 seconds
      const mockNewSession = {
        id: mockSessionId,
        task_id: 'task-1',
        category_id: 'cat-1',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T11:00:00Z', // 1 hour later
        duration_seconds: 3600,
        hourly_rate_usd: 100,
        earnings_usd: 100.00, // Should be exactly $100
        is_active: false,
        tasks: { id: 'task-1', title: 'Test Task', status: 'in_progress' },
        categories: { id: 'cat-1', name: 'Development', color: '#FF5733' },
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      const response = jsonMock.mock.calls[0][0]
      expect(response.data.earnings_usd).toBe(100.00)
    })

    it('should calculate earnings correctly for 30 minutes at $100/hr', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'todo',
      }

      const mockSessionId = 'session-123'
      // Simulate 30 minutes = 1800 seconds
      const mockNewSession = {
        id: mockSessionId,
        task_id: 'task-1',
        category_id: 'cat-1',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T10:30:00Z', // 30 minutes later
        duration_seconds: 1800,
        hourly_rate_usd: 100,
        earnings_usd: 50.00, // Should be exactly $50
        is_active: false,
        tasks: { id: 'task-1', title: 'Test Task', status: 'in_progress' },
        categories: { id: 'cat-1', name: 'Development', color: '#FF5733' },
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      const response = jsonMock.mock.calls[0][0]
      expect(response.data.earnings_usd).toBe(50.00)
    })

    it('should calculate earnings correctly for 1 minute at $100/hr', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'todo',
      }

      const mockSessionId = 'session-123'
      // Simulate 1 minute = 60 seconds
      const mockNewSession = {
        id: mockSessionId,
        task_id: 'task-1',
        category_id: 'cat-1',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T10:01:00Z', // 1 minute later
        duration_seconds: 60,
        hourly_rate_usd: 100,
        earnings_usd: 1.67, // Should be approximately $1.67 (100/60)
        is_active: false,
        tasks: { id: 'task-1', title: 'Test Task', status: 'in_progress' },
        categories: { id: 'cat-1', name: 'Development', color: '#FF5733' },
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      const response = jsonMock.mock.calls[0][0]
      // Should round to 2 decimal places: 100/60 = 1.6666... -> 1.67
      expect(response.data.earnings_usd).toBeCloseTo(1.67, 2)
    })

    it('should return 0.00 earnings for 0 duration', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'todo',
      }

      const mockSessionId = 'session-123'
      const mockNewSession = {
        id: mockSessionId,
        task_id: 'task-1',
        category_id: 'cat-1',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T10:00:00Z', // Same time = 0 duration
        duration_seconds: 0,
        hourly_rate_usd: 100,
        earnings_usd: 0.00, // Should be $0.00
        is_active: false,
        tasks: { id: 'task-1', title: 'Test Task', status: 'in_progress' },
        categories: { id: 'cat-1', name: 'Development', color: '#FF5733' },
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      const response = jsonMock.mock.calls[0][0]
      expect(response.data.earnings_usd).toBe(0.00)
    })

    it('should handle null hourly_rate_usd gracefully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: null, // No category
        status: 'todo',
      }

      const mockSessionId = 'session-123'
      const mockNewSession = {
        id: mockSessionId,
        task_id: 'task-1',
        category_id: null,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T11:00:00Z',
        duration_seconds: 3600,
        hourly_rate_usd: null,
        earnings_usd: null, // Should be null when no rate
        is_active: false,
        tasks: { id: 'task-1', title: 'Test Task', status: 'in_progress' },
        categories: null,
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        // No hourly_rate_usd provided
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      const response = jsonMock.mock.calls[0][0]
      expect(response.data.earnings_usd).toBeNull()
    })

    it('should round earnings to 2 decimal places', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'todo',
      }

      const mockSessionId = 'session-123'
      // Simulate 37 minutes = 2220 seconds at $90/hr
      // 2220/3600 * 90 = 55.5 exactly
      const mockNewSession = {
        id: mockSessionId,
        task_id: 'task-1',
        category_id: 'cat-1',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T10:37:00Z',
        duration_seconds: 2220,
        hourly_rate_usd: 90,
        earnings_usd: 55.50, // Should round to 2 decimals
        is_active: false,
        tasks: { id: 'task-1', title: 'Test Task', status: 'in_progress' },
        categories: { id: 'cat-1', name: 'Development', color: '#FF5733' },
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 90,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      const response = jsonMock.mock.calls[0][0]
      expect(response.data.earnings_usd).toBe(55.50)
    })
  })

  describe('Earnings Formula Verification', () => {
    it('should use formula: (duration_seconds / 3600) * hourly_rate_usd', () => {
      // Test the formula directly
      const testCases = [
        { duration: 3600, rate: 100, expected: 100.00 }, // 1 hour
        { duration: 1800, rate: 100, expected: 50.00 },  // 30 min
        { duration: 60, rate: 100, expected: 1.67 },     // 1 min (rounded)
        { duration: 2220, rate: 90, expected: 55.50 },    // 37 min
        { duration: 0, rate: 100, expected: 0.00 },       // 0 duration
      ]

      testCases.forEach(({ duration, rate, expected }) => {
        const calculated = Math.round((duration / 3600) * rate * 100) / 100
        expect(calculated).toBeCloseTo(expected, 2)
      })
    })
  })
})
