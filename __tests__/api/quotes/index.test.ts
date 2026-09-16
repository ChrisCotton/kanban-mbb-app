import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
  })),
}))

import handler from '../../../pages/api/quotes/index'

const mockFrom = (createClient as jest.Mock).mock.results[0].value.from as jest.Mock

describe('/api/quotes', () => {
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
      body: {},
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    }

    jest.clearAllMocks()
  })

  describe('GET /api/quotes', () => {
    it('should return 400 if user_id is missing', async () => {
      mockReq.query = {}
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
    })

    it('should fetch all quotes for user', async () => {
      const mockQuotes = [
        {
          id: '1',
          user_id: 'user-123',
          text: 'Test quote',
          author: 'Test Author',
          is_active: true,
          display_order: 0,
        },
      ]

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockQuotes, error: null }),
      }

      mockFrom.mockReturnValue(mockQuery)
      mockReq.query = { user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockQuotes,
        count: 1,
      })
    })

    it('should filter active quotes when active_only=true', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockFrom.mockReturnValue(mockQuery)
      mockReq.query = { user_id: 'user-123', active_only: 'true' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
    })
  })

  describe('POST /api/quotes', () => {
    beforeEach(() => {
      mockReq.method = 'POST'
    })

    it('should return 400 if user_id is missing', async () => {
      mockReq.body = { text: 'A quote' }
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required field: user_id' })
    })

    it('should return 400 if text is missing', async () => {
      mockReq.body = { user_id: 'user-123' }
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required field: text' })
    })

    it('should return 400 if text exceeds 500 characters', async () => {
      mockReq.body = {
        user_id: 'user-123',
        text: 'a'.repeat(501),
      }
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'text must be 500 characters or less' })
    })

    it('should create a quote successfully', async () => {
      const newQuote = {
        id: 'new-1',
        user_id: 'user-123',
        text: 'New quote',
        author: 'Author',
        is_active: true,
        display_order: 0,
      }

      const maxOrderQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      }

      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: newQuote, error: null }),
      }

      mockFrom
        .mockReturnValueOnce(maxOrderQuery)
        .mockReturnValueOnce(insertQuery)

      mockReq.body = {
        user_id: 'user-123',
        text: 'New quote',
        author: 'Author',
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: newQuote,
        message: 'Quote created successfully',
      })
    })
  })

  it('should return 405 for unsupported methods', async () => {
    mockReq.method = 'PATCH'
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(405)
  })
})
