import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import JournalView from '../../../components/journal/JournalView'

// Mock fetch
global.fetch = jest.fn()

// Mock AudioRecorder
jest.mock('../../../components/journal/AudioRecorder', () => {
  return function MockAudioRecorder({ onRecordingComplete, onCancel }: any) {
    return (
      <div>
        <button onClick={() => onRecordingComplete(new Blob(['audio'], { type: 'audio/webm' }), 10)}>
          Mock Record
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    )
  }
})

// Mock TranscriptEditor
jest.mock('../../../components/journal/TranscriptEditor', () => {
  return function MockTranscriptEditor({ entry, onSave, onDelete }: any) {
    return (
      <div>
        <div>Editing: {entry.title}</div>
        <button onClick={() => onSave('Updated Title', 'Updated Content')}>
          Save
        </button>
        <button onClick={onDelete}>Delete</button>
      </div>
    )
  }
})

describe('JournalView CRUD Operations', () => {
  const mockUserId = 'test-user-123'
  const mockEntries = [
    {
      id: 'entry-1',
      user_id: mockUserId,
      title: 'Entry 1',
      transcription: 'Transcription 1',
      transcription_status: 'completed' as const,
      created_at: '2026-01-25T00:00:00Z',
      updated_at: '2026-01-25T00:00:00Z'
    },
    {
      id: 'entry-2',
      user_id: mockUserId,
      title: 'Entry 2',
      transcription: null,
      transcription_status: 'pending' as const,
      created_at: '2026-01-24T00:00:00Z',
      updated_at: '2026-01-24T00:00:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockEntries,
        count: 2
      })
    })
  })

  describe('Read Operations', () => {
    it('should load and display journal entries', async () => {
      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/journal')
        )
      })

      expect(screen.getByText('Entry 1')).toBeInTheDocument()
      expect(screen.getByText('Entry 2')).toBeInTheDocument()
    })

    it('should display entry details when clicked', async () => {
      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Entry 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Entry 1'))

      await waitFor(() => {
        expect(screen.getByDisplayValue('Entry 1')).toBeInTheDocument()
      })
    })
  })

  describe('Update Operations', () => {
    it('should update entry title', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEntries,
            count: 2
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              ...mockEntries[0],
              title: 'Updated Entry 1'
            }
          })
        })

      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Entry 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Entry 1'))

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Entry 1')
        fireEvent.change(titleInput, { target: { value: 'Updated Entry 1' } })
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/journal/entry-1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Updated Entry 1')
          })
        )
      })
    })

    it('should update transcription via TranscriptEditor', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEntries,
            count: 2
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              ...mockEntries[0],
              transcription: 'Updated Content'
            }
          })
        })

      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Entry 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Entry 1'))

      await waitFor(() => {
        const saveButton = screen.getByText('Save')
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/journal/entry-1'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Updated Content')
          })
        )
      })
    })
  })

  describe('Delete Operations', () => {
    it('should delete entry when delete button is clicked', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEntries,
            count: 2
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Journal entry deleted successfully'
          })
        })

      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Entry 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Entry 1'))

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete')
        fireEvent.click(deleteButton)
      })

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled()
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/journal/entry-1'),
          expect.objectContaining({
            method: 'DELETE'
          })
        )
      })

      confirmSpy.mockRestore()
    })

    it('should not delete if user cancels confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockEntries,
          count: 2
        })
      })

      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Entry 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Entry 1'))

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete')
        fireEvent.click(deleteButton)
      })

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled()
      })

      // Should not have called DELETE endpoint
      const deleteCalls = (global.fetch as jest.Mock).mock.calls.filter(
        (call: any[]) => call[0]?.includes('/api/journal/entry-1') && call[1]?.method === 'DELETE'
      )
      expect(deleteCalls).toHaveLength(0)

      confirmSpy.mockRestore()
    })
  })

  describe('Create Operations', () => {
    it('should create entry after recording', async () => {
      const newEntry = {
        id: 'entry-3',
        user_id: mockUserId,
        title: 'New Entry',
        transcription: null,
        transcription_status: 'pending' as const,
        created_at: '2026-01-25T01:00:00Z',
        updated_at: '2026-01-25T01:00:00Z'
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEntries,
            count: 2
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: newEntry
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            audio_file_path: 'user-123/entry-3.webm',
            audio_url: 'https://example.com/audio.webm'
          })
        })

      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Record New Entry')).toBeInTheDocument()
      })

      // Switch to record mode
      const recordTab = screen.getByText('Record New Entry')
      fireEvent.click(recordTab)

      await waitFor(() => {
        const recordButton = screen.getByText('Mock Record')
        fireEvent.click(recordButton)
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/journal',
          expect.objectContaining({
            method: 'POST'
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message on update failure', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEntries,
            count: 2
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Update failed'
          })
        })

      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Entry 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Entry 1'))

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Entry 1')
        fireEvent.change(titleInput, { target: { value: 'Updated' } })
      })

      await waitFor(() => {
        expect(screen.getByText(/Failed to update/i)).toBeInTheDocument()
      })
    })

    it('should display error message on delete failure', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockEntries,
            count: 2
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: 'Delete failed'
          })
        })

      render(<JournalView userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Entry 1')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Entry 1'))

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete')
        fireEvent.click(deleteButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/Failed to delete/i)).toBeInTheDocument()
      })

      confirmSpy.mockRestore()
    })
  })
})
