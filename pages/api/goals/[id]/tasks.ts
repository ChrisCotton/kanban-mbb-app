import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoalsService } from '../../../../src/services/goals.service';

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
        return await getGoalTasks(req, res);
      case 'POST':
        return await addGoalTask(req, res);
      case 'DELETE':
        return await removeGoalTask(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Goal tasks API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

async function getGoalTasks(req: NextApiRequest, res: NextApiResponse) {
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
  const tasks = await service.getGoalTasks(id, user_id);

  return res.status(200).json({
    success: true,
    data: tasks,
  });
}

async function addGoalTask(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { id } = req.query;
  const { user_id, task_id, contribution_weight } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!task_id || typeof task_id !== 'string') {
    return res.status(400).json({ error: 'task_id is required' });
  }

  // Validate contribution weight
  const weight = contribution_weight !== undefined ? Number(contribution_weight) : 1;
  if (isNaN(weight) || weight < 1 || weight > 10) {
    return res.status(400).json({ error: 'contribution_weight must be between 1 and 10' });
  }

  const service = new GoalsService(getSupabase());
  const goalTask = await service.addGoalTask(id, task_id, weight, user_id);

  return res.status(201).json({
    success: true,
    data: goalTask,
    message: 'Task added to goal successfully',
  });
}

async function removeGoalTask(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { id } = req.query;
  const { user_id, task_id } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Goal ID is required' });
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!task_id || typeof task_id !== 'string') {
    return res.status(400).json({ error: 'task_id is required' });
  }

  const service = new GoalsService(getSupabase());
  await service.removeGoalTask(id, task_id, user_id);

  return res.status(200).json({
    success: true,
    message: 'Task removed from goal successfully',
  });
}
