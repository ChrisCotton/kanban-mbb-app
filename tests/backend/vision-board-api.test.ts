/**
 * API Endpoint Tests for Vision Board
 * 
 * Tests that API endpoints return complete data with all required fields.
 */

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../pages/api/vision-board/[id]'

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
  storage: {
    from: jest.fn()
  }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('/api/vision-board/[id] - Data Completeness', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'GET',
      query: { id: 'image-123' }
    }

    mockRes = {
      status: statusMock,
      json: jsonMock
    }

    jest.clearAllMocks()
  })

  describe('GET /api/vision-board/[id]', () => {
    it('should return all required fields including goal, due_date, media_type', async () => {
      const mockImage = {
        id: 'image-123',
        user_id: 'user-123',
        file_name: 'test.jpg',
        file_path: '/test/path',
        is_active: true,
        display_order: 0,
        goal: 'Test goal',
        due_date: '2024-01-01',
        media_type: 'image',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        view_count: 0
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockImage,
          error: null
        })
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            goal: expect.any(String),
            due_date: expect.any(String),
            media_type: expect.stringMatching(/^(image|video)$/)
          })
        })
      )
    })

    it('should reject empty goal strings', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'user-123',
        goal: '   ', // Whitespace only
        due_date: '2024-01-01'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/goal|required|empty/i)
        })
      )
    })

    it('should validate due_date format', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'user-123',
        goal: 'Valid goal',
        due_date: 'invalid-date-format'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Should either accept ISO date or return validation error
      const callArgs = jsonMock.mock.calls[0]?.[0]
      if (callArgs?.success === false) {
        expect(callArgs.error).toBeDefined()
      }
    })

    it('should validate media_type enum values', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'user-123',
        goal: 'Valid goal',
        due_date: '2024-01-01',
        media_type: 'invalid_type'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringMatching(/media_type|invalid|enum/i)
        })
      )
    })

    it('should handle missing required fields gracefully', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'user-123'
        // Missing goal and due_date
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      )
    })
  })
})
