/**
 * Shared Supabase client for API routes (server-side only)
 * This singleton prevents connection pool exhaustion and ECONNRESET errors
 * by reusing a single client instance across all API routes
 */

import { createClient } from '@supabase/supabase-js'

let apiSupabaseClient = null

/**
 * Get or create the shared Supabase client for API routes
 * Uses service role key for server-side operations
 * 
 * This singleton pattern prevents ECONNRESET errors that occur when:
 * - Multiple API routes create separate clients during compilation
 * - Hot-reload recreates clients unnecessarily
 * - Connection pool gets exhausted from too many concurrent clients
 */
export function getApiSupabaseClient() {
  if (!apiSupabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables for API client')
    }

    apiSupabaseClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'kanban-mbb-api'
        }
      },
      // Connection pooling and retry configuration
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })

    // Log client creation (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Supabase API Client] Created shared singleton client')
    }
  }

  return apiSupabaseClient
}

/**
 * Reset the client (useful for testing or forced reconnection)
 * Note: This should rarely be needed in production
 */
export function resetApiSupabaseClient() {
  if (apiSupabaseClient) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Supabase API Client] Resetting shared client')
    }
    apiSupabaseClient = null
  }
}
