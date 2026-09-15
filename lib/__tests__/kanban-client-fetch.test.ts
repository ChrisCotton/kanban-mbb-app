const mockGetSession = jest.fn()

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

import { getClientAccessToken } from '../get-client-access-token'
import { kanbanAuthorizedFetch } from '../kanban-client-fetch'

describe('getClientAccessToken', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
  })

  it('returns access token from session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-1' } },
      error: null,
    })
    await expect(getClientAccessToken()).resolves.toBe('tok-1')
  })

  it('returns null when data is undefined (no crash)', async () => {
    mockGetSession.mockResolvedValue({ data: undefined, error: null })
    await expect(getClientAccessToken()).resolves.toBeNull()
  })

  it('returns null on lock timeout', async () => {
    mockGetSession.mockRejectedValue({
      isAcquireTimeout: true,
      message: 'Acquiring process lock timed out',
    })
    await expect(getClientAccessToken()).resolves.toBeNull()
  })
})

describe('kanbanAuthorizedFetch', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    mockGetSession.mockReset()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('throws Not authenticated when session data is undefined', async () => {
    mockGetSession.mockResolvedValue({ data: undefined, error: null })
    await expect(kanbanAuthorizedFetch('/api/kanban/tasks')).rejects.toThrow('Not authenticated')
  })

  it('attaches Authorization header when token exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'abc' } },
      error: null,
    })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    }) as unknown as typeof fetch

    const res = await kanbanAuthorizedFetch('/api/kanban/tasks')
    expect(res.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/kanban/tasks',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer abc' }),
      })
    )
  })
})
