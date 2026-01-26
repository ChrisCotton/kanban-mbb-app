import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoalsService } from '../../../src/services/goals.service';
import { UpdateGoalInput } from '../../../src/types/goals';

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
      case 'GET':
        return await getGoal(req, res);
      case 'PATCH':
        return await updateGoal(req, res);
      case 'DELETE':
        return await deleteGoal(req, res);
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Goal API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

async function getGoal(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { id } = req.query;
  const { user_id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const service = new GoalsService(getSupabase());
  const goal = await service.getGoalById(id, user_id);

  return res.status(200).json({
    success: true,
    data: goal,
  });
}

async function updateGoal(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { id } = req.query;
  const { user_id, ...updateData } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  // Validate progress value if provided
  if (updateData.progress_value !== undefined) {
    const progress = Number(updateData.progress_value);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Progress value must be between 0 and 100' });
    }
    updateData.progress_value = progress;
  }

  // Validate title length if provided
  if (updateData.title !== undefined && updateData.title.length > 255) {
    return res.status(400).json({ error: 'Title must be 255 characters or less' });
  }

  const service = new GoalsService(getSupabase());
  const input: UpdateGoalInput = {
    title: updateData.title,
    description: updateData.description,
    status: updateData.status,
    progress_type: updateData.progress_type,
    progress_value: updateData.progress_value,
    target_date: updateData.target_date,
    category_id: updateData.category_id,
    color: updateData.color,
    icon: updateData.icon,
    display_order: updateData.display_order,
  };

  const goal = await service.updateGoal(id, input, user_id);

  return res.status(200).json({
    success: true,
    data: goal,
    message: 'Goal updated successfully',
  });
}

async function deleteGoal(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { id } = req.query;
  const { user_id } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const service = new GoalsService(getSupabase());
  const goal = await service.deleteGoal(id, user_id);

  return res.status(200).json({
    success: true,
    data: goal,
    message: 'Goal archived successfully',
  });
}
