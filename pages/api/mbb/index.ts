import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getMBBData(req, res)
      case 'POST':
        return await updateMBBSettings(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('MBB API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getMBBData(req: NextApiRequest, res: NextApiResponse) {
  const { 
    user_id,
    include_history = 'false',
    include_sessions = 'false',
    date_range = '30',
    limit = '50'
  } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Get current MBB settings and balance
    const { data: mbbSettings, error: settingsError } = await supabase
      .from('mbb_settings')
      .select(`
        id,
        target_balance_usd,
        current_balance_usd,
        progress_percentage,
        show_balance,
        show_progress,
        show_earnings_rate,
        notification_enabled,
        target_reminder_frequency,
        targets_reached_count,
        current_streak_days,
        longest_streak_days,
        last_balance_update,
        created_at,
        updated_at
      `)
      .eq('user_id', user_id)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching MBB settings:', settingsError)
      return res.status(500).json({ error: 'Failed to fetch MBB settings' })
    }

    // If no settings exist, create default ones
    let settings = mbbSettings
    if (!mbbSettings) {
      const { data: newSettings, error: createError } = await supabase
        .from('mbb_settings')
        .insert({
          user_id,
          target_balance_usd: 1000.00,
          current_balance_usd: 0.00,
          show_balance: true,
          show_progress: true,
          show_earnings_rate: true,
          notification_enabled: true,
          target_reminder_frequency: 'daily'
        })
        .select('*')
        .single()

      if (createError) {
        console.error('Error creating default MBB settings:', createError)
        return res.status(500).json({ error: 'Failed to initialize MBB settings' })
      }
      settings = newSettings
    }

    // Get earnings summary from time sessions
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - parseInt(date_range as string))

    const { data: sessionSummary } = await supabase
      .from('time_sessions')
      .select('earnings_usd, duration_seconds, created_at')
      .eq('user_id', user_id)
      .gte('created_at', dateFilter.toISOString())
      .not('earnings_usd', 'is', null)

    const earnings = {
      total_earnings: sessionSummary?.reduce((sum, s) => sum + (parseFloat(s.earnings_usd) || 0), 0) || 0,
      total_time_seconds: sessionSummary?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0,
      session_count: sessionSummary?.length || 0,
      avg_hourly_rate: 0,
      daily_average: 0
    }

    if (earnings.total_time_seconds > 0) {
      earnings.avg_hourly_rate = (earnings.total_earnings / (earnings.total_time_seconds / 3600))
    }

    if (sessionSummary && sessionSummary.length > 0) {
      const days = parseInt(date_range as string)
      earnings.daily_average = earnings.total_earnings / days
    }

    // Get recent time sessions if requested
    let recentSessions = null
    if (include_sessions === 'true') {
      const { data: sessions } = await supabase
        .from('time_sessions')
        .select(`
          id,
          task_id,
          category_id,
          started_at,
          ended_at,
          duration_seconds,
          hourly_rate_usd,
          earnings_usd,
          tasks:task_id (
            id,
            title,
            status
          ),
          categories:category_id (
            id,
            name,
            color
          )
        `)
        .eq('user_id', user_id)
        .order('started_at', { ascending: false })
        .limit(parseInt(limit as string) || 50)

      recentSessions = sessions
    }

    // Get balance history if requested
    let balanceHistory = null
    if (include_history === 'true') {
      // Get daily balance snapshots from time sessions
      const { data: history } = await supabase
        .rpc('get_daily_balance_history', {
          p_user_id: user_id,
          p_days: parseInt(date_range as string)
        })

      balanceHistory = history
    }

    // Calculate progress metrics
    const progressMetrics = {
      target_progress: settings.progress_percentage || 0,
      days_to_target: 0,
      weekly_goal: 0,
      monthly_goal: 0,
      on_track: false
    }

    if (settings.target_balance_usd && earnings.daily_average > 0) {
      const remaining = settings.target_balance_usd - settings.current_balance_usd
      progressMetrics.days_to_target = Math.ceil(remaining / earnings.daily_average)
      progressMetrics.weekly_goal = earnings.daily_average * 7
      progressMetrics.monthly_goal = earnings.daily_average * 30
      progressMetrics.on_track = earnings.daily_average >= (remaining / 30) // 30-day target
    }

    return res.status(200).json({
      success: true,
      data: {
        settings,
        earnings,
        progress_metrics: progressMetrics,
        recent_sessions: recentSessions,
        balance_history: balanceHistory,
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in getMBBData:', error)
    return res.status(500).json({ error: 'Failed to fetch MBB data' })
  }
}

async function updateMBBSettings(req: NextApiRequest, res: NextApiResponse) {
  const {
    user_id,
    target_balance_usd,
    show_balance,
    show_progress,
    show_earnings_rate,
    notification_enabled,
    target_reminder_frequency,
    action
  } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Handle special actions
    if (action === 'sync_balance') {
      return await syncMBBBalance(res, user_id)
    } else if (action === 'reset_target') {
      return await resetMBBTarget(res, user_id)
    }

    // Regular settings update
    const updateData: any = {}

    if (target_balance_usd !== undefined) {
      const targetAmount = parseFloat(target_balance_usd)
      if (isNaN(targetAmount) || targetAmount < 0) {
        return res.status(400).json({ error: 'target_balance_usd must be a positive number' })
      }
      updateData.target_balance_usd = targetAmount
    }

    if (show_balance !== undefined) {
      updateData.show_balance = Boolean(show_balance)
    }

    if (show_progress !== undefined) {
      updateData.show_progress = Boolean(show_progress)
    }

    if (show_earnings_rate !== undefined) {
      updateData.show_earnings_rate = Boolean(show_earnings_rate)
    }

    if (notification_enabled !== undefined) {
      updateData.notification_enabled = Boolean(notification_enabled)
    }

    if (target_reminder_frequency !== undefined) {
      const validFrequencies = ['never', 'daily', 'weekly', 'monthly']
      if (!validFrequencies.includes(target_reminder_frequency)) {
        return res.status(400).json({ 
          error: 'target_reminder_frequency must be one of: never, daily, weekly, monthly' 
        })
      }
      updateData.target_reminder_frequency = target_reminder_frequency
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' })
    }

    // Update settings
    const { data: updatedSettings, error } = await supabase
      .from('mbb_settings')
      .update(updateData)
      .eq('user_id', user_id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating MBB settings:', error)
      return res.status(500).json({ error: 'Failed to update MBB settings' })
    }

    return res.status(200).json({
      success: true,
      data: updatedSettings,
      message: 'MBB settings updated successfully'
    })

  } catch (error) {
    console.error('Error in updateMBBSettings:', error)
    return res.status(500).json({ error: 'Failed to update MBB settings' })
  }
}

