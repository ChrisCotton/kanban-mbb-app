import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { isAbortLikeError } from './is-abort-error'

const GET_USER_ATTEMPTS = 2
const RETRY_DELAY_MS = 400
/** Hard ceiling so page spinners cannot hang forever on cold-start auth stalls. */
const OVERALL_TIMEOUT_MS = 15_000

/** Deduplicate concurrent page-load auth reads (Layout + page + hooks). */
let inFlight: Promise<User | null> | null = null

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (e) => {
        clearTimeout(id)
        reject(e)
      }
    )
  })
}

/**
 * Resolves the signed-in user on the browser.
 * Prefers getSession() (local) over getUser() (network) so cold-start refresh_token
 * failures do not hold the auth processLock and stall every page spinner.
 * Concurrent callers share one in-flight promise.
 */
export async function getClientAuthUserForPageLoad(): Promise<User | null> {
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      return await withTimeout(resolveUserWithRetries(), OVERALL_TIMEOUT_MS, 'getClientAuthUserForPageLoad')
    } catch (e) {
      console.error('[auth] getClientAuthUserForPageLoad failed:', e)
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

async function resolveUserWithRetries(): Promise<User | null> {
  // Local session first — avoids network under lock during cold start.
  for (let attempt = 0; attempt < GET_USER_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
    }
    try {
      const { data, error } = await supabase.auth.getSession()
      const user = data?.session?.user ?? null
      if (user) return user
      if (error && !isAbortLikeError(error)) break
    } catch (e) {
      if (!isAbortLikeError(e)) break
    }
  }

  // One network validation only if local session was empty/unavailable.
  try {
    const { data, error } = await supabase.auth.getUser()
    if (data?.user) return data.user
    if (error && !isAbortLikeError(error)) return null
  } catch (e) {
    if (!isAbortLikeError(e)) return null
  }

  return null
}
