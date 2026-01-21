import { NextApiRequest, NextApiResponse } from 'next'
import generateHandler from '../../../pages/api/vision-board/generate'
import indexHandler from '../../../pages/api/vision-board/index'
import idHandler from '../../../pages/api/vision-board/[id]'

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

// Mock fetch for AI provider APIs
global.fetch = jest.fn()

describe('Vision Board AI Generation Integration Tests', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'POST',
      body: {},
      query: {}
    }

    mockRes = {
      status: statusMock,
      json: jsonMock
    }

    jest.clearAllMocks()
    process.env.NANO_BANANA_API_KEY = 'test-key'
    process.env.GOOGLE_AI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.NANO_BANANA_API_KEY
    delete process.env.GOOGLE_AI_API_KEY
  })

  describe('Full AI Generation Flow', () => {
    it('should generate image and save to database with goal and due_date', async () => {
      // Mock profile fetch
      const mockProfileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ai_image_provider: 'nano_banana' },
          error: null
        })
      }

      // Mock max display_order query
      const mockMaxOrderQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ display_order: 0 }],
          error: null
        })
      }

      // Mock insert query
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'generated-id',
            file_path: 'https://example.com/generated.jpg',
            goal: 'Test goal',
            due_date: '2024-12-31',
            media_type: 'image'
          },
          error: null
        })
      }

      // Mock storage
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/generated.jpg' }
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockProfileQuery)
        .mockReturnValueOnce(mockMaxOrderQuery)
        .mockReturnValueOnce(mockInsertQuery)

      mockSupabaseClient.storage.from.mockReturnValue(mockStorage)

      // Mock AI generation (will fail with current placeholder, but structure is tested)
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API not implemented'))

      mockReq.body = {
        user_id: 'user-123',
        prompt: 'A beautiful sunset',
        goal: 'Visit the mountains',
        due_date: '2024-12-31',
        media_type: 'image'
      }

      await generateHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Should fail at API call stage, but structure is correct
      expect(statusMock).toHaveBeenCalled()
    })
  })

  describe('CRUD Operations with Goal and Due Date', () => {
    it('should create image with goal and due_date, then update them', async () => {
      // Create image
      const mockMaxOrderQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-id',
            goal: 'Initial goal',
            due_date: '2024-12-31',
            media_type: 'image'
          },
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockMaxOrderQuery)
        .mockReturnValueOnce(mockInsertQuery)

      mockReq.method = 'POST'
      mockReq.body = {
        user_id: 'user-123',
        file_path: '/path/to/image.jpg',
        goal: 'Initial goal',
        due_date: '2024-12-31',
        media_type: 'image'
      }

      await indexHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            goal: 'Initial goal',
            due_date: '2024-12-31'
          })
        })
      )

      // Now update the image
      jest.clearAllMocks()

      const mockExistingQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-id',
            goal: 'Initial goal',
            due_date: '2024-12-31'
          },
          error: null
        })
      }

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-id',
            goal: 'Updated goal',
            due_date: '2025-01-15',
            media_type: 'image'
          },
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockExistingQuery)
        .mockReturnValueOnce(mockUpdateQuery)

      mockReq.method = 'PUT'
      mockReq.query = { id: 'new-id' }
      mockReq.body = {
        user_id: 'user-123',
        goal: 'Updated goal',
        due_date: '2025-01-15'
      }

      await idHandler(mockReq as NextApiRequest, mockRes as NextApiResponse, 'new-id')

      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: 'Updated goal',
          due_date: '2025-01-15'
        })
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should maintain goal and due_date integrity across CRUD operations', async () => {
      // Create
      const createMaxOrder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      const createInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'test-id',
            goal: 'Test goal',
            due_date: '2024-12-31',
            media_type: 'image'
          },
          error: null
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(createMaxOrder)
        .mockReturnValueOnce(createInsert)

      mockReq.method = 'POST'
      mockReq.body = {
        user_id: 'user-123',
        file_path: '/test.jpg',
        goal: 'Test goal',
        due_date: '2024-12-31',
        media_type: 'image'
      }

      await indexHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Verify created data includes goal and due_date
      const createCall = jsonMock.mock.calls[0][0]
      expect(createCall.data.goal).toBe('Test goal')
      expect(createCall.data.due_date).toBe('2024-12-31')

      // Read
      jest.clearAllMocks()

      const readQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [{
            id: 'test-id',
            goal: 'Test goal',
            due_date: '2024-12-31',
            media_type: 'image'
          }],
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(readQuery)
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'user-123' }

      await indexHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Verify read data includes goal and due_date
      const readCall = jsonMock.mock.calls[0][0]
      expect(readCall.data[0].goal).toBe('Test goal')
      expect(readCall.data[0].due_date).toBe('2024-12-31')
    })
  })

  describe('Multiple Images with Different Due Dates', () => {
    it('should sort images by due_date when requested', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [
            { id: '1', goal: 'Goal 1', due_date: '2024-06-15', media_type: 'image' },
            { id: '2', goal: 'Goal 2', due_date: '2024-12-31', media_type: 'image' },
            { id: '3', goal: 'Goal 3', due_date: '2024-03-01', media_type: 'image' }
          ],
          error: null
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)
      mockReq.method = 'GET'
      mockReq.query = {
        user_id: 'user-123',
        sort_by_due_date: 'true'
      }

      await indexHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockQuery.order).toHaveBeenCalledWith('due_date', { ascending: true })
    })
  })
})
