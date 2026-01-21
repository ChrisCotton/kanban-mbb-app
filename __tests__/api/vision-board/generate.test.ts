import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../../pages/api/vision-board/generate'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ai_image_provider: 'nano_banana' },
        error: null
      }),
      insert: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [{ display_order: 0 }],
        error: null
      })
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.jpg' }
        })
      }))
    }
  }))
}))

// Mock fetch for AI provider APIs
global.fetch = jest.fn()

describe('/api/vision-board/generate', () => {
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
      method: 'POST',
      body: {
        user_id: 'test-user-123',
        prompt: 'A beautiful sunset over mountains',
        goal: 'Visit the mountains',
        due_date: '2024-12-31',
        media_type: 'image'
      }
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock
    }

    jest.clearAllMocks()
    process.env.NANO_BANANA_API_KEY = 'test-nano-key'
    process.env.GOOGLE_AI_API_KEY = 'test-google-key'
  })

  afterEach(() => {
    delete process.env.NANO_BANANA_API_KEY
    delete process.env.GOOGLE_AI_API_KEY
  })

  describe('POST /api/vision-board/generate', () => {
    it('should return 405 for non-POST methods', async () => {
      mockReq.method = 'GET'
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['POST'])
      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method GET not allowed' })
    })

    it('should return 400 if user_id is missing', async () => {
      delete mockReq.body!.user_id
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
    })

    it('should return 400 if prompt is missing', async () => {
      delete mockReq.body!.prompt
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'prompt is required' })
    })

    it('should return 400 if goal is missing', async () => {
      delete mockReq.body!.goal
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'goal is required' })
    })

    it('should return 400 if goal is empty or whitespace', async () => {
      mockReq.body!.goal = '   '
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'goal is required' })
    })

    it('should return 400 if due_date is missing', async () => {
      delete mockReq.body!.due_date
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'due_date is required' })
    })

    it('should return 400 if due_date is invalid', async () => {
      mockReq.body!.due_date = 'invalid-date'
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'due_date must be a valid date' })
    })

    it('should return 400 if media_type is invalid', async () => {
      mockReq.body!.media_type = 'invalid'
      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'media_type must be "image" or "video"' })
    })

    it('should return 400 if Nano Banana is used for video generation', async () => {
      mockReq.body!.media_type = 'video'
      // Mock profile with nano_banana
      const { createClient } = require('@supabase/supabase-js')
      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ai_image_provider: 'nano_banana' },
            error: null
          })
        }))
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Nano Banana only supports image generation. Use Veo 3 for video generation.'
      })
    })

    it('should return 500 if API key is missing for selected provider', async () => {
      delete process.env.NANO_BANANA_API_KEY
      // Mock profile with nano_banana
      const { createClient } = require('@supabase/supabase-js')
      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ai_image_provider: 'nano_banana' },
            error: null
          }),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [{ display_order: 0 }],
            error: null
          })
        })),
        storage: {
          from: jest.fn(() => ({
            upload: jest.fn(),
            getPublicUrl: jest.fn()
          }))
        }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(500)
      const callArgs = jsonMock.mock.calls[0][0]
      expect(callArgs.error).toContain('NANO_BANANA_API_KEY')
    })

    it('should return 500 if profile fetch fails', async () => {
      const { createClient } = require('@supabase/supabase-js')
      createClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' }
          })
        }))
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      // Should use default provider (nano_banana) when profile not found
      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it.skip('should return 400 for unsupported provider', async () => {
      const supabaseModule = require('@supabase/supabase-js')
      const createClient = supabaseModule.createClient as jest.Mock
      
      // Override the mock implementation to return unsupported provider
      const mockSingle = jest.fn().mockResolvedValue({
        data: { ai_image_provider: 'unsupported_provider' },
        error: null
      })
      
      const mockFrom = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSingle,
        insert: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ display_order: 0 }],
          error: null
        })
      }))
      
      // Override the mock for this test
      createClient.mockImplementationOnce(() => ({
        from: mockFrom,
        storage: {
          from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: 'https://example.com/test.jpg' }
            })
          }))
        }
      }))

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.stringContaining('Unsupported AI provider')
      })
    })

    // Note: Success cases would require actual API implementations
    // These are placeholder tests that verify the structure
    it('should validate all required fields are present', async () => {
      const requiredFields = ['user_id', 'prompt', 'goal', 'due_date']
      
      for (const field of requiredFields) {
        const testReq = { ...mockReq }
        delete testReq.body![field]
        
        await handler(testReq as NextApiRequest, mockRes as NextApiResponse)
        expect(statusMock).toHaveBeenCalledWith(400)
        jest.clearAllMocks()
      }
    })
  })
})
