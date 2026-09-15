import { getClientAccessToken } from './get-client-access-token'

/** Normalize HeadersInit into a mutable plain map (works in Jest/jsdom without a full Headers implementation). */
function headersToPlainRecord(initHeaders: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!initHeaders) return out

  if (typeof Headers !== 'undefined' && initHeaders instanceof Headers) {
    initHeaders.forEach((value, key) => {
      out[key] = value
    })
    return out
  }

  if (Array.isArray(initHeaders)) {
    for (const [k, v] of initHeaders) {
      if (typeof k === 'string' && typeof v === 'string') {
        out[k] = v
      }
    }
    return out
  }

  for (const [k, v] of Object.entries(initHeaders as Record<string, string>)) {
    if (typeof v === 'string') {
      out[k] = v
    }
  }
  return out
}

/**
 * Sends the user's Supabase access token so Pages API handlers can scope DB calls
 * to auth.uid() (RLS policies on tasks and related reads).
 * Uses cold-start retries so slow Vercel boots do not fail the first paint.
 */
export async function kanbanAuthorizedFetch(input: string, init?: RequestInit): Promise<Response> {
  const token = await getClientAccessToken()
  if (!token) {
    throw new Error('Not authenticated')
  }

  const headers: Record<string, string> = {
    ...headersToPlainRecord(init?.headers),
    Authorization: `Bearer ${token}`,
  }

  const { fetchWithColdStartRetry } = await import('./fetch-with-cold-start-retry')
  return fetchWithColdStartRetry(input, { ...init, headers }, { attempts: 3, timeoutMs: 45_000 })
}
