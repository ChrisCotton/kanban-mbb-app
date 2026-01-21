/**
 * Unit Tests: Time Sessions API - Individual Session endpoints
 *
 * Tests the time sessions API endpoints for:
 * - GET single time session
 * - PUT update/end/pause/resume time session
 * - DELETE time session
 * - Icon column removal fix
 * - Error logging
 */

import { NextApiRequest, NextApiResponse } from 'next'

// Declare mock variables for Supabase client methods
export const mockSupabaseSelect = jest.fn();
export const mockSupabaseUpdate = jest.fn();
export const mockSupabaseDelete = jest.fn();
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
      update: mockSupabaseUpdate,
      delete: mockSupabaseDelete,
    })),
    rpc: mockSupabaseRpc,
  })),
}));

// Mock UUID validation
jest.mock('../../../lib/utils/uuid', () => ({
  validateUUID: jest.fn(),
}));

describe('Time Sessions API - GET /api/time-sessions/[id]', () => {
  let handler: typeof import('../../../pages/api/time-sessions/[id]').default;
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    // Import handler here to ensure mocks are ready
    handler = require('../../../pages/api/time-sessions/[id]').default;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      method: 'GET',
      query: { id: 'session-123' },
      body: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
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

  it('should return 400 if user_id is missing', async () => {
    mockReq.query = { id: 'session-123' }

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
  })

  it('should fetch single time session without icon column', async () => {
    const mockSession = {
      id: 'session-123',
      task_id: 'task-1',
      category_id: 'cat-1',
      started_at: '2024-01-01T10:00:00Z',
      ended_at: '2024-01-01T11:00:00Z',
      duration_seconds: 3600,
      hourly_rate_usd: 100,
      earnings_usd: 100,
      is_active: false,
      tasks: { id: 'task-1', title: 'Test Task', status: 'completed' },
      categories: { id: 'cat-1', name: 'Development', color: '#FF5733', hourly_rate_usd: 100 }, // No icon field
    }

    const mockQueryChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    }

    mockSupabaseSelect.mockReturnValue(mockQueryChain)
    mockReq.query = { id: 'session-123', user_id: 'user-123' }

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockSession,
      })
    )

    // Verify query does not include icon field
    expect(mockSupabaseSelect).toHaveBeenCalledWith(
      expect.stringContaining('categories:category_id')
    )
    expect(mockSupabaseSelect).toHaveBeenCalledWith(
      expect.not.stringContaining('icon')
    )
  })

  it('should calculate current duration and earnings for active sessions', async () => {
    const mockActiveSession = {
      id: 'session-123',
      task_id: 'task-1',
      started_at: '2024-01-01T10:00:00Z',
      ended_at: null,
      hourly_rate_usd: 100,
      is_active: true,
    }

    const mockQueryChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockActiveSession, error: null }),
    }

    mockSupabaseSelect.mockReturnValue(mockQueryChain)
    mockReq.query = { id: 'session-123', user_id: 'user-123' }

    // Mock Date.now to have predictable duration
    const mockNow = new Date('2024-01-01T10:30:00Z')
    jest.spyOn(global, 'Date').mockImplementation(() => mockNow as any)

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          current_duration_seconds: 1800, // 30 minutes
          current_earnings_usd: 50, // 0.5 hours * 100
        }),
      })
    )

    jest.restoreAllMocks()
  })

  it('should log detailed error information', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const error = {
      code: 'PGRST116',
      message: 'Session not found',
      details: 'Error details',
      hint: 'Error hint',
    }

    const mockQueryChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error }),
    }

    mockSupabaseSelect.mockReturnValue(mockQueryChain)
    mockReq.query = { id: 'session-123', user_id: 'user-123' }

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching time session:',
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

