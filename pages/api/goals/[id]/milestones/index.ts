import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoalsService } from '../../../../../src/services/goals.service';

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
      case 'POST':
        return await createMilestone(req, res);
      default:
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Milestones API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

async function createMilestone(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { id } = req.query;
  const { user_id, title, display_order } = req.body;

  // Validate inputs
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Validate title length
  if (title.length > 255) {
    return res.status(400).json({ error: 'Title must be 255 characters or less' });
  }

  const service = new GoalsService(getSupabase());

  try {
    // Verify goal exists and belongs to user
    const goal = await service.getGoalById(id, user_id);
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Create milestone
    const milestone = await service.createMilestone(
      id,
      title.trim(),
      display_order !== undefined ? Number(display_order) : undefined,
      user_id
    );

    return res.status(201).json({
      success: true,
      data: milestone,
    });
  } catch (error: any) {
    if (error.message === 'Goal not found') {
      return res.status(404).json({ error: 'Goal not found' });
    }
    throw error;
  }
}
