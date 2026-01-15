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
        return await getTimeSessions(req, res)
      case 'POST':
        return await startTimeSession(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Time sessions API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getTimeSessions(req: NextApiRequest, res: NextApiResponse) {
  const { 
    user_id, 
    task_id, 
    category_id, 
    active_only = 'false',
    start_date,
    end_date,
    limit = '50',
    offset = '0'
  } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    let query = supabase
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
        is_active,
        session_notes,
        created_at,
        updated_at,
        tasks:task_id (
          id,
          title,
          status,
          priority
        ),
        categories:category_id (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('user_id', user_id)
      .order('started_at', { ascending: false })

    // Apply filters
    if (task_id) {
      query = query.eq('task_id', task_id)
    }

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (active_only === 'true') {
      query = query.eq('is_active', true)
    }

    if (start_date) {
      query = query.gte('started_at', start_date)
    }

    if (end_date) {
      query = query.lte('started_at', end_date)
    }

    // Apply pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 100)
    const offsetNum = parseInt(offset as string) || 0
    
    query = query.range(offsetNum, offsetNum + limitNum - 1)

    const { data: sessions, error, count } = await query

    if (error) {
      console.error('Error fetching time sessions:', error)
      return res.status(500).json({ error: 'Failed to fetch time sessions' })
    }

    // Get summary statistics
    const { data: summaryData } = await supabase
      .from('time_sessions')
      .select('duration_seconds, earnings_usd')
      .eq('user_id', user_id)
      .not('duration_seconds', 'is', null)
      .not('earnings_usd', 'is', null)

    const summary = {
      total_sessions: summaryData?.length || 0,
      total_time_seconds: summaryData?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0,
      total_earnings_usd: summaryData?.reduce((sum, s) => sum + (parseFloat(s.earnings_usd) || 0), 0) || 0,
      avg_session_duration: 0,
      avg_hourly_rate: 0
    }

    if (summary.total_sessions > 0) {
      summary.avg_session_duration = Math.round(summary.total_time_seconds / summary.total_sessions)
      summary.avg_hourly_rate = summary.total_time_seconds > 0 
        ? Math.round((summary.total_earnings_usd / (summary.total_time_seconds / 3600)) * 100) / 100
        : 0
    }

    return res.status(200).json({
      success: true,
      data: sessions,
      count: sessions?.length || 0,
      summary,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        has_more: (sessions?.length || 0) === limitNum
      }
    })

  } catch (error) {
    console.error('Error in getTimeSessions:', error)
    return res.status(500).json({ error: 'Failed to fetch time sessions' })
  }
}

async function startTimeSession(req: NextApiRequest, res: NextApiResponse) {
  const { 
    task_id, 
    user_id, 
    hourly_rate_usd,
    session_notes 
  } = req.body

  // Validation
  if (!task_id || !user_id) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['task_id', 'user_id']
    })
  }

  if (hourly_rate_usd && (typeof hourly_rate_usd !== 'number' || hourly_rate_usd < 0)) {
    return res.status(400).json({ 
      error: 'hourly_rate_usd must be a positive number' 
    })
  }

  try {
    // Verify task exists and user owns it
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, category_id, status')
      .eq('id', task_id)
      .eq('user_id', user_id)
      .single()

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found or access denied' })
    }

    // Check if this task already has an active session
    const { data: activeSession } = await supabase
      .from('time_sessions')
      .select('id, task_id, started_at')
      .eq('user_id', user_id)
      .eq('task_id', task_id)
      .eq('is_active', true)
      .is('ended_at', null)
      .maybeSingle()

    if (activeSession) {
      return res.status(409).json({
        error: 'Task already has an active time session',
        active_session: {
          id: activeSession.id,
          task_id: activeSession.task_id,
          started_at: activeSession.started_at
        }
      })
    }

    // Use the database function to start the session
    const { data: sessionId, error } = await supabase
      .rpc('start_time_session', {
        p_task_id: task_id,
        p_hourly_rate_usd: hourly_rate_usd || null
      })

    if (error) {
      console.error('Error starting time session:', error)
      return res.status(500).json({ error: 'Failed to start time session' })
    }

    // Add session notes if provided
    if (session_notes && sessionId) {
      await supabase
        .from('time_sessions')
        .update({ session_notes: session_notes.trim() })
        .eq('id', sessionId)
        .eq('user_id', user_id)
    }

    // Fetch the created session with details
    const { data: newSession } = await supabase
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
        is_active,
        session_notes,
        created_at,
        updated_at,
        tasks:task_id (
          id,
          title,
          status,
          priority
        ),
        categories:category_id (
          id,
          name,
          color,
          icon
        )
      `)
      .eq('id', sessionId)
      .single()

    // Update task status to 'in_progress' if it's not already
    if (task.status !== 'in_progress') {
      await supabase
        .from('tasks')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', task_id)
        .eq('user_id', user_id)
    }

    return res.status(201).json({
      success: true,
      data: newSession,
      message: 'Time session started successfully'
    })

  } catch (error) {
    console.error('Error in startTimeSession:', error)
    return res.status(500).json({ error: 'Failed to start time session' })
  }
} 