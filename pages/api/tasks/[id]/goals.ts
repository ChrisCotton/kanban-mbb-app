import { NextApiRequest, NextApiResponse } from 'next';
import { GoalsService } from '../../../../src/services/goals.service';
import { createClient } from '@supabase/supabase-js';

// Lazy-load supabase client
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { id: taskId } = req.query;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const supabaseClient = getSupabase();
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const service = new GoalsService(supabaseClient);
    const taskGoals = await service.getTaskGoals(taskId, user.id);

    return res.status(200).json({
      success: true,
      data: taskGoals,
    });
  } catch (error: any) {
    console.error('Error fetching task goals:', error);
    return res.status(500).json({
      error: 'Failed to fetch task goals',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
