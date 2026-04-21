import { isAbortLikeError } from './is-abort-error'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Fetch with a generous per-attempt timeout and retries for slow Vercel cold starts
 * (502/503/504, client timeouts, transient network failures).
 */
export async function fetchWithColdStartRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { attempts?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const attempts = options.attempts ?? 3
  const timeoutMs = options.timeoutMs ?? 45_000
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (response.ok) return response

      const retryableStatus = response.status >= 502 && response.status <= 504
      if (retryableStatus && attempt < attempts - 1) {
        await delay(500 * (attempt + 1))
        continue
      }
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
      const retryable =
        isAbortLikeError(err) || err instanceof TypeError
      if (retryable && attempt < attempts - 1) {
        await delay(1000 * (attempt + 1))
        continue
      }
      throw err
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
