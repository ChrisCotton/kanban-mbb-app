import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { validateUUID } from '../../../lib/utils/uuid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Time session ID is required' })
  }

  // Validate UUID format
  try {
    validateUUID(id, 'Time session ID')
  } catch (error) {
    return res.status(400).json({ 
      error: error.message 
    })
  }

  try {
    switch (method) {
      case 'GET':
        return await getTimeSession(req, res, id)
      case 'PUT':
        return await updateTimeSession(req, res, id)
      case 'DELETE':
        return await deleteTimeSession(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Time session API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getTimeSession(req: NextApiRequest, res: NextApiResponse, sessionId: string) {
  const { user_id } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    const { data: session, error } = await supabase
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
          priority,
          description
        ),
        categories:category_id (
          id,
          name,
          color,
          hourly_rate_usd
        )
      `)
      .eq('id', sessionId)
      .eq('user_id', user_id)
      .single()

    if (error) {
      console.error('Error fetching time session:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      return res.status(500).json({ 
        error: 'Failed to fetch time session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    if (!session) {
      return res.status(404).json({ error: 'Time session not found' })
    }

    // Add computed fields for active sessions
    if (session.is_active && !session.ended_at) {
      const now = new Date()
      const startTime = new Date(session.started_at)
      const currentDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      const currentEarnings = session.hourly_rate_usd 
        ? (currentDuration / 3600) * session.hourly_rate_usd
        : 0

      ;(session as any).current_duration_seconds = currentDuration
      ;(session as any).current_earnings_usd = Math.round(currentEarnings * 100) / 100
    }

    return res.status(200).json({
      success: true,
      data: session
    })

  } catch (error) {
    console.error('Error fetching time session:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to fetch time session',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
}

async function updateTimeSession(req: NextApiRequest, res: NextApiResponse, sessionId: string) {
  const { 
    action, 
    user_id, 
    session_notes,
    hourly_rate_usd,
    ended_at 
  } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Verify session exists and user owns it
    const { data: existingSession } = await supabase
      .from('time_sessions')
      .select('id, is_active, ended_at, task_id')
      .eq('id', sessionId)
      .eq('user_id', user_id)
      .single()

    if (!existingSession) {
      return res.status(404).json({ error: 'Time session not found or access denied' })
    }

    // Handle different actions
    if (action === 'end' || action === 'stop') {
      return await endTimeSession(res, sessionId, user_id, existingSession, session_notes)
    } else if (action === 'pause') {
      return await pauseTimeSession(res, sessionId, user_id, existingSession)
    } else if (action === 'resume') {
      return await resumeTimeSession(res, sessionId, user_id, existingSession)
    } else {
      // General update (notes, hourly rate, etc.)
      return await updateSessionDetails(res, sessionId, user_id, {
        session_notes,
        hourly_rate_usd,
        ended_at
      })
    }

  } catch (error) {
    console.error('Error in updateTimeSession:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to update time session',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
}

async function endTimeSession(
  res: NextApiResponse, 
  sessionId: string, 
  userId: string, 
  existingSession: any,
  sessionNotes?: string
) {
  if (!existingSession.is_active || existingSession.ended_at) {
    return res.status(400).json({ error: 'Session is already ended' })
  }

  try {
    // Use the database function to end the session
    const { error } = await supabase
      .rpc('end_time_session', {
        p_session_id: sessionId
      })

    if (error) {
      console.error('Error ending time session:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      return res.status(500).json({ 
        error: 'Failed to end time session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    // Update session notes if provided
    if (sessionNotes) {
      await supabase
        .from('time_sessions')
        .update({ session_notes: sessionNotes.trim() })
        .eq('id', sessionId)
        .eq('user_id', userId)
    }

    // Fetch the updated session
    const { data: updatedSession } = await supabase
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
        updated_at,
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
      .eq('id', sessionId)
      .single()

    return res.status(200).json({
      success: true,
      data: updatedSession,
      message: 'Time session ended successfully'
    })

  } catch (error) {
    console.error('Error ending session:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to end time session',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
}

async function pauseTimeSession(
  res: NextApiResponse, 
  sessionId: string, 
  userId: string, 
  existingSession: any
) {
  if (!existingSession.is_active || existingSession.ended_at) {
    return res.status(400).json({ error: 'Cannot pause - session is not active' })
  }

  try {
    // For pause, we temporarily end the session but mark it as paused
    const { data: updatedSession, error } = await supabase
      .from('time_sessions')
      .update({ 
        ended_at: new Date().toISOString(),
        is_active: false,
        session_notes: existingSession.session_notes 
          ? `${existingSession.session_notes}\n[PAUSED]`
          : '[PAUSED]'
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('Error pausing time session:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      return res.status(500).json({ 
        error: 'Failed to pause time session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    return res.status(200).json({
      success: true,
      data: updatedSession,
      message: 'Time session paused successfully'
    })

  } catch (error) {
    console.error('Error pausing session:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to pause time session',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
}

async function resumeTimeSession(
  res: NextApiResponse, 
  sessionId: string, 
  userId: string, 
  existingSession: any
) {
  // To resume, we need to start a new session for the same task
  try {
    // Get the task details
    const { data: task } = await supabase
      .from('tasks')
      .select('id, category_id')
      .eq('id', existingSession.task_id)
      .single()

    if (!task) {
      return res.status(404).json({ error: 'Associated task not found' })
    }

    // Get hourly rate from the previous session or category
    const { data: prevSession } = await supabase
      .from('time_sessions')
      .select('hourly_rate_usd')
      .eq('id', sessionId)
      .single()

    // Start a new session using the database function
    const { data: newSessionId, error } = await supabase
      .rpc('start_time_session', {
        p_task_id: existingSession.task_id,
        p_hourly_rate_usd: prevSession?.hourly_rate_usd || null
      })

    if (error) {
      console.error('Error resuming time session:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      return res.status(500).json({ 
        error: 'Failed to resume time session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    // Get the new session details
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
      .eq('id', newSessionId)
      .single()

    return res.status(200).json({
      success: true,
      data: newSession,
      message: 'Time session resumed successfully',
      new_session_id: newSessionId
    })

  } catch (error) {
    console.error('Error resuming session:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to resume time session',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
}

async function updateSessionDetails(
  res: NextApiResponse, 
  sessionId: string, 
  userId: string, 
  updates: any
) {
  try {
    const updateData: any = {}

    if (updates.session_notes !== undefined) {
      updateData.session_notes = updates.session_notes?.trim() || null
    }

    if (updates.hourly_rate_usd !== undefined) {
      if (typeof updates.hourly_rate_usd === 'number' && updates.hourly_rate_usd >= 0) {
        updateData.hourly_rate_usd = parseFloat(updates.hourly_rate_usd.toFixed(2))
      } else {
        return res.status(400).json({ error: 'hourly_rate_usd must be a positive number' })
      }
    }

    if (updates.ended_at !== undefined) {
      updateData.ended_at = updates.ended_at
      updateData.is_active = false
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' })
    }

    const { data: updatedSession, error } = await supabase
      .from('time_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
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
        updated_at
      `)
      .single()

    if (error) {
      console.error('Error updating time session:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      return res.status(500).json({ 
        error: 'Failed to update time session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    return res.status(200).json({
      success: true,
      data: updatedSession,
      message: 'Time session updated successfully'
    })

  } catch (error) {
    console.error('Error updating session details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to update time session',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
}

async function deleteTimeSession(req: NextApiRequest, res: NextApiResponse, sessionId: string) {
  const { user_id } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    // Verify session exists and user owns it
    const { data: session } = await supabase
      .from('time_sessions')
      .select('id, is_active, task_id')
      .eq('id', sessionId)
      .eq('user_id', user_id)
      .single()

    if (!session) {
      return res.status(404).json({ error: 'Time session not found or access denied' })
    }

    // Don't allow deletion of active sessions
    if (session.is_active) {
      return res.status(400).json({ 
        error: 'Cannot delete active time session. End the session first.' 
      })
    }

    // Delete the session
    const { error } = await supabase
      .from('time_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user_id)

    if (error) {
      console.error('Error deleting time session:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      })
      return res.status(500).json({ 
        error: 'Failed to delete time session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Time session deleted successfully'
    })

  } catch (error) {
    console.error('Error in deleteTimeSession:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: error
    })
    return res.status(500).json({ 
      error: 'Failed to delete time session',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    })
  }
} 