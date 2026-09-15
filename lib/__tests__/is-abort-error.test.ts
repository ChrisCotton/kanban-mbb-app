import { isAbortLikeError } from '../is-abort-error'

describe('isAbortLikeError', () => {
  it('detects AbortError by name', () => {
    expect(isAbortLikeError({ name: 'AbortError' })).toBe(true)
  })

  it('detects Supabase lock acquire timeout flag', () => {
    expect(isAbortLikeError({ name: 'Error', isAcquireTimeout: true, message: 'timed out' })).toBe(
      true
    )
  })

  it('detects process lock timeout messages', () => {
    expect(
      isAbortLikeError({
        message: 'Acquiring process lock with name "supabase-auth-token-lock" timed out',
      })
    ).toBe(true)
  })

  it('returns false for normal errors', () => {
    expect(isAbortLikeError(new Error('Not authenticated'))).toBe(false)
    expect(isAbortLikeError(null)).toBe(false)
  })
})
