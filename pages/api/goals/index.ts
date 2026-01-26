import { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoalsService } from '../../../src/services/goals.service';
import { CreateGoalInput, GoalFilters, GoalSortOptions } from '../../../src/types/goals';

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
        return await getGoals(req, res);
      case 'POST':
        return await createGoal(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Goals API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

async function getGoals(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { user_id, status, category_id, has_target_date, overdue, sort_field, sort_direction } = req.query;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  // Build filters
  const filters: GoalFilters = {};
  if (status) {
    const statusArray = (status as string).split(',');
    filters.status = statusArray.length > 1 ? statusArray as any[] : status as any;
  }
  if (category_id && typeof category_id === 'string') {
    filters.category_id = category_id;
  }
  if (has_target_date !== undefined) {
    filters.has_target_date = has_target_date === 'true';
  }
  if (overdue === 'true') {
    filters.overdue = true;
  }

  // Build sort options
  let sort: GoalSortOptions | undefined;
  if (sort_field && typeof sort_field === 'string') {
    sort = {
      field: sort_field as any,
      direction: ((sort_direction as 'asc' | 'desc') || 'asc'),
    };
  }

  const service = new GoalsService(getSupabase());
  const result = await service.getGoals(filters, sort, user_id);

  return res.status(200).json({
    success: true,
    data: result.goals,
    count: result.count,
  });
}

async function createGoal(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const authResult = await verifyAuth(req);
  if ('error' in authResult) {
    return res.status(authResult.error.status).json({ error: authResult.error.message });
  }

  const { user_id, ...goalData } = req.body;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  if (!goalData.title || typeof goalData.title !== 'string') {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Validate title length
  if (goalData.title.length > 255) {
    return res.status(400).json({ error: 'Title must be 255 characters or less' });
  }

  // Validate progress value if provided
  if (goalData.progress_value !== undefined) {
    const progress = Number(goalData.progress_value);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Progress value must be between 0 and 100' });
    }
  }

  const service = new GoalsService(getSupabase());
  const input: CreateGoalInput = {
    title: goalData.title,
    description: goalData.description,
    status: goalData.status,
    progress_type: goalData.progress_type,
    progress_value: goalData.progress_value !== undefined ? Number(goalData.progress_value) : undefined,
    target_date: goalData.target_date,
    category_id: goalData.category_id,
    color: goalData.color,
    icon: goalData.icon,
    vision_image_ids: goalData.vision_image_ids,
  };

  const goal = await service.createGoal(input, user_id);

  return res.status(201).json({
    success: true,
    data: goal,
    message: 'Goal created successfully',
  });
}
