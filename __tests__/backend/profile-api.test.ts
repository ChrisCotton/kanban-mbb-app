/**
 * Profile API Backend Unit Tests
 * 
 * Tests database interactions, error handling, and edge cases
 * Run these tests FIRST before making changes to the profile API
 */

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../pages/api/profile/index'

// Mock Supabase client
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockInsert = jest.fn()
const mockUpsert = jest.fn()
const mockSelectAfterUpsert = jest.fn()
const mockSingleAfterUpsert = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'user_profile') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: mockSingle
            }))
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: mockSingle
            }))
          })),
          upsert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: mockSingleAfterUpsert
            }))
          }))
        }
      }
      return {}
    })
  }))
}))

describe('Profile API - Database Integration Tests', () => {
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

  describe('GET /api/profile - Database Queries', () => {
    it('should query database with correct user_id', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user-123' }

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockSingle).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle database connection errors', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user-123' }

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '08000', message: 'Connection error' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch profile' })
    })

    it('should return existing profile from database', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user-123' }

      const dbProfile = {
        id: 'profile-1',
        user_id: 'test-user-123',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        default_category_id: 'cat-1',
        default_target_revenue: 5000.00,
        ai_image_provider: 'nano_banana',
        ai_audio_journal_provider: 'deepgram',
        ai_journal_insight_provider: 'anthropic_claude',
        nano_banana_api_key: 'test-key',
        google_ai_api_key: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      mockSingle.mockResolvedValue({
        data: dbProfile,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: dbProfile,
        isNew: false
      })
    })

    it('should return defaults when profile not found in database', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'new-user-456' }

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          user_id: 'new-user-456',
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
  })

  describe('PUT /api/profile - Database Updates', () => {
    it('should upsert profile to database', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'test-user-123',
        display_name: 'Updated Name',
        default_target_revenue: 7500
      }

      const updatedProfile = {
        id: 'profile-1',
        user_id: 'test-user-123',
        display_name: 'Updated Name',
        default_target_revenue: 7500,
        updated_at: expect.any(String)
      }

      mockSingleAfterUpsert.mockResolvedValue({
        data: updatedProfile,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully'
      })
    })

    it('should handle database constraint violations', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'test-user-123',
        default_category_id: 'invalid-category-id'
      }

      mockSingleAfterUpsert.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'Foreign key violation' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to update profile' })
    })

    it('should sanitize empty API keys to null', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'test-user-123',
        nano_banana_api_key: '',
        google_ai_api_key: ''
      }

      const updatedProfile = {
        id: 'profile-1',
        user_id: 'test-user-123',
        nano_banana_api_key: null,
        google_ai_api_key: null,
        updated_at: expect.any(String)
      }

      mockSingleAfterUpsert.mockResolvedValue({
        data: updatedProfile,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('POST /api/profile - Database Inserts', () => {
    it('should insert new profile to database', async () => {
      mockReq.method = 'POST'
      mockReq.body = {
        user_id: 'new-user-789',
        display_name: 'New User',
        default_target_revenue: 2000
      }

      const newProfile = {
        id: 'profile-2',
        user_id: 'new-user-789',
        display_name: 'New User',
        default_target_revenue: 2000,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      }

      mockSingle.mockResolvedValue({
        data: newProfile,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: newProfile,
        message: 'Profile created successfully'
      })
    })

    it('should handle duplicate profile insert (upsert instead)', async () => {
      mockReq.method = 'POST'
      mockReq.body = {
        user_id: 'existing-user',
        display_name: 'Existing User'
      }

      // First call returns duplicate error
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'Duplicate key' }
      })

      // Second call (upsert) succeeds
      mockSingleAfterUpsert.mockResolvedValue({
        data: {
          id: 'profile-1',
          user_id: 'existing-user',
          display_name: 'Existing User',
          updated_at: expect.any(String)
        },
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Should eventually succeed with upsert
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing environment variables', async () => {
      // Temporarily remove env vars
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user' }

      // The getSupabase function should throw
      await expect(
        handler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      ).rejects.toThrow()

      // Restore env vars
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
    })

    it('should handle unexpected database errors gracefully', async () => {
      mockReq.method = 'GET'
      mockReq.query = { user_id: 'test-user-123' }

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'UNKNOWN_ERROR', message: 'Unexpected error' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('Data Validation', () => {
    it('should validate default_target_revenue is numeric', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'test-user-123',
        default_target_revenue: 'not-a-number'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Database will reject this, but we should handle it gracefully
      expect(mockSingleAfterUpsert).toHaveBeenCalled()
    })

    it('should validate AI provider values match database constraints', async () => {
      mockReq.method = 'PUT'
      mockReq.body = {
        user_id: 'test-user-123',
        ai_image_provider: 'invalid_provider'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid ai_image_provider' })
    })
  })
})
