/**
 * True for fetch/timeout aborts. DOMException('AbortError') is not always `instanceof Error`.
 */
export function isAbortLikeError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  return (err as { name?: string }).name === 'AbortError'
}