describe('Time Sessions API - PUT /api/time-sessions/[id]', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'PUT',
      query: { id: 'session-123' },
      body: { user_id: 'user-123' },
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
    }

    jest.clearAllMocks()
  })

  describe('End Session (action: stop)', () => {
    it('should end a time session successfully', async () => {
      const mockExistingSession = {
        id: 'session-123',
        is_active: true,
        ended_at: null,
        task_id: 'task-1',
      }

      const mockUpdatedSession = {
        id: 'session-123',
        task_id: 'task-1',
        category_id: 'cat-1',
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T11:00:00Z',
        duration_seconds: 3600,
        hourly_rate_usd: 100,
        earnings_usd: 100,
        is_active: false,
        tasks: { id: 'task-1', title: 'Test Task', status: 'completed' },
        categories: { id: 'cat-1', name: 'Development', color: '#FF5733' }, // No icon
      }

      // Mock existing session check
      const mockExistingQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingSession, error: null }),
      }

      // Mock RPC call
      mockSupabaseRpc.mockResolvedValue({ data: 'session-123', error: null })

      // Mock update for notes
      const mockUpdateQuery = {
        eq: jest.fn().mockReturnThis(),
      }

      // Mock fetch updated session
      const mockUpdatedQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedSession, error: null }),
      }

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockExistingQuery),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateQuery),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockUpdatedQuery),
        })

      mockReq.body = {
        user_id: 'user-123',
        action: 'stop',
        session_notes: 'Completed task',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockSupabaseRpc).toHaveBeenCalledWith('end_time_session', {
        p_session_id: 'session-123',
      })
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Time session ended successfully',
        })
      )
    })

    it('should return 400 if session is already ended', async () => {
      const mockExistingSession = {
        id: 'session-123',
        is_active: false,
        ended_at: '2024-01-01T11:00:00Z',
        task_id: 'task-1',
      }

      const mockExistingQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingSession, error: null }),
      }

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue(mockExistingQuery),
      })

      mockReq.body = {
        user_id: 'user-123',
        action: 'stop',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Session is already ended',
        })
      )
    })
  })

  describe('Pause Session', () => {
    it('should pause a time session successfully', async () => {
      const mockExistingSession = {
        id: 'session-123',
        is_active: true,
        ended_at: null,
        task_id: 'task-1',
        session_notes: null,
      }

      const mockPausedSession = {
        ...mockExistingSession,
        ended_at: expect.any(String),
        is_active: false,
        session_notes: '[PAUSED]',
      }

      const mockExistingQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingSession, error: null }),
      }

      const mockUpdateQuery = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPausedSession, error: null }),
      }

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockExistingQuery),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateQuery),
        })

      mockReq.body = {
        user_id: 'user-123',
        action: 'pause',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Time session paused successfully',
        })
      )
    })
  })

  describe('Resume Session', () => {
    it('should resume a time session by creating new session', async () => {
      const mockExistingSession = {
        id: 'session-123',
        is_active: false,
        ended_at: '2024-01-01T11:00:00Z',
        task_id: 'task-1',
      }

      const mockTask = {
        id: 'task-1',
        category_id: 'cat-1',
      }

      const mockPrevSession = {
        hourly_rate_usd: 100,
      }

      const mockNewSessionId = 'session-456'
      const mockNewSession = {
        id: mockNewSessionId,
        task_id: 'task-1',
        started_at: '2024-01-01T12:00:00Z',
        is_active: true,
        tasks: { id: 'task-1', title: 'Test Task', status: 'in_progress' },
        categories: { id: 'cat-1', name: 'Development', color: '#FF5733' }, // No icon
      }

      const mockExistingQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingSession, error: null }),
      }

      const mockTaskQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTask, error: null }),
      }

      const mockPrevSessionQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPrevSession, error: null }),
      }

      mockSupabaseRpc.mockResolvedValue({ data: mockNewSessionId, error: null })

      const mockNewSessionQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockNewSession, error: null }),
      }

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockExistingQuery),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockTaskQuery),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockPrevSessionQuery),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockNewSessionQuery),
        })

      mockReq.body = {
        user_id: 'user-123',
        action: 'resume',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockSupabaseRpc).toHaveBeenCalledWith('start_time_session', {
        p_task_id: 'task-1',
        p_hourly_rate_usd: 100,
      })
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Time session resumed successfully',
          new_session_id: mockNewSessionId,
        })
      )
    })
  })

  describe('Update Session Details', () => {
    it('should update session notes', async () => {
      const mockExistingSession = {
        id: 'session-123',
        is_active: false,
        ended_at: '2024-01-01T11:00:00Z',
        task_id: 'task-1',
      }

      const mockUpdatedSession = {
        ...mockExistingSession,
        session_notes: 'Updated notes',
      }

      const mockExistingQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingSession, error: null }),
      }

      const mockUpdateQuery = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedSession, error: null }),
      }

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(mockExistingQuery),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateQuery),
        })

      mockReq.body = {
        user_id: 'user-123',
        session_notes: 'Updated notes',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Time session updated successfully',
        })
      )
    })

    it('should validate hourly_rate_usd is positive', async () => {
      const mockExistingSession = {
        id: 'session-123',
        is_active: false,
        ended_at: '2024-01-01T11:00:00Z',
        task_id: 'task-1',
      }

      const mockExistingQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingSession, error: null }),
      }

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue(mockExistingQuery),
      })

      mockReq.body = {
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

  describe('Error Logging', () => {
    it('should log detailed error when ending session fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const mockExistingSession = {
        id: 'session-123',
        is_active: true,
        ended_at: null,
        task_id: 'task-1',
      }

      const error = {
        code: 'PGRST116',
        message: 'RPC function failed',
        details: 'Error details',
        hint: 'Error hint',
      }

      const mockExistingQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingSession, error: null }),
      }

      mockSupabaseRpc.mockResolvedValue({ data: null, error })

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue(mockExistingQuery),
      })

      mockReq.body = {
        user_id: 'user-123',
        action: 'stop',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error ending time session:',
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
})

describe('Time Sessions API - DELETE /api/time-sessions/[id]', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'DELETE',
      query: { id: 'session-123' },
      body: { user_id: 'user-123' },
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
    }

    jest.clearAllMocks()
  })

  it('should delete a time session successfully', async () => {
    const mockSession = {
      id: 'session-123',
      is_active: false,
      task_id: 'task-1',
    }

    const mockQueryChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
    }

    const mockDeleteQuery = {
      eq: jest.fn().mockResolvedValue({ error: null }),
    }

    mockSupabaseFrom
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue(mockQueryChain),
      })
      .mockReturnValueOnce({
        delete: jest.fn().mockReturnValue(mockDeleteQuery),
      })

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Time session deleted successfully',
      })
    )
  })

  it('should return 400 if trying to delete active session', async () => {
    const mockActiveSession = {
      id: 'session-123',
      is_active: true,
      task_id: 'task-1',
    }

    const mockQueryChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockActiveSession, error: null }),
    }

    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue(mockQueryChain),
    })

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Cannot delete active time session. End the session first.',
      })
    )
  })

  it('should return 400 if user_id is missing', async () => {
    mockReq.body = {}

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
  })
})

describe('Time Sessions API - Method Handling', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock
  let setHeaderMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    setHeaderMock = jest.fn()

    mockReq = {
      method: 'PATCH',
      query: { id: 'session-123' },
      body: {},
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    }

    jest.clearAllMocks()
  })

  it('should reject unsupported methods', async () => {
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET', 'PUT', 'DELETE'])
    expect(statusMock).toHaveBeenCalledWith(405)
  })
})
