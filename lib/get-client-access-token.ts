import { supabase } from './supabase'
import { isAbortLikeError } from './is-abort-error'

/** Shared in-flight getSession so Calendar / Goals / Categories do not stampede the auth lock. */
let inFlight: Promise<string | null> | null = null

/**
 * Returns the current access token from the local session, or null.
 * Safe against lock timeouts and undefined `data` shapes from supabase-js.
 */
export async function getClientAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error && !isAbortLikeError(error)) {
        console.warn('[auth] getSession error:', error.message)
      }
      return data?.session?.access_token ?? null
    } catch (e) {
      if (!isAbortLikeError(e)) {
        console.warn('[auth] getSession failed:', e)
      }
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
