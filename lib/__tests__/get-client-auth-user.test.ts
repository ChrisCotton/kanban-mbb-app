const mockGetSession = jest.fn()
const mockGetUser = jest.fn()

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}))

import { getClientAuthUserForPageLoad } from '../get-client-auth-user'

describe('getClientAuthUserForPageLoad', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockGetUser.mockReset()
  })

  it('returns user from local session without calling getUser', async () => {
    const user = { id: 'u1', email: 'a@b.com' }
    mockGetSession.mockResolvedValue({ data: { session: { user } }, error: null })

    await expect(getClientAuthUserForPageLoad()).resolves.toEqual(user)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('deduplicates concurrent callers', async () => {
    const user = { id: 'u1' }
    let resolveSession: (v: unknown) => void = () => {}
    mockGetSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve
        })
    )

    const p1 = getClientAuthUserForPageLoad()
    const p2 = getClientAuthUserForPageLoad()
    resolveSession({ data: { session: { user } }, error: null })

    await expect(Promise.all([p1, p2])).resolves.toEqual([user, user])
    expect(mockGetSession).toHaveBeenCalledTimes(1)
  })

  it('does not throw when data is undefined', async () => {
    mockGetSession.mockResolvedValue({ data: undefined, error: null })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(getClientAuthUserForPageLoad()).resolves.toBeNull()
  })

  it('retries after lock timeout then succeeds via getSession', async () => {
    mockGetSession
      .mockRejectedValueOnce({ isAcquireTimeout: true, message: 'lock timed out' })
      .mockResolvedValueOnce({
        data: { session: { user: { id: 'u2' } } },
        error: null,
      })

    await expect(getClientAuthUserForPageLoad()).resolves.toEqual({ id: 'u2' })
  })
})
