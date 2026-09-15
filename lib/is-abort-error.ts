/**
 * True for fetch/timeout aborts. DOMException('AbortError') is not always `instanceof Error`.
 * Also treats Supabase auth lock acquire timeouts as abort-like so callers can retry or
 * fall back instead of treating them as hard auth failures during cold start.
 */
export function isAbortLikeError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; message?: string; isAcquireTimeout?: boolean }
  if (e.name === 'AbortError') return true
  if (e.isAcquireTimeout === true) return true
  const msg = typeof e.message === 'string' ? e.message : ''
  if (/lock.*timed out|acquisition timed out|Acquiring process lock/i.test(msg)) return true
  return false
}
