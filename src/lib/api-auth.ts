// src/lib/api-auth.ts
// Authentication helper for App Router API routes

import { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export interface AuthResult {
  userId: string;
  error?: never;
}

export interface AuthError {
  userId?: never;
  error: { status: number; message: string };
}

/**
 * Get authenticated user ID from request
 * Returns userId if authenticated, or error object if not
 */
export async function getAuthenticatedUserId(request: NextRequest): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: {
        status: 401,
        message: 'Authentication required',
      },
    };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        error: {
          status: 401,
          message: 'Invalid authentication token',
        },
      };
    }

    return { userId: user.id };
  } catch (error: any) {
    return {
      error: {
        status: 401,
        message: 'Authentication failed',
      },
    };
  }
}
