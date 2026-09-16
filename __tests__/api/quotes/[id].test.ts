import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
  })),
}))

import handler from '../../../pages/api/quotes/[id]'

const mockFrom = (createClient as jest.Mock).mock.results[0].value.from as jest.Mock

describe('/api/quotes/[id]', () => {
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
      query: { id: 'quote-123' },
      body: {},
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock,
    }

    jest.clearAllMocks()
  })

  it('should return 400 if quote id is missing', async () => {
    mockReq.query = {}
    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({ error: 'Quote ID is required' })
  })

  describe('GET', () => {
    it('should return 400 if user_id is missing', async () => {
      mockReq.query = { id: 'quote-123' }
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
    })

    it('should return quote when found', async () => {
      const mockQuote = {
        id: 'quote-123',
        user_id: 'user-123',
        text: 'Test',
        author: null,
        is_active: true,
        display_order: 0,
      }

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockQuote, error: null }),
      }

      mockFrom.mockReturnValue(mockQuery)
      mockReq.query = { id: 'quote-123', user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockQuote })
    })

    it('should return 404 when quote not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      }

      mockFrom.mockReturnValue(mockQuery)
      mockReq.query = { id: 'quote-123', user_id: 'user-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('DELETE', () => {
    beforeEach(() => {
      mockReq.method = 'DELETE'
      mockReq.query = { id: 'quote-123', user_id: 'user-123' }
    })

    it('should delete quote when user owns it', async () => {
      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'quote-123' }, error: null }),
      }

      const deleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      }
      deleteQuery.eq.mockReturnValueOnce(deleteQuery).mockResolvedValueOnce({ error: null })

      mockFrom
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(deleteQuery)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Quote deleted successfully',
      })
    })

    it('should return 404 when quote not owned by user', async () => {
      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }

      mockFrom.mockReturnValue(selectQuery)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('PATCH', () => {
    beforeEach(() => {
      mockReq.method = 'PATCH'
      mockReq.body = { user_id: 'user-123', action: 'activate' }
    })

    it('should activate quote', async () => {
      const selectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'quote-123', is_active: false, display_order: 0 },
          error: null,
        }),
      }

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'quote-123', is_active: true },
          error: null,
        }),
      }

      mockFrom
        .mockReturnValueOnce(selectQuery)
        .mockReturnValueOnce(updateQuery)

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Quote activated' })
      )
    })
  })
})
