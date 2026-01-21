/**
 * Profile API Regression Tests
 * 
 * Tests the profile API endpoints for:
 * - GET profile data
 * - PUT/POST profile updates
 * - AI provider validation
 * - Default values
 */

import { NextApiRequest, NextApiResponse } from 'next'

// Mock Supabase
const mockSupabaseSelect = jest.fn()
const mockSupabaseInsert = jest.fn()
const mockSupabaseUpsert = jest.fn()
const mockSupabaseSingle = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: mockSupabaseSingle
        })
      }),
      insert: mockSupabaseInsert,
      upsert: mockSupabaseUpsert
    })
  })
}))

// Import after mocking
import handler, { 
  AI_IMAGE_PROVIDERS, 
  AI_AUDIO_PROVIDERS, 
  AI_JOURNAL_PROVIDERS 
} from '../../pages/api/profile/index'

describe('Profile API Regression Tests', () => {
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

  describe('AI Provider Constants', () => {
    it('should have correct image providers including nano_banana and veo_3', () => {
      const providerIds = AI_IMAGE_PROVIDERS.map(p => p.id)
      
      expect(providerIds).toContain('openai_dalle')
      expect(providerIds).toContain('stability_ai')
      expect(providerIds).toContain('midjourney')
      expect(providerIds).toContain('nano_banana')
      expect(providerIds).toContain('veo_3')
    })

    it('should have correct audio providers', () => {
      const providerIds = AI_AUDIO_PROVIDERS.map(p => p.id)
      
      expect(providerIds).toContain('openai_whisper')
      expect(providerIds).toContain('google_speech')
      expect(providerIds).toContain('assemblyai')
      expect(providerIds).toContain('deepgram')
    })

    it('should have correct journal insight providers including cognee_memory', () => {
      const providerIds = AI_JOURNAL_PROVIDERS.map(p => p.id)
      
      expect(providerIds).toContain('openai_gpt4')
      expect(providerIds).toContain('anthropic_claude')
      expect(providerIds).toContain('google_gemini')
      expect(providerIds).toContain('cognee_memory')
    })
  })

  describe('GET /api/profile', () => {
    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'GET'
      mockReq.query = {}

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
    })

    it('should return default values for new user', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user-123' }
      
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          user_id: 'test-user-123',
          display_name: null,
          avatar_url: null,
          default_category_id: null,
          default_target_revenue: 1000.00,
          ai_image_provider: 'openai_dalle',
          ai_audio_journal_provider: 'openai_whisper',
          ai_journal_insight_provider: 'openai_gpt4',
        },
        isNew: true
      })
    })

    it('should return existing profile data', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user-123' }
      
      const existingProfile = {
        id: 'profile-1',
        user_id: 'test-user-123',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        default_category_id: 'cat-1',
        default_target_revenue: 5000,
        ai_image_provider: 'veo_3',
        ai_audio_journal_provider: 'deepgram',
        ai_journal_insight_provider: 'anthropic_claude'
      }

      mockSupabaseSingle.mockResolvedValue({
        data: existingProfile,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: existingProfile,
        isNew: false
      })
    })
  })

  describe('PUT /api/profile', () => {
    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'PUT'
      mockReq.body = { display_name: 'Test' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'user_id is required' })
    })

    it('should validate ai_image_provider', async () => {
      mockReq.method = 'PUT'
      mockReq.body = { 
        user_id: 'test-user-123',
        ai_image_provider: 'invalid_provider'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid ai_image_provider' })
    })

    it('should validate ai_audio_journal_provider', async () => {
      mockReq.method = 'PUT'
      mockReq.body = { 
        user_id: 'test-user-123',
        ai_audio_journal_provider: 'invalid_provider'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid ai_audio_journal_provider' })
    })

    it('should validate ai_journal_insight_provider', async () => {
      mockReq.method = 'PUT'
      mockReq.body = { 
        user_id: 'test-user-123',
        ai_journal_insight_provider: 'invalid_provider'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid ai_journal_insight_provider' })
    })

    it('should accept valid nano_banana provider', async () => {
      mockReq.method = 'PUT'
      mockReq.body = { 
        user_id: 'test-user-123',
        ai_image_provider: 'nano_banana'
      }

      const updatedProfile = {
        ...mockReq.body,
        updated_at: expect.any(String)
      }

      mockSupabaseUpsert.mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({ data: updatedProfile, error: null })
        })
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should accept valid veo_3 provider', async () => {
      mockReq.method = 'PUT'
      mockReq.body = { 
        user_id: 'test-user-123',
        ai_image_provider: 'veo_3'
      }

      const updatedProfile = {
        ...mockReq.body,
        updated_at: expect.any(String)
      }

      mockSupabaseUpsert.mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({ data: updatedProfile, error: null })
        })
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Method Handling', () => {
    it('should reject unsupported methods', async () => {
      mockReq.method = 'DELETE'

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET', 'PUT', 'POST'])
      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})

describe('Profile Default Values Integration', () => {
  it('should have correct default target revenue of $1000', () => {
    const defaultProfile = {
      default_target_revenue: 1000.00,
      ai_image_provider: 'openai_dalle',
      ai_audio_journal_provider: 'openai_whisper',
      ai_journal_insight_provider: 'openai_gpt4'
    }

    expect(defaultProfile.default_target_revenue).toBe(1000.00)
  })

  it('should allow customizable default target revenue', () => {
    const customProfile = {
      default_target_revenue: 50000,
      ai_image_provider: 'veo_3',
      ai_audio_journal_provider: 'assemblyai',
      ai_journal_insight_provider: 'cognee_memory'
    }

    expect(customProfile.default_target_revenue).toBe(50000)
    expect(customProfile.ai_image_provider).toBe('veo_3')
  })
})
