import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../../pages/api/journal/index'

// Mock Supabase
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockRange = jest.fn()
const mockInsert = jest.fn()
const mockSingle = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      order: mockOrder.mockReturnThis(),
      range: mockRange,
      insert: mockInsert.mockReturnThis(),
      single: mockSingle
    }))
  }))
}))

describe('/api/journal', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'GET',
      query: {}
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn()
    }
  })

  describe('GET /api/journal', () => {
    it('should return journal entries for a user', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user-123', limit: '10', offset: '0' }

      const mockEntries = [
        {
          id: 'entry-1',
          user_id: 'test-user-123',
          title: 'Test Entry 1',
          transcription: 'Test transcription',
          created_at: '2026-01-25T00:00:00Z',
          updated_at: '2026-01-25T00:00:00Z'
        }
      ]

      mockRange.mockResolvedValue({
        data: mockEntries,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-123')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockRange).toHaveBeenCalledWith(0, 9)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEntries,
        count: 1
      })
    })

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'GET'
      mockReq.query = {}

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required'
      })
    })

    it('should handle database errors', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user-123' }

      mockRange.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch journal entries'
      })
    })
  })

  describe('POST /api/journal', () => {
    it('should create a new journal entry', async () => {
      mockReq.method = 'POST'
      mockReq.body = {
        user_id: 'test-user-123',
        title: 'New Entry',
        transcription: 'Test transcription',
        transcription_status: 'pending',
        use_audio_for_insights: true,
        use_transcript_for_insights: true,
        tags: ['test']
      }

      const mockEntry = {
        id: 'new-entry-1',
        user_id: 'test-user-123',
        title: 'New Entry',
        transcription: 'Test transcription',
        created_at: '2026-01-25T00:00:00Z',
        updated_at: '2026-01-25T00:00:00Z'
      }

      mockSingle.mockResolvedValue({
        data: mockEntry,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockInsert).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEntry,
        message: 'Journal entry created successfully'
      })
    })

    it('should use default title if not provided', async () => {
      mockReq.method = 'POST'
      mockReq.body = {
        user_id: 'test-user-123'
      }

      const mockEntry = {
        id: 'new-entry-1',
        user_id: 'test-user-123',
        title: expect.stringContaining('Journal Entry'),
        created_at: '2026-01-25T00:00:00Z',
        updated_at: '2026-01-25T00:00:00Z'
      }

      mockSingle.mockResolvedValue({
        data: mockEntry,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockInsert).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(201)
    })

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'POST'
      mockReq.body = {
        title: 'Test Entry'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required'
      })
    })

    it('should handle creation errors', async () => {
      mockReq.method = 'POST'
      mockReq.body = {
        user_id: 'test-user-123',
        title: 'New Entry'
      }

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create journal entry',
        details: 'Database error'
      })
    })
  })

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PUT'

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST'])
      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method PUT not allowed'
      })
    })
  })
})
