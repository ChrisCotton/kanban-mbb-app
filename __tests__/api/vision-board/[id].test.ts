import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../../pages/api/vision-board/[id]'

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

describe('/api/vision-board/[id]', () => {
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
      method: 'PUT',
      query: { id: 'image-123' },
      body: {
        user_id: 'user-123'
      }
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock
    }

    jest.clearAllMocks()
  })

  describe('PUT /api/vision-board/[id]', () => {
    it('should return 400 if user_id is missing', async () => {
      delete mockReq.body!.user_id
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
    })

    it('should return 400 if image ID is missing', async () => {
      mockReq.query = {}
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Vision board image ID is required'
      })
    })

    it('should return 404 if image not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Vision board image not found or access denied'
      })
    })

    it('should return 400 if trying to set goal to null', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123', goal: 'Existing goal', due_date: '2024-12-31' },
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockExistingQuery)
      mockReq.body = {
        user_id: 'user-123',
        goal: null
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'goal cannot be set to null'
      })
    })

    it('should return 400 if trying to set due_date to null', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123', goal: 'Existing goal', due_date: '2024-12-31' },
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockExistingQuery)
      mockReq.body = {
        user_id: 'user-123',
        due_date: null
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'due_date cannot be set to null'
      })
    })

    it('should return 400 if goal is empty or whitespace', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123' },
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockExistingQuery)
      mockReq.body = {
        user_id: 'user-123',
        goal: '   '
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'goal cannot be empty or whitespace only'
      })
    })

    it('should return 400 if goal exceeds 500 characters', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123' },
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockExistingQuery)
      mockReq.body = {
        user_id: 'user-123',
        goal: 'a'.repeat(501)
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'goal must be 500 characters or less'
      })
    })

    it('should return 400 if due_date is invalid', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123' },
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockExistingQuery)
      mockReq.body = {
        user_id: 'user-123',
        due_date: 'invalid-date'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'due_date must be a valid date'
      })
    })

    it('should update goal and due_date successfully', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123', goal: 'Old goal', due_date: '2024-01-01' },
          error: null
        })
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'image-123',
            goal: 'New goal',
            due_date: '2024-12-31',
            media_type: 'image'
          },
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockExistingQuery)
        .mockReturnValueOnce(mockUpdateQuery)

      mockReq.body = {
        user_id: 'user-123',
        goal: 'New goal',
        due_date: '2024-12-31'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: 'New goal',
          due_date: '2024-12-31'
        })
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          goal: 'New goal',
          due_date: '2024-12-31'
        }),
        message: 'Vision board image updated successfully'
      })
    })

    it('should format due_date as ISO date string (YYYY-MM-DD)', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123' },
          error: null
        })
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123' },
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockExistingQuery)
        .mockReturnValueOnce(mockUpdateQuery)

      mockReq.body = {
        user_id: 'user-123',
        due_date: '2024-12-31T10:30:00Z' // ISO datetime string
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          due_date: '2024-12-31' // Should be formatted as YYYY-MM-DD
        })
      )
    })

    it('should allow partial updates (only goal)', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123', goal: 'Old goal', due_date: '2024-01-01' },
          error: null
        })
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123', goal: 'New goal', due_date: '2024-01-01' },
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockExistingQuery)
        .mockReturnValueOnce(mockUpdateQuery)

      mockReq.body = {
        user_id: 'user-123',
        goal: 'New goal'
        // due_date not provided - should keep existing
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: 'New goal'
        })
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should allow partial updates (only due_date)', async () => {
      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123', goal: 'Existing goal', due_date: '2024-01-01' },
          error: null
        })
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'image-123', goal: 'Existing goal', due_date: '2024-12-31' },
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockExistingQuery)
        .mockReturnValueOnce(mockUpdateQuery)

      mockReq.body = {
        user_id: 'user-123',
        due_date: '2024-12-31'
        // goal not provided - should keep existing
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          due_date: '2024-12-31'
        })
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })
})
