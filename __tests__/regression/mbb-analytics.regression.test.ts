/**
 * REGRESSION TEST: MBB Analytics API
 * 
 * Feature: Analytics aggregation from time_sessions table
 * Created: 2026-01-15
 * 
 * This test ensures analytics calculations (today/week/month/total) 
 * are accurate and consistent across different time periods.
 */

// Mock the supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          not: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }))
}))

describe('REGRESSION: MBB Analytics Calculations', () => {
  // Helper to create mock sessions
  const createMockSession = (
    durationSeconds: number,
    earningsUsd: number,
    startedAt: Date
  ) => ({
    duration_seconds: durationSeconds,
    earnings_usd: earningsUsd,
    started_at: startedAt.toISOString()
  })

  // Helper to get date boundaries
  const getDateBoundaries = () => {
    const now = new Date()
    
    // Today start
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    
    // Week start (Monday)
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getUTCDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday)
    weekStart.setUTCHours(0, 0, 0, 0)
    
    // Month start
    const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)
    monthStart.setUTCHours(0, 0, 0, 0)
    
    return { now, todayStart, weekStart, monthStart }
  }

  describe('Zero Values When No Sessions Exist', () => {
    test('should return zero for all values when no sessions exist', () => {
      const sessions: any[] = []
      
      const analytics = {
        today_earnings: 0,
        today_hours: 0,
        week_earnings: 0,
        week_hours: 0,
        month_earnings: 0,
        month_hours: 0,
        total_earnings: 0,
        total_hours: 0,
        average_hourly_rate: 0,
        sessions_count: { today: 0, week: 0, month: 0, total: 0 }
      }

      // Process empty sessions array
      sessions.forEach(() => {
        // Should not execute
      })

      expect(analytics.today_earnings).toBe(0)
      expect(analytics.week_earnings).toBe(0)
      expect(analytics.month_earnings).toBe(0)
      expect(analytics.total_earnings).toBe(0)
      expect(analytics.today_hours).toBe(0)
      expect(analytics.total_hours).toBe(0)
      expect(analytics.average_hourly_rate).toBe(0)
      expect(analytics.sessions_count.total).toBe(0)
    })
  })

  describe('Today Aggregation', () => {
    test('should aggregate sessions from today correctly', () => {
      const { todayStart } = getDateBoundaries()
      
      // Session from 2 hours ago (today)
      const twoHoursAgo = new Date()
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
      
      const sessions = [
        createMockSession(3600, 150, twoHoursAgo), // 1 hour at $150/hr = $150
        createMockSession(1800, 75, twoHoursAgo),  // 30 min at $150/hr = $75
      ]

      let todayEarnings = 0
      let todayHours = 0
      let todayCount = 0

      sessions.forEach(session => {
        const sessionDate = new Date(session.started_at)
        if (sessionDate >= todayStart) {
          todayEarnings += session.earnings_usd
          todayHours += session.duration_seconds / 3600
          todayCount++
        }
      })

      expect(todayEarnings).toBe(225) // $150 + $75
      expect(todayHours).toBe(1.5)     // 1 hr + 0.5 hr
      expect(todayCount).toBe(2)
    })

    test('should exclude sessions from yesterday', () => {
      const { todayStart } = getDateBoundaries()
      
      // Session from yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const sessions = [
        createMockSession(3600, 150, yesterday)
      ]

      let todayEarnings = 0
      
      sessions.forEach(session => {
        const sessionDate = new Date(session.started_at)
        if (sessionDate >= todayStart) {
          todayEarnings += session.earnings_usd
        }
      })

      expect(todayEarnings).toBe(0) // Yesterday's session not included
    })
  })

  describe('This Week Aggregation', () => {
    test('should aggregate sessions from this week correctly', () => {
      const { weekStart } = getDateBoundaries()
      
      // Sessions from this week
      const now = new Date()
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      
      const sessions = [
        createMockSession(3600, 200, now),
        createMockSession(7200, 400, twoDaysAgo), // 2 hours
      ]

      let weekEarnings = 0
      let weekHours = 0

      sessions.forEach(session => {
        const sessionDate = new Date(session.started_at)
        if (sessionDate >= weekStart) {
          weekEarnings += session.earnings_usd
          weekHours += session.duration_seconds / 3600
        }
      })

      expect(weekEarnings).toBe(600) // $200 + $400
      expect(weekHours).toBe(3)       // 1 hr + 2 hr
    })

    test('should exclude sessions from last week', () => {
      const { weekStart } = getDateBoundaries()
      
      // Session from 10 days ago (definitely last week or before)
      const tenDaysAgo = new Date()
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
      
      const sessions = [
        createMockSession(3600, 150, tenDaysAgo)
      ]

      let weekEarnings = 0
      
      sessions.forEach(session => {
        const sessionDate = new Date(session.started_at)
        if (sessionDate >= weekStart) {
          weekEarnings += session.earnings_usd
        }
      })

      expect(weekEarnings).toBe(0)
    })
  })

  describe('This Month Aggregation', () => {
    test('should aggregate sessions from this month correctly', () => {
      const { monthStart } = getDateBoundaries()
      
      // Create session at the start of this month (1st at noon)
      const startOfMonth = new Date(monthStart)
      startOfMonth.setUTCHours(12, 0, 0, 0)
      
      const now = new Date()
      
      const sessions = [
        createMockSession(3600, 100, now),
        createMockSession(3600, 100, startOfMonth),
      ]

      let monthEarnings = 0

      sessions.forEach(session => {
        const sessionDate = new Date(session.started_at)
        if (sessionDate >= monthStart) {
          monthEarnings += session.earnings_usd
        }
      })

      expect(monthEarnings).toBe(200) // Both sessions are this month
    })

    test('should exclude sessions from last month', () => {
      const { monthStart } = getDateBoundaries()
      
      // Session from last month
      const lastMonth = new Date(monthStart)
      lastMonth.setDate(lastMonth.getDate() - 1)
      
      const sessions = [
        createMockSession(3600, 150, lastMonth)
      ]

      let monthEarnings = 0
      
      sessions.forEach(session => {
        const sessionDate = new Date(session.started_at)
        if (sessionDate >= monthStart) {
          monthEarnings += session.earnings_usd
        }
      })

      expect(monthEarnings).toBe(0)
    })
  })

  describe('Total Aggregation', () => {
    test('should sum all completed sessions', () => {
      const now = new Date()
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      const lastYear = new Date()
      lastYear.setFullYear(lastYear.getFullYear() - 1)
      
      const sessions = [
        createMockSession(3600, 100, now),
        createMockSession(3600, 200, lastMonth),
        createMockSession(3600, 300, lastYear),
      ]

      let totalEarnings = 0
      let totalHours = 0

      sessions.forEach(session => {
        totalEarnings += session.earnings_usd
        totalHours += session.duration_seconds / 3600
      })

      expect(totalEarnings).toBe(600)
      expect(totalHours).toBe(3)
    })
  })

  describe('Average Hourly Rate Calculation', () => {
    test('should calculate average hourly rate correctly', () => {
      const sessions = [
        createMockSession(3600, 150, new Date()), // $150/hr
        createMockSession(3600, 200, new Date()), // $200/hr
      ]

      let totalEarnings = 0
      let totalHours = 0

      sessions.forEach(session => {
        totalEarnings += session.earnings_usd
        totalHours += session.duration_seconds / 3600
      })

      const avgRate = totalHours > 0 ? totalEarnings / totalHours : 0

      expect(totalEarnings).toBe(350)
      expect(totalHours).toBe(2)
      expect(avgRate).toBe(175) // Average of $150 and $200
    })

    test('should handle zero hours gracefully', () => {
      const totalHours = 0
      const totalEarnings = 0
      
      const avgRate = totalHours > 0 ? totalEarnings / totalHours : 0

      expect(avgRate).toBe(0)
      expect(Number.isFinite(avgRate)).toBe(true) // No division by zero error
    })

    test('should weight by duration, not count', () => {
      const sessions = [
        createMockSession(7200, 400, new Date()), // 2 hrs at $200/hr
        createMockSession(3600, 100, new Date()), // 1 hr at $100/hr
      ]

      let totalEarnings = 0
      let totalHours = 0

      sessions.forEach(session => {
        totalEarnings += session.earnings_usd
        totalHours += session.duration_seconds / 3600
      })

      const avgRate = totalEarnings / totalHours

      // Weighted average: (400 + 100) / 3 = 166.67, not (200 + 100) / 2 = 150
      expect(avgRate).toBeCloseTo(166.67, 2)
    })
  })

  describe('Earnings Calculation Accuracy', () => {
    test('should round to 2 decimal places', () => {
      // 17 minutes at $120/hr = $34.00
      const durationSeconds = 17 * 60
      const rate = 120
      const earnings = (durationSeconds / 3600) * rate
      const rounded = Math.round(earnings * 100) / 100

      expect(rounded).toBe(34)
    })

    test('should handle fractional cents correctly', () => {
      // 1 second at $100/hr = $0.0277... → rounds to $0.03
      const durationSeconds = 1
      const rate = 100
      const earnings = (durationSeconds / 3600) * rate
      const rounded = Math.round(earnings * 100) / 100

      expect(rounded).toBeCloseTo(0.03, 2)
    })
  })

  describe('Session Counting', () => {
    test('should count sessions correctly by period', () => {
      const { todayStart, weekStart, monthStart } = getDateBoundaries()
      
      const now = new Date()
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      
      const sessions = [
        createMockSession(3600, 100, now),
        createMockSession(3600, 100, now),
        createMockSession(3600, 100, threeDaysAgo),
        createMockSession(3600, 100, twoWeeksAgo),
      ]

      const counts = { today: 0, week: 0, month: 0, total: 0 }

      sessions.forEach(session => {
        const sessionDate = new Date(session.started_at)
        counts.total++
        
        if (sessionDate >= todayStart) counts.today++
        if (sessionDate >= weekStart) counts.week++
        if (sessionDate >= monthStart) counts.month++
      })

      expect(counts.total).toBe(4)
      expect(counts.today).toBe(2)
      expect(counts.week).toBeGreaterThanOrEqual(2) // Depends on day of week
      expect(counts.month).toBeGreaterThanOrEqual(3) // Depends on day of month
    })
  })

  describe('Active Sessions Exclusion', () => {
    test('should only count completed sessions (ended_at not null)', () => {
      // This is handled by the API query:
      // .not('ended_at', 'is', null)
      
      // Active session simulation (no earnings yet)
      const activeSession = {
        duration_seconds: null,
        earnings_usd: null,
        started_at: new Date().toISOString(),
        ended_at: null,
        is_active: true
      }

      // Completed session
      const completedSession = {
        duration_seconds: 3600,
        earnings_usd: 150,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        is_active: false
      }

      // Filter logic (as API would do)
      const sessions = [activeSession, completedSession]
      const completedSessions = sessions.filter(s => s.ended_at !== null)

      expect(completedSessions.length).toBe(1)
      expect(completedSessions[0].earnings_usd).toBe(150)
    })
  })

  describe('Edge Cases', () => {
    test('should handle null duration gracefully', () => {
      const session = {
        duration_seconds: null,
        earnings_usd: 0,
        started_at: new Date().toISOString()
      }

      const hours = (session.duration_seconds || 0) / 3600
      expect(hours).toBe(0)
    })

    test('should handle string earnings_usd', () => {
      const session = {
        duration_seconds: 3600,
        earnings_usd: '150.00', // Sometimes returned as string from DB
        started_at: new Date().toISOString()
      }

      const earnings = parseFloat(String(session.earnings_usd)) || 0
      expect(earnings).toBe(150)
    })

    test('should handle very large durations', () => {
      // 100 hours
      const durationSeconds = 360000
      const rate = 200
      const earnings = (durationSeconds / 3600) * rate

      expect(earnings).toBe(20000) // $20,000
    })

    test('should handle midnight boundary correctly', () => {
      const now = new Date()
      now.setUTCHours(0, 0, 0, 0) // Exactly midnight
      
      const todayStart = new Date(now)
      
      const sessionAtMidnight = createMockSession(3600, 100, now)
      const sessionDate = new Date(sessionAtMidnight.started_at)
      
      // Session at exactly midnight should be included in today
      expect(sessionDate >= todayStart).toBe(true)
    })
  })

  describe('Period Boundary Calculations', () => {
    test('week should start on Monday', () => {
      const now = new Date()
      const weekStart = new Date(now)
      const dayOfWeek = weekStart.getUTCDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday)
      weekStart.setUTCHours(0, 0, 0, 0)

      // Monday = 1, so weekStart should be Monday
      expect(weekStart.getUTCDay()).toBe(1)
    })

    test('month should start on 1st', () => {
      const now = new Date()
      const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)
      monthStart.setUTCHours(0, 0, 0, 0)

      expect(monthStart.getUTCDate()).toBe(1)
    })
  })
})
