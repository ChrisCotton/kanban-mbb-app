import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../../pages/api/journal/[id]'

// Mock Supabase
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockSingle = jest.fn()
const mockStorageFrom = jest.fn()
const mockRemove = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'journal_entries') {
        return {
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          update: mockUpdate.mockReturnThis(),
          delete: mockDelete,
          single: mockSingle
        }
      }
      return {}
    }),
    storage: {
      from: mockStorageFrom.mockReturnValue({
        remove: mockRemove
      })
    }
  }))
}))

describe('/api/journal/[id]', () => {
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
      query: { id: 'entry-123' }
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn()
    }
  })

  describe('GET /api/journal/[id]', () => {
    it('should return a single journal entry', async () => {
      mockReq.method = 'GET'
      mockReq.query = { id: 'entry-123' }

      const mockEntry = {
        id: 'entry-123',
        user_id: 'test-user-123',
        title: 'Test Entry',
        transcription: 'Test transcription',
        created_at: '2026-01-25T00:00:00Z',
        updated_at: '2026-01-25T00:00:00Z'
      }

      mockSingle.mockResolvedValue({
        data: mockEntry,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', 'entry-123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEntry
      })
    })

    it('should return 404 if entry not found', async () => {
      mockReq.method = 'GET'
      mockReq.query = { id: 'non-existent' }

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Journal entry not found'
      })
    })

    it('should return 400 if id is missing', async () => {
      mockReq.method = 'GET'
      mockReq.query = {}

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Entry ID is required'
      })
    })
  })

  describe('PUT /api/journal/[id]', () => {
    it('should update a journal entry', async () => {
      mockReq.method = 'PUT'
      mockReq.query = { id: 'entry-123' }
      mockReq.body = {
        user_id: 'test-user-123',
        title: 'Updated Title',
        transcription: 'Updated transcription'
      }

      const mockUpdatedEntry = {
        id: 'entry-123',
        user_id: 'test-user-123',
        title: 'Updated Title',
        transcription: 'Updated transcription',
        updated_at: '2026-01-25T01:00:00Z'
      }

      mockSingle.mockResolvedValue({
        data: mockUpdatedEntry,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'entry-123')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedEntry,
        message: 'Journal entry updated successfully'
      })
    })

    it('should only update allowed fields', async () => {
      mockReq.method = 'PUT'
      mockReq.query = { id: 'entry-123' }
      mockReq.body = {
        user_id: 'test-user-123',
        title: 'Updated Title',
        transcription: 'Updated transcription',
        invalid_field: 'should be ignored',
        user_id: 'should not change'
      }

      const mockUpdatedEntry = {
        id: 'entry-123',
        title: 'Updated Title',
        transcription: 'Updated transcription'
      }

      mockSingle.mockResolvedValue({
        data: mockUpdatedEntry,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockUpdate).toHaveBeenCalled()
      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall).not.toHaveProperty('invalid_field')
      expect(updateCall).toHaveProperty('title')
      expect(updateCall).toHaveProperty('transcription')
    })

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'PUT'
      mockReq.query = { id: 'entry-123' }
      mockReq.body = {
        title: 'Updated Title'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required'
      })
    })

    it('should return 400 if no valid fields to update', async () => {
      mockReq.method = 'PUT'
      mockReq.query = { id: 'entry-123' }
      mockReq.body = {
        user_id: 'test-user-123',
        invalid_field: 'value'
      }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'No valid fields to update'
      })
    })

    it('should return 404 if entry not found', async () => {
      mockReq.method = 'PUT'
      mockReq.query = { id: 'non-existent' }
      mockReq.body = {
        user_id: 'test-user-123',
        title: 'Updated Title'
      }

      mockSingle.mockResolvedValue({
        data: null,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Journal entry not found or access denied'
      })
    })

    it('should handle update errors', async () => {
      mockReq.method = 'PUT'
      mockReq.query = { id: 'entry-123' }
      mockReq.body = {
        user_id: 'test-user-123',
        title: 'Updated Title'
      }

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('DELETE /api/journal/[id]', () => {
    it('should delete a journal entry and audio file', async () => {
      mockReq.method = 'DELETE'
      mockReq.query = { id: 'entry-123', user_id: 'test-user-123' }

      // Mock fetching entry for audio file path
      mockSingle
        .mockResolvedValueOnce({
          data: {
            audio_file_path: 'user-123/entry-123.webm'
          },
          error: null
        })
        // Mock delete operation
        .mockResolvedValueOnce({
          data: null,
          error: null
        })

      mockRemove.mockResolvedValue({
        data: null,
        error: null
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockSelect).toHaveBeenCalledWith('audio_file_path')
      expect(mockStorageFrom).toHaveBeenCalledWith('journal_audio')
      expect(mockRemove).toHaveBeenCalledWith(['user-123/entry-123.webm'])
      expect(mockDelete).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Journal entry deleted successfully'
      })
    })

    it('should delete entry even if audio file deletion fails', async () => {
      mockReq.method = 'DELETE'
      mockReq.query = { id: 'entry-123', user_id: 'test-user-123' }

      mockSingle
        .mockResolvedValueOnce({
          data: {
            audio_file_path: 'user-123/entry-123.webm'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: null
        })

      mockRemove.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      // Should still delete the entry
      expect(mockDelete).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should delete entry without audio file if path is null', async () => {
      mockReq.method = 'DELETE'
      mockReq.query = { id: 'entry-123', user_id: 'test-user-123' }

      mockSingle
        .mockResolvedValueOnce({
          data: {
            audio_file_path: null
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: null
        })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockRemove).not.toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'DELETE'
      mockReq.query = { id: 'entry-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required'
      })
    })

    it('should return 404 if entry not found', async () => {
      mockReq.method = 'DELETE'
      mockReq.query = { id: 'non-existent', user_id: 'test-user-123' }

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Journal entry not found'
      })
    })

    it('should handle delete errors', async () => {
      mockReq.method = 'DELETE'
      mockReq.query = { id: 'entry-123', user_id: 'test-user-123' }

      mockSingle.mockResolvedValueOnce({
        data: { audio_file_path: null },
        error: null
      })

      mockDelete.mockResolvedValue({
        error: { message: 'Delete error' }
      })

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to delete journal entry'
      })
    })
  })

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'POST'
      mockReq.query = { id: 'entry-123' }

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PUT', 'DELETE'])
      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method POST not allowed'
      })
    })
  })
})
