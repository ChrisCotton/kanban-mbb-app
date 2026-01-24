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
          color
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
    
    // Get total count first (before applying range) with same filters
    let countQuery = supabase
      .from('time_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
    
    if (task_id) {
      countQuery = countQuery.eq('task_id', task_id)
    }
    if (category_id) {
      countQuery = countQuery.eq('category_id', category_id)
    }
    if (active_only === 'true') {
      countQuery = countQuery.eq('is_active', true)
    }
    if (start_date) {
      countQuery = countQuery.gte('started_at', start_date)
    }
    if (end_date) {
      countQuery = countQuery.lte('started_at', end_date)
    }
    
    const { count: totalCount, error: countError } = await countQuery
    
    if (countError) {
      console.error('Error fetching time sessions count:', countError)
    }
    
    query = query.range(offsetNum, offsetNum + limitNum - 1)

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching time sessions:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      
      // If the error is related to category join, try fetching without category data
      if (error.code === '42703' || error.message?.includes('icon') || error.message?.includes('column')) {
        console.warn('Retrying query without category join due to schema mismatch')
        let fallbackQuery = supabase
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
            )
          `)
          .eq('user_id', user_id)
          .order('started_at', { ascending: false })
        
        // Apply same filters
        if (task_id) {
          fallbackQuery = fallbackQuery.eq('task_id', task_id)
        }
        if (category_id) {
          fallbackQuery = fallbackQuery.eq('category_id', category_id)
        }
        if (active_only === 'true') {
          fallbackQuery = fallbackQuery.eq('is_active', true)
        }
        if (start_date) {
          fallbackQuery = fallbackQuery.gte('started_at', start_date)
        }
        if (end_date) {
          fallbackQuery = fallbackQuery.lte('started_at', end_date)
        }
        
        fallbackQuery = fallbackQuery.range(offsetNum, offsetNum + limitNum - 1)
        
        const { data: fallbackSessions, error: fallbackError } = await fallbackQuery
        
        if (fallbackError) {
          return res.status(500).json({ 
            error: 'Failed to fetch time sessions',
            details: process.env.NODE_ENV === 'development' ? fallbackError.message : undefined
          })
        }
        
        // Get total count for fallback query too with same filters
        let fallbackCountQuery = supabase
          .from('time_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
        
        if (task_id) {
          fallbackCountQuery = fallbackCountQuery.eq('task_id', task_id)
        }
        if (category_id) {
          fallbackCountQuery = fallbackCountQuery.eq('category_id', category_id)
        }
        if (active_only === 'true') {
          fallbackCountQuery = fallbackCountQuery.eq('is_active', true)
        }
        if (start_date) {
          fallbackCountQuery = fallbackCountQuery.gte('started_at', start_date)
        }
        if (end_date) {
          fallbackCountQuery = fallbackCountQuery.lte('started_at', end_date)
        }
        
        const { count: fallbackTotalCount } = await fallbackCountQuery
        
        // Return sessions without category data
        return res.status(200).json({
          success: true,
          data: fallbackSessions || [],
          count: fallbackSessions?.length || 0,
          total_count: fallbackTotalCount || 0,
          summary: {
            total_sessions: 0,
            total_time_seconds: 0,
            total_earnings_usd: 0,
            avg_session_duration: 0,
            avg_hourly_rate: 0
          },
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            total_count: fallbackTotalCount || 0,
            has_more: (offsetNum + limitNum) < (fallbackTotalCount || 0)
          },
          warning: 'Category data unavailable due to schema mismatch'
        })
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch time sessions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
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

    // Use totalCount if available, otherwise fall back to sessions length (for current page)
    // If we got data but count failed, estimate total from current page
    const finalTotalCount = totalCount !== null && totalCount !== undefined 
      ? totalCount 
      : (sessions?.length || 0)
    
    return res.status(200).json({
      success: true,
      data: sessions,
      count: sessions?.length || 0,
      total_count: finalTotalCount,
      summary,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total_count: finalTotalCount,
        has_more: (offsetNum + limitNum) < finalTotalCount
      }
    })

  } catch (error) {
    console.error('Error in getTimeSessions:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to fetch time sessions',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
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
    // Pass user_id explicitly since we're using service role key (auth.uid() returns NULL)
    const { data: sessionId, error } = await supabase
      .rpc('start_time_session', {
        p_task_id: task_id,
        p_user_id: user_id,
        p_hourly_rate_usd: hourly_rate_usd || null
      })

    if (error) {
      console.error('Error starting time session:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      return res.status(500).json({ 
        error: 'Failed to start time session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
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
          color
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
    console.error('Error in startTimeSession:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to start time session',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
} 