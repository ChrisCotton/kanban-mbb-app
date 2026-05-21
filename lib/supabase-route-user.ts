import type { IncomingHttpHeaders } from 'http'

import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getApiSupabaseClient } from './supabase-api'

export function readBearerAuthorization(headers: IncomingHttpHeaders): string | undefined {
  const raw = headers.authorization
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0]
  return undefined
}

/**
 * Returns an anon Supabase client with the browser access token forwarded on each request
 * so Postgres sees auth.uid() for RLS.
 */
export function createSupabaseUserClientFromBearer(authHeader: string | undefined): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Authentication required'), { code: 'AUTH_REQUIRED' })
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Responds 401 when missing/invalid; otherwise returns a JWT-scoped client. */
export function tryKanbanUserDb(
  req: NextApiRequest,
  res: NextApiResponse
): SupabaseClient | null {
  const authHeader = readBearerAuthorization(req.headers)
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required', success: false })
    return null
  }
  try {
    return createSupabaseUserClientFromBearer(authHeader)
  } catch {
    res.status(401).json({ error: 'Authentication required', success: false })
    return null
  }
}

export async function verifyBearerMatchesBodyUserId(
  authHeader: string | undefined,
  bodyUserId: string
): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice('Bearer '.length).trim()
  const { data, error } = await getApiSupabaseClient().auth.getUser(token)
  if (error || !data.user) return false
  return data.user.id === bodyUserId
}
