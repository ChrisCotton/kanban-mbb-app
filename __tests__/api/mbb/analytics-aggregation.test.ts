/**
 * Unit Tests: MBB Analytics Aggregation
 * 
 * Tests that Today/Week/Month totals match session history:
 * - Today totals should equal sum of today's sessions
 * - Week totals should equal sum of this week's sessions
 * - Month totals should equal sum of this month's sessions
 * - Totals should be accurate (±$0.01)
 */

import { NextApiRequest, NextApiResponse } from 'next'

// Mock Supabase
const mockSupabaseSelect = jest.fn()
const mockSupabaseFrom = jest.fn()
const mockSelectEq = jest.fn()
const mockSelectNot = jest.fn()
const mockSelectOrder = jest.fn()
const mockSelectSingle = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom.mockImplementation(() => ({
      select: mockSupabaseSelect.mockReturnValue({
        eq: mockSelectEq.mockReturnThis(),
        not: mockSelectNot.mockReturnThis(),
        order: mockSelectOrder.mockResolvedValue({ data: [], error: null }),
      }),
    })),
  })),
}))

describe('MBB Analytics Aggregation Tests', () => {
  let handler: typeof import('../../../pages/api/mbb/analytics').default
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    handler = require('../../../pages/api/mbb/analytics').default

    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'GET',
      query: { user_id: 'user-123' },
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
    }

    jest.clearAllMocks()
    mockSelectEq.mockReturnThis()
    mockSelectNot.mockReturnThis()
  })

  describe('Today Aggregation', () => {
    it('should match today totals with today sessions', async () => {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setUTCHours(0, 0, 0, 0)

      // Create sessions for today
      const todaySessions = [
        {
          duration_seconds: 3600, // 1 hour
          earnings_usd: 100.00,
          started_at: new Date(todayStart.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours after midnight
        },
        {
          duration_seconds: 1800, // 30 minutes
          earnings_usd: 50.00,
          started_at: new Date(todayStart.getTime() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours after midnight
        },
      ]

      // Mock the query to return today's sessions
      mockSelectOrder.mockResolvedValueOnce({
        data: todaySessions,
        error: null,
      })

      // Mock settings query
      mockSelectSingle.mockResolvedValueOnce({
        data: { target_balance_usd: 1000 },
        error: null,
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      const response = jsonMock.mock.calls[0][0]
      
      // Today totals should match sum of today's sessions
      expect(response.data.today_earnings).toBe(150.00) // 100 + 50
      expect(response.data.today_hours).toBe(1.5) // 1 + 0.5
      expect(response.data.sessions_count.today).toBe(2)
    })

    it('should exclude yesterday sessions from today totals', async () => {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setUTCHours(0, 0, 0, 0)
      const yesterday = new Date(todayStart)
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)

      const sessions = [
        {
          duration_seconds: 3600,
          earnings_usd: 100.00,
          started_at: todayStart.toISOString(), // Today
        },
        {
          duration_seconds: 1800,
          earnings_usd: 50.00,
          started_at: yesterday.toISOString(), // Yesterday - should be excluded
        },
      ]

      mockSelectOrder.mockResolvedValueOnce({
        data: sessions,
        error: null,
      })

      mockSelectSingle.mockResolvedValueOnce({
        data: { target_balance_usd: 1000 },
        error: null,
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      
      // Today should only include today's session
      expect(response.data.today_earnings).toBe(100.00)
      expect(response.data.today_hours).toBe(1.0)
      expect(response.data.sessions_count.today).toBe(1)
      
      // Total should include both
      expect(response.data.total_earnings).toBe(150.00)
      expect(response.data.total_hours).toBe(1.5)
    })
  })

  describe('Week Aggregation', () => {
    it('should match week totals with this week sessions', async () => {
      const now = new Date()
      const weekStart = new Date(now)
      const dayOfWeek = weekStart.getUTCDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday)
      weekStart.setUTCHours(0, 0, 0, 0)

      const weekSessions = [
        {
          duration_seconds: 3600,
          earnings_usd: 100.00,
          started_at: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tuesday
        },
        {
          duration_seconds: 7200, // 2 hours
          earnings_usd: 200.00,
          started_at: new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Thursday
        },
      ]

      mockSelectOrder.mockResolvedValueOnce({
        data: weekSessions,
        error: null,
      })

      mockSelectSingle.mockResolvedValueOnce({
        data: { target_balance_usd: 1000 },
        error: null,
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      
      expect(response.data.week_earnings).toBe(300.00) // 100 + 200
      expect(response.data.week_hours).toBe(3.0) // 1 + 2
      expect(response.data.sessions_count.week).toBe(2)
    })
  })

  describe('Month Aggregation', () => {
    it('should match month totals with this month sessions', async () => {
      const now = new Date()
      const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)
      monthStart.setUTCHours(0, 0, 0, 0)

      const monthSessions = [
        {
          duration_seconds: 3600,
          earnings_usd: 100.00,
          started_at: new Date(monthStart.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Day 5
        },
        {
          duration_seconds: 5400, // 1.5 hours
          earnings_usd: 150.00,
          started_at: new Date(monthStart.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(), // Day 15
        },
        {
          duration_seconds: 7200, // 2 hours
          earnings_usd: 200.00,
          started_at: new Date(monthStart.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(), // Day 25
        },
      ]

      mockSelectOrder.mockResolvedValueOnce({
        data: monthSessions,
        error: null,
      })

      mockSelectSingle.mockResolvedValueOnce({
        data: { target_balance_usd: 1000 },
        error: null,
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      
      expect(response.data.month_earnings).toBe(450.00) // 100 + 150 + 200
      expect(response.data.month_hours).toBe(4.5) // 1 + 1.5 + 2
      expect(response.data.sessions_count.month).toBe(3)
    })
  })

  describe('Aggregation Accuracy', () => {
    it('should calculate totals accurately (±$0.01)', async () => {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setUTCHours(0, 0, 0, 0)

      // Sessions with precise earnings
      const sessions = [
        {
          duration_seconds: 2220, // 37 minutes
          earnings_usd: 55.50, // Exactly 2220/3600 * 90
          started_at: todayStart.toISOString(),
        },
        {
          duration_seconds: 3660, // 61 minutes
          earnings_usd: 101.67, // Rounded from 3660/3600 * 100
          started_at: new Date(todayStart.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        },
      ]

      mockSelectOrder.mockResolvedValueOnce({
        data: sessions,
        error: null,
      })

      mockSelectSingle.mockResolvedValueOnce({
        data: { target_balance_usd: 1000 },
        error: null,
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      
      // Total should be sum: 55.50 + 101.67 = 157.17
      expect(response.data.today_earnings).toBeCloseTo(157.17, 2)
      expect(response.data.total_earnings).toBeCloseTo(157.17, 2)
    })

    it('should handle sessions with null earnings (no hourly rate)', async () => {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setUTCHours(0, 0, 0, 0)

      const sessions = [
        {
          duration_seconds: 3600,
          earnings_usd: 100.00,
          started_at: todayStart.toISOString(),
        },
        {
          duration_seconds: 1800,
          earnings_usd: null, // No hourly rate set
          started_at: new Date(todayStart.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        },
      ]

      mockSelectOrder.mockResolvedValueOnce({
        data: sessions,
        error: null,
      })

      mockSelectSingle.mockResolvedValueOnce({
        data: { target_balance_usd: 1000 },
        error: null,
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      
      // Earnings should only count sessions with earnings
      expect(response.data.today_earnings).toBe(100.00)
      // Hours should count all sessions (even without earnings) - this is correct behavior
      expect(response.data.today_hours).toBe(1.5) // 1 hour + 0.5 hour
    })
  })

  describe('Average Hourly Rate Calculation', () => {
    it('should calculate average hourly rate correctly', async () => {
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setUTCHours(0, 0, 0, 0)

      const sessions = [
        {
          duration_seconds: 3600, // 1 hour
          earnings_usd: 100.00, // $100/hr
          started_at: todayStart.toISOString(),
        },
        {
          duration_seconds: 3600, // 1 hour
          earnings_usd: 200.00, // $200/hr
          started_at: new Date(todayStart.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        },
      ]

      mockSelectOrder.mockResolvedValueOnce({
        data: sessions,
        error: null,
      })

      mockSelectSingle.mockResolvedValueOnce({
        data: { target_balance_usd: 1000 },
        error: null,
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      
      // Average: (100 + 200) / (1 + 1) = 150
      expect(response.data.average_hourly_rate).toBe(150.00)
      expect(response.data.total_earnings).toBe(300.00)
      expect(response.data.total_hours).toBe(2.0)
    })
  })
})
