import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoalsService } from '../../../../../../src/services/goals.service';

// Lazy-load supabase client
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
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

// Helper to get auth token from request
function getAuthToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
}

// Helper to verify authentication
async function verifyAuth(req: NextApiRequest): Promise<{ userId: string } | { error: { status: number; message: string } }> {
  const token = getAuthToken(req);
  if (!token) {
    return { error: { status: 401, message: 'Authentication required' } };
  }

  try {
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { error: { status: 401, message: 'Invalid authentication token' } };
    }

    return { userId: user.id };
  } catch (error: any) {
    return { error: { status: 401, message: 'Authentication failed' } };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'PATCH':
        return await toggleMilestone(req, res);
      default:
        res.setHeader('Allow', ['PATCH']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Milestone toggle API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

async function toggleMilestone(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { id, milestoneId } = req.query;
  const { user_id, is_complete } = req.body;

  // Validate inputs
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  if (!milestoneId || typeof milestoneId !== 'string') {
    return res.status(400).json({ error: 'Milestone ID is required' });
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (is_complete === undefined || is_complete === null) {
    return res.status(400).json({ error: 'is_complete is required' });
  }

  if (typeof is_complete !== 'boolean') {
    return res.status(400).json({ error: 'is_complete must be a boolean' });
  }

  const service = new GoalsService(getSupabase());

  try {
    // Verify goal exists and belongs to user
    const goal = await service.getGoalById(id, user_id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Toggle milestone
    const milestone = await service.toggleMilestone(id, milestoneId, is_complete, user_id);

    return res.status(200).json({
      success: true,
      data: milestone,
    });
  } catch (error: any) {
    if (error.message === 'Goal not found' || error.message === 'Milestone not found') {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
}
