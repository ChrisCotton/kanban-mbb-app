// Declare mock variables for Supabase client methods
export const mockSupabaseSelect = jest.fn();
export const mockSupabaseInsert = jest.fn();
export const mockSupabaseUpdate = jest.fn();
export const mockSupabaseRpc = jest.fn();
export const mockSupabaseFrom = jest.fn();

// Declare mock variables for chainable methods after .select()
export const mockSelectEq = jest.fn();
export const mockSelectOrder = jest.fn();
export const mockSelectRange = jest.fn();
export const mockSelectGte = jest.fn();
export const mockSelectLte = jest.fn();
export const mockSelectNot = jest.fn();
export const mockSelectSingle = jest.fn();
export const mockSelectMaybeSingle = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: mockSelectEq,
        order: mockSelectOrder,
        range: mockSelectRange,
        gte: mockSelectGte,
        lte: mockSelectLte,
        not: mockSelectNot,
        single: mockSelectSingle,
        maybeSingle: mockSelectMaybeSingle,
      })),
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
    })),
    rpc: mockSupabaseRpc,
  })),
}));

describe('Time Sessions API - GET /api/time-sessions', () => {
  let handler: typeof import('../../../pages/api/time-sessions/index').default;
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock
  let setHeaderMock: jest.Mock

  beforeEach(() => {
    // Dynamically import the handler after mocks are set up
    handler = require('../../../pages/api/time-sessions/index').default;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = jest.fn();

    mockReq = {
      method: 'GET',
      query: {},
      body: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    };

    // Clear and reset all mocks to their default chainable behavior
    jest.clearAllMocks();
    
    mockSelectEq.mockReturnThis();
    mockSelectOrder.mockReturnThis();
    mockSelectRange.mockResolvedValue({ data: [], error: null });
    mockSelectGte.mockReturnThis();
    mockSelectLte.mockReturnThis();
    mockSelectNot.mockReturnThis();
    mockSelectSingle.mockResolvedValue({ data: null, error: null });
    mockSelectMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  describe('Validation', () => {
    it('should return 400 if user_id is missing', async () => {
      mockReq.query = {}

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
    })
  })

  describe('Success Cases', () => {
    it('should fetch time sessions successfully without icon column', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          task_id: 'task-1',
          category_id: 'cat-1',
          started_at: '2024-01-01T10:00:00Z',
          ended_at: '2024-01-01T11:00:00Z',
          duration_seconds: 3600,
          hourly_rate_usd: 100,
          earnings_usd: 100,
          is_active: false,
          tasks: { id: 'task-1', title: 'Test Task', status: 'completed', priority: 'high' },
          categories: { id: 'cat-1', name: 'Development', color: '#FF5733' }, // No icon field
        },
      ]

      mockSelectRange.mockResolvedValueOnce({ data: mockSessions, error: null })

      mockReq.query = { user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSessions,
        })
      )

      // Verify query does not include icon field
      const selectCall = (mockSupabaseFrom as jest.Mock).mock.results[0].value.select.mock.calls[0][0]
      if (selectCall) {
        expect(selectCall).not.toContain('icon')
      }
    })

    it('should apply filters correctly', async () => {
      mockReq.query = {
        user_id: 'user-123',
        task_id: 'task-1',
        category_id: 'cat-1',
        active_only: 'false',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        limit: '10',
        offset: '0',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockSelectEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockSelectEq).toHaveBeenCalledWith('task_id', 'task-1')
      expect(mockSelectEq).toHaveBeenCalledWith('category_id', 'cat-1')
      expect(mockSelectGte).toHaveBeenCalledWith('started_at', '2024-01-01')
      expect(mockSelectLte).toHaveBeenCalledWith('started_at', '2024-01-31')
    })

    it('should calculate summary statistics correctly', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          duration_seconds: 3600,
          earnings_usd: 100,
        },
        {
          id: 'session-2',
          duration_seconds: 1800,
          earnings_usd: 50,
        },
      ]

      // First call for main query
      mockSelectRange.mockResolvedValueOnce({ data: mockSessions, error: null });

      // Second call for summary query
      mockSelectRange.mockResolvedValueOnce({
          data: [
            { duration_seconds: 3600, earnings_usd: 100 },
            { duration_seconds: 1800, earnings_usd: 50 },
          ],
          error: null,
        });

      mockReq.query = { user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            total_sessions: 2,
            total_time_seconds: 5400,
            total_earnings_usd: 150,
            avg_session_duration: 2700,
            avg_hourly_rate: expect.any(Number),
          }),
        })
      )
    })
  })

  describe('Error Handling - Icon Column Fix', () => {
    it('should handle missing icon column error with fallback query', async () => {
      const iconError = {
        code: '42703',
        message: 'column categories_1.icon does not exist',
        details: null,
        hint: null,
      }

      // First call fails
      mockSelectRange.mockRejectedValueOnce(iconError);

      // Second call (fallback) succeeds
      mockSelectRange.mockResolvedValueOnce({
          data: [
            {
              id: 'session-1',
              task_id: 'task-1',
              tasks: { id: 'task-1', title: 'Test Task' },
            },
          ],
          error: null,
        });

      mockReq.query = { user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Should retry with fallback query
      expect(mockSupabaseFrom).toHaveBeenCalledTimes(2); // 'from' should be called twice
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          warning: 'Category data unavailable due to schema mismatch',
        })
      )
    })

    it('should log detailed error information', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const error = {
        code: 'PGRST116',
        message: 'Some other error',
        details: 'Error details',
        hint: 'Error hint',
      }

      mockSelectRange.mockResolvedValueOnce({ data: null, error });
      mockReq.query = { user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching time sessions:',
        expect.objectContaining({
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('POST /api/time-sessions - Start Session', () => {
    beforeEach(() => {
      mockReq.method = 'POST'
    })

    it('should return 400 if task_id is missing', async () => {
      mockReq.body = { user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields',
        })
      )
    })

    it('should return 400 if user_id is missing', async () => {
      mockReq.body = { task_id: 'task-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should start a new time session successfully', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'todo',
      }

      const mockSessionId = 'session-123'
      const mockNewSession = {
        id: mockSessionId,
        task_id: 'task-1',
        category_id: 'cat-1',
        started_at: '2024-01-01T10:00:00Z',
        is_active: true,
        tasks: { id: 'task-1', title: 'Test Task', status: 'in_progress' },
        categories: { id: 'cat-1', name: 'Development', color: '#FF5733' },
      }

      // Mock task verification
      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null });

      // Mock active session check
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      // Mock RPC call
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null });

      // Mock session fetch
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null });

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockSupabaseRpc).toHaveBeenCalledWith('start_time_session', {
        p_task_id: 'task-1',
        p_hourly_rate_usd: 100,
      })
      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockNewSession,
          message: 'Time session started successfully',
        })
      )
    })

    it('should return 409 if task already has active session', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'in_progress',
      }

      const mockActiveSession = {
        id: 'active-session-1',
        task_id: 'task-1',
        started_at: '2024-01-01T09:00:00Z',
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null });
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: mockActiveSession, error: null });

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Task already has an active time session',
        })
      )
    })

    it('should validate hourly_rate_usd is positive', async () => {
      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: -10,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'hourly_rate_usd must be a positive number',
        })
      )
    })
  })

  describe('Method Handling', () => {
    it('should reject unsupported methods', async () => {
      mockReq.method = 'DELETE'
      mockReq.query = { user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET', 'POST'])
      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
