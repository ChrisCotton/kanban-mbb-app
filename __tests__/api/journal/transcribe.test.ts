import { NextApiRequest, NextApiResponse } from 'next'
import handler from '../../../pages/api/journal/transcribe'

// Mock Supabase
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockUpdate = jest.fn()
const mockSingle = jest.fn()
const mockDownload = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      update: mockUpdate,
      single: mockSingle
    })),
    storage: {
      from: jest.fn(() => ({
        download: mockDownload
      }))
    }
  }))
}))

// Mock fetch for transcription API
global.fetch = jest.fn()

describe('/api/journal/transcribe', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockReq = {
      method: 'POST',
      body: {}
    }

    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn()
    }
  })

  it('should transcribe audio using OpenAI Whisper', async () => {
    mockReq.body = {
      entry_id: 'entry-123',
      user_id: 'test-user-123',
      provider: 'openai_whisper'
    }

    const mockEntry = {
      id: 'entry-123',
      user_id: 'test-user-123',
      audio_file_path: 'user-123/entry-123.webm'
    }

    const mockAudioBlob = new Blob(['audio data'], { type: 'audio/webm' })

    mockSingle
      .mockResolvedValueOnce({
        data: mockEntry,
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })

    mockDownload.mockResolvedValue({
      data: mockAudioBlob,
      error: null
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Transcribed text from OpenAI' })
    })

    // Mock environment variable
    process.env.OPENAI_API_KEY = 'test-openai-key'

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('id', 'entry-123')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-123')
    expect(mockDownload).toHaveBeenCalledWith('user-123/entry-123.webm')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-openai-key'
        })
      })
    )
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      transcription: 'Transcribed text from OpenAI',
      message: 'Transcription completed successfully'
    })
  })

  it('should use API key from user profile if available', async () => {
    mockReq.body = {
      entry_id: 'entry-123',
      user_id: 'test-user-123',
      provider: 'openai_whisper'
    }

    const mockEntry = {
      id: 'entry-123',
      user_id: 'test-user-123',
      audio_file_path: 'user-123/entry-123.webm'
    }

    const mockProfile = {
      openai_api_key: 'user-profile-key'
    }

    const mockAudioBlob = new Blob(['audio data'], { type: 'audio/webm' })

    mockSingle
      .mockResolvedValueOnce({
        data: mockEntry,
        error: null
      })
      .mockResolvedValueOnce({
        data: mockProfile,
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })

    mockDownload.mockResolvedValue({
      data: mockAudioBlob,
      error: null
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Transcribed with user key' })
    })

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer user-profile-key'
        })
      })
    )
  })

  it('should return 400 if entry_id or user_id is missing', async () => {
    mockReq.body = {
      entry_id: 'entry-123'
    }

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'entry_id and user_id are required'
    })
  })

  it('should return 404 if entry not found', async () => {
    mockReq.body = {
      entry_id: 'non-existent',
      user_id: 'test-user-123'
    }

    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' }
    })

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(404)
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Journal entry not found'
    })
  })

  it('should return 400 if entry has no audio file', async () => {
    mockReq.body = {
      entry_id: 'entry-123',
      user_id: 'test-user-123'
    }

    mockSingle.mockResolvedValue({
      data: {
        id: 'entry-123',
        audio_file_path: null
      },
      error: null
    })

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'No audio file associated with this entry'
    })
  })

  it('should handle transcription API errors', async () => {
    mockReq.body = {
      entry_id: 'entry-123',
      user_id: 'test-user-123',
      provider: 'openai_whisper'
    }

    const mockEntry = {
      id: 'entry-123',
      audio_file_path: 'user-123/entry-123.webm'
    }

    const mockAudioBlob = new Blob(['audio data'], { type: 'audio/webm' })

    mockSingle
      .mockResolvedValueOnce({
        data: mockEntry,
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })

    mockDownload.mockResolvedValue({
      data: mockAudioBlob,
      error: null
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'OpenAI API error' } })
    })

    process.env.OPENAI_API_KEY = 'test-key'

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(500)
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Transcription failed',
      details: expect.any(String)
    })
  })

  it('should return placeholder if API key is missing', async () => {
    mockReq.body = {
      entry_id: 'entry-123',
      user_id: 'test-user-123',
      provider: 'openai_whisper'
    }

    const mockEntry = {
      id: 'entry-123',
      audio_file_path: 'user-123/entry-123.webm'
    }

    const mockAudioBlob = new Blob(['audio data'], { type: 'audio/webm' })

    mockSingle
      .mockResolvedValueOnce({
        data: mockEntry,
        error: null
      })
      .mockResolvedValueOnce({
        data: { openai_api_key: null },
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: null
      })

    mockDownload.mockResolvedValue({
      data: mockAudioBlob,
      error: null
    })

    delete process.env.OPENAI_API_KEY

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse)

    expect(statusMock).toHaveBeenCalledWith(200)
    const response = jsonMock.mock.calls[0][0]
    expect(response.transcription).toContain('Transcription placeholder')
    expect(response.transcription).toContain('API key not configured')
  })
})
