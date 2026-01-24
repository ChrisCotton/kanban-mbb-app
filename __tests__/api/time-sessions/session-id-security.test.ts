/**
 * Security Tests: Session ID Exposure
 * 
 * Verifies that session IDs are not unnecessarily exposed:
 * - Session IDs should only be in API responses where needed (for operations)
 * - Session IDs should not be logged in console.error unnecessarily
 * - Session IDs should not appear in error messages exposed to clients
 */

import { NextApiRequest, NextApiResponse } from 'next'

// Import mocks
import {
  mockSupabaseRpc,
  mockSupabaseFrom,
  mockSelectEq,
  mockSelectSingle,
  mockSelectMaybeSingle,
  mockUpdateEq,
} from '../time-sessions/index.test'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: mockSelectEq,
        single: mockSelectSingle,
        maybeSingle: mockSelectMaybeSingle,
      })),
      update: jest.fn(() => ({
        eq: mockUpdateEq.mockReturnThis(),
      })),
    })),
    rpc: mockSupabaseRpc,
  })),
}))

describe('Session ID Security Tests', () => {
  let handler: typeof import('../../../pages/api/time-sessions/index').default
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    handler = require('../../../pages/api/time-sessions/index').default

    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'POST',
      body: {},
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
    }

    jest.clearAllMocks()
    mockSelectEq.mockReturnThis()
    mockSelectSingle.mockResolvedValue({ data: null, error: null })
    mockSelectMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockUpdateEq.mockReturnThis()
    mockUpdateEq.mockResolvedValue({ data: null, error: null })

    // Spy on console.error to check for session ID leaks
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('Session ID in API Responses', () => {
    it('should include session ID in successful response (needed for operations)', async () => {
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

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      const response = jsonMock.mock.calls[0][0]
      
      // Session ID should be in response (needed for stop/update operations)
      expect(response.data.id).toBe(mockSessionId)
      // This is acceptable - IDs are needed for API operations
    })
  })

  describe('Session ID in Error Messages', () => {
    it('should not expose session IDs in error messages to clients', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'todo',
      }

      const sensitiveSessionId = 'sensitive-session-uuid-12345'
      const rpcError = {
        code: 'P0001',
        message: 'Database error occurred',
        details: `Session ${sensitiveSessionId} not found`,
        hint: null,
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: rpcError })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      const response = jsonMock.mock.calls[0][0]
      
      // Error message should not contain session ID
      expect(response.error).not.toContain(sensitiveSessionId)
      
      // Details might be undefined (production) or contain sanitized error message
      if (response.details && typeof response.details === 'string') {
        expect(response.details).not.toContain(sensitiveSessionId)
      }
      
      // But it can be logged server-side (for debugging)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('Console Logging', () => {
    it('should log errors server-side but not expose sensitive data in client responses', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        category_id: 'cat-1',
        status: 'todo',
      }

      const sensitiveSessionId = 'sensitive-uuid-12345'
      const rpcError = {
        code: 'P0001',
        message: 'Internal error',
        details: `Session ${sensitiveSessionId} failed`,
        hint: null,
      }

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: rpcError })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Server-side logging can include full details (for debugging)
      const consoleCall = consoleErrorSpy.mock.calls.find(call => 
        call[0]?.includes('Error starting time session')
      )
      
      // Client response should not include sensitive details
      const response = jsonMock.mock.calls[0][0]
      
      // Error message should not contain session ID
      expect(response.error).not.toContain(sensitiveSessionId)
      
      // Details might be undefined (production) or contain sanitized error message
      if (response.details && typeof response.details === 'string') {
        expect(response.details).not.toContain(sensitiveSessionId)
      }
      
      // In production, details should be minimal or undefined
      if (process.env.NODE_ENV === 'production') {
        expect(response.details).toBeUndefined()
      }
    })
  })

  describe('Network Request Visibility', () => {
    it('should use session IDs in API requests only when necessary', async () => {
      // Session IDs in API request URLs/paths are acceptable for REST APIs
      // This test documents that behavior
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

      mockSelectSingle.mockResolvedValueOnce({ data: mockTask, error: null })
      mockSelectMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabaseRpc.mockResolvedValueOnce({ data: mockSessionId, error: null })
      mockSelectSingle.mockResolvedValueOnce({ data: mockNewSession, error: null })

      mockReq.body = {
        task_id: 'task-1',
        user_id: 'user-123',
        hourly_rate_usd: 100,
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Session ID is used internally for RPC call (acceptable)
      expect(mockSupabaseRpc).toHaveBeenCalled()
      
      // Session ID is returned in response (needed for client operations)
      const response = jsonMock.mock.calls[0][0]
      expect(response.data.id).toBeDefined()
      
      // Note: Session IDs in network requests are normal for REST APIs
      // They're needed to identify resources for updates/deletes
      // This is acceptable behavior, not a security issue
    })
  })
})
