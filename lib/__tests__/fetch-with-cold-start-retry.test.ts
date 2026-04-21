import { fetchWithColdStartRetry } from '../fetch-with-cold-start-retry'

/** Plain fetch result: jest.setup replaces `global.Response` with a stub that always has ok: true. */
function mockFetchResult(ok: boolean, status: number): Response {
  return { ok, status, json: async () => ({}), text: async () => '' } as unknown as Response
}

describe('fetchWithColdStartRetry', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns successful response on first attempt', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockFetchResult(true, 200)) as unknown as typeof fetch

    const res = await fetchWithColdStartRetry('/api/test', {}, { timeoutMs: 5000, attempts: 2 })
    expect(res.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it(
    'retries on 503 then succeeds',
    async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockFetchResult(false, 503))
        .mockResolvedValueOnce(mockFetchResult(true, 200)) as unknown as typeof fetch

      const res = await fetchWithColdStartRetry('/api/test', {}, { timeoutMs: 10000, attempts: 3 })
      expect(res.ok).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    },
    15_000
  )
})
