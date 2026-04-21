import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { isAbortLikeError } from './is-abort-error'

const GET_USER_ATTEMPTS = 4
const RETRY_DELAY_MS = 120

/**
 * Resolves the signed-in user on the browser. Supabase's getUser() can throw or return
 * AbortError during cold start / concurrent lock acquisition; we retry and fall back to
 * getSession() so pages do not end up with user=null and a blank screen.
 */
export async function getClientAuthUserForPageLoad(): Promise<User | null> {
  for (let attempt = 0; attempt < GET_USER_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (1 << (attempt - 1))))
    }
    try {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) return data.user
      if (error) {
        if (isAbortLikeError(error)) continue
        break
      }
    } catch (e) {
      if (isAbortLikeError(e)) continue
      break
    }
  }

  try {
    const { data, error } = await supabase.auth.getSession()
    if (error && !isAbortLikeError(error)) return null
    return data.session?.user ?? null
  } catch {
    return null
  }
}
