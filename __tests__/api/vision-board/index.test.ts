import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../../pages/api/vision-board/index'

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(),
  storage: {
    from: jest.fn()
  }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

describe('/api/vision-board', () => {
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
      method: 'GET',
      query: {},
      body: {}
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock
    }

    jest.clearAllMocks()
  })

  describe('GET /api/vision-board', () => {
    it('should return 400 if user_id is missing', async () => {
      mockReq.query = {}
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
    })

    it('should fetch vision board images with goal and due_date', async () => {
      const mockImages = [
        {
          id: '1',
          user_id: 'user-123',
          file_path: '/path/to/image.jpg',
          goal: 'Test goal',
          due_date: '2024-12-31',
          media_type: 'image',
          is_active: true,
          display_order: 0
        }
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockImages,
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)
      mockReq.query = { user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vision_board_images')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockImages,
        count: 1
      })
    })

    it('should filter by due_date range when provided', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)
      mockReq.query = {
        user_id: 'user-123',
        due_date_from: '2024-01-01',
        due_date_to: '2024-12-31'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockQuery.gte).toHaveBeenCalledWith('due_date', '2024-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('due_date', '2024-12-31')
    })

    it('should sort by due_date when sort_by_due_date is true', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)
      mockReq.query = {
        user_id: 'user-123',
        sort_by_due_date: 'true'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockQuery.order).toHaveBeenCalledWith('due_date', { ascending: true })
    })
  })

  describe('POST /api/vision-board', () => {
    beforeEach(() => {
      mockReq.method = 'POST'
    })

    it('should return 400 if user_id is missing', async () => {
      mockReq.body = {
        file_path: '/path/to/image.jpg',
        goal: 'Test goal',
        due_date: '2024-12-31'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required field: user_id' })
    })

    it('should return 400 if file_path is missing', async () => {
      mockReq.body = {
        user_id: 'user-123',
        goal: 'Test goal',
        due_date: '2024-12-31'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required field: file_path' })
    })

    it('should return 400 if goal is missing', async () => {
      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        due_date: '2024-12-31'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required field: goal (cannot be empty or whitespace only)'
      })
    })

    it('should return 400 if goal is empty or whitespace', async () => {
      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: '   ',
        due_date: '2024-12-31'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'goal cannot be empty or whitespace only'
      })
    })

    it('should return 400 if goal exceeds 500 characters', async () => {
      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: 'a'.repeat(501),
        due_date: '2024-12-31'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'goal must be 500 characters or less'
      })
    })

    it('should return 400 if due_date is missing', async () => {
      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: 'Test goal'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required field: due_date'
      })
    })

    it('should return 400 if due_date is invalid', async () => {
      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: 'Test goal',
        due_date: 'invalid-date'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'due_date must be a valid date'
      })
    })

    it('should return 400 if media_type is invalid', async () => {
      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: 'Test goal',
        due_date: '2024-12-31',
        media_type: 'invalid'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'media_type must be "image" or "video"'
      })
    })

    it('should create vision board image with goal and due_date', async () => {
      const mockNewImage = {
        id: 'new-id',
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: 'Test goal',
        due_date: '2024-12-31',
        media_type: 'image',
        is_active: true,
        display_order: 1
      }

      const mockMaxOrderQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ display_order: 0 }],
          error: null
        })
      }

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockNewImage,
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockMaxOrderQuery) // For max display_order query
        .mockReturnValueOnce(mockInsertQuery) // For insert query

      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: 'Test goal',
        due_date: '2024-12-31',
        media_type: 'image'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: 'Test goal',
          due_date: '2024-12-31',
          media_type: 'image',
          ai_provider: null,
          generation_prompt: null
        })
      )
      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockNewImage,
        message: 'Vision board image created successfully'
      })
    })

    it('should format due_date as ISO date string (YYYY-MM-DD)', async () => {
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'new-id' },
          error: null
        })
      }

      const mockMaxOrderQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockMaxOrderQuery)
        .mockReturnValueOnce(mockInsertQuery)

      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: 'Test goal',
        due_date: '2024-12-31T10:30:00Z' // ISO datetime string
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          due_date: '2024-12-31' // Should be formatted as YYYY-MM-DD
        })
      )
    })
  })
})
