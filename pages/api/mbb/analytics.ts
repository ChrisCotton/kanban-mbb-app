import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AnalyticsData {
  today_earnings: number
  today_hours: number
  week_earnings: number
  week_hours: number
  month_earnings: number
  month_hours: number
  total_earnings: number
  total_hours: number
  average_hourly_rate: number
  target_balance: number
  sessions_count: {
    today: number
    week: number
    month: number
    total: number
  }
}

interface TimeSession {
  duration_seconds: number | null
  earnings_usd: string | number | null
  started_at: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getAnalytics(req, res)
      default:
        res.setHeader('Allow', ['GET'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error: any) {
    console.error('MBB Analytics API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getAnalytics(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, filter = 'all' } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Get current date boundaries
    const now = new Date()
    
    // Today: start of today in UTC
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)
    
    // This week: start of week (Monday) in UTC
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getUTCDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday)
    weekStart.setUTCHours(0, 0, 0, 0)
    
    // This month: start of month in UTC
    const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)
    monthStart.setUTCHours(0, 0, 0, 0)

    // Fetch all completed sessions for the user
    const { data: sessions, error } = await supabase
      .from('time_sessions')
      .select('duration_seconds, earnings_usd, started_at')
      .eq('user_id', user_id)
      .not('ended_at', 'is', null) // Only completed sessions
      .not('duration_seconds', 'is', null)
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Error fetching time sessions:', error)
      return res.status(500).json({ error: 'Failed to fetch analytics data' })
    }

    // Initialize analytics data
    const analytics: AnalyticsData = {
      today_earnings: 0,
      today_hours: 0,
      week_earnings: 0,
      week_hours: 0,
      month_earnings: 0,
      month_hours: 0,
      total_earnings: 0,
      total_hours: 0,
      average_hourly_rate: 0,
      target_balance: 1000, // Default target, can be fetched from user settings later
      sessions_count: {
        today: 0,
        week: 0,
        month: 0,
        total: 0
      }
    }

    // Process each session
    if (sessions && sessions.length > 0) {
      sessions.forEach((session: TimeSession) => {
        const sessionDate = new Date(session.started_at)
        const durationSeconds = session.duration_seconds || 0
        const earnings = parseFloat(String(session.earnings_usd)) || 0
        const hours = durationSeconds / 3600

        // Add to total
        analytics.total_earnings += earnings
        analytics.total_hours += hours
        analytics.sessions_count.total++

        // Check if session is from today
        if (sessionDate >= todayStart) {
          analytics.today_earnings += earnings
          analytics.today_hours += hours
          analytics.sessions_count.today++
        }

        // Check if session is from this week
        if (sessionDate >= weekStart) {
          analytics.week_earnings += earnings
          analytics.week_hours += hours
          analytics.sessions_count.week++
        }

        // Check if session is from this month
        if (sessionDate >= monthStart) {
          analytics.month_earnings += earnings
          analytics.month_hours += hours
          analytics.sessions_count.month++
        }
      })

      // Calculate average hourly rate
      if (analytics.total_hours > 0) {
        analytics.average_hourly_rate = analytics.total_earnings / analytics.total_hours
      }
    }

    // Round all values to 2 decimal places
    analytics.today_earnings = Math.round(analytics.today_earnings * 100) / 100
    analytics.today_hours = Math.round(analytics.today_hours * 100) / 100
    analytics.week_earnings = Math.round(analytics.week_earnings * 100) / 100
    analytics.week_hours = Math.round(analytics.week_hours * 100) / 100
    analytics.month_earnings = Math.round(analytics.month_earnings * 100) / 100
    analytics.month_hours = Math.round(analytics.month_hours * 100) / 100
    analytics.total_earnings = Math.round(analytics.total_earnings * 100) / 100
    analytics.total_hours = Math.round(analytics.total_hours * 100) / 100
    analytics.average_hourly_rate = Math.round(analytics.average_hourly_rate * 100) / 100

    // Try to fetch user's target balance from settings (if table exists)
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('mbb_settings')
        .select('target_balance_usd')
        .eq('user_id', user_id)
        .single()

      if (settings?.target_balance_usd) {
        analytics.target_balance = parseFloat(settings.target_balance_usd)
      }
    } catch {
      // Settings table may not exist yet, use default
    }

    return res.status(200).json({
      success: true,
      data: analytics,
      period: {
        today_start: todayStart.toISOString(),
        week_start: weekStart.toISOString(),
        month_start: monthStart.toISOString(),
        now: now.toISOString()
      }
    })
  } catch (error: any) {
    console.error('Error in getAnalytics:', error)
    return res.status(500).json({ error: 'Failed to fetch analytics data' })
  }
}