async function syncMBBBalance(res: NextApiResponse, userId: string) {
  try {
    // Use the database function to sync balance
    const { error } = await supabase
      .rpc('sync_mbb_balance', {
        p_user_id: userId
      })

    if (error) {
      console.error('Error syncing MBB balance:', error)
      return res.status(500).json({ error: 'Failed to sync MBB balance' })
    }

    // Get updated settings
    const { data: updatedSettings } = await supabase
      .from('mbb_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    return res.status(200).json({
      success: true,
      data: updatedSettings,
      message: 'MBB balance synced successfully'
    })

  } catch (error) {
    console.error('Error in syncMBBBalance:', error)
    return res.status(500).json({ error: 'Failed to sync MBB balance' })
  }
}

async function resetMBBTarget(res: NextApiResponse, userId: string) {
  try {
    // Reset target-related fields
    const { data: updatedSettings, error } = await supabase
      .from('mbb_settings')
      .update({
        targets_reached_count: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        last_balance_update: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('Error resetting MBB target:', error)
      return res.status(500).json({ error: 'Failed to reset MBB target' })
    }

    return res.status(200).json({
      success: true,
      data: updatedSettings,
      message: 'MBB target metrics reset successfully'
    })

  } catch (error) {
    console.error('Error in resetMBBTarget:', error)
    return res.status(500).json({ error: 'Failed to reset MBB target' })
  }
} 