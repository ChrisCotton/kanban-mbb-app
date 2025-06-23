import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import JournalView from './JournalView'
// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            then: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            then: jest.fn()
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          then: jest.fn()
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          then: jest.fn()
        }))
      }))
    }))
  }
}))

// Mock child components
jest.mock('./AudioRecorder', () => {
  return function MockAudioRecorder(props: any) {
    return (
      <div data-testid="audio-recorder">
        <button onClick={() => props.onRecordingComplete(new Blob(), 60)}>
          Complete Recording
        </button>
        <button onClick={props.onCancel}>Cancel</button>
      </div>
    )
  }
})

jest.mock('./TranscriptEditor', () => {
  return function MockTranscriptEditor(props: any) {
    return (
      <div data-testid="transcript-editor">
        <button onClick={() => props.onSave('Updated Title', 'Updated Content')}>
          Save
        </button>
        <button onClick={props.onCancel}>Cancel</button>
        <button onClick={props.onDelete}>Delete</button>
      </div>
    )
  }
})

const { supabase } = jest.requireMock('@/lib/supabase')
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('JournalView', () => {
  const mockEntries = [
    {
      id: '1',
      title: 'First Entry',
      content: 'This is the first journal entry',
      audio_file_path: 'audio1.webm',
      audio_duration: 120,
      transcription_status: 'completed' as const,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      title: 'Second Entry',
      content: 'This is the second journal entry',
      audio_duration: 90,
      transcription_status: 'processing' as const,
      created_at: '2024-01-14T15:30:00Z',
      updated_at: '2024-01-14T15:30:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock response
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: mockEntries,
          error: null
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any)
  })

  it('renders loading state initially', () => {
    render(<JournalView userId="test-user" />)
    
    expect(screen.getByText('Loading journal entries...')).toBeInTheDocument()
  })

  it('renders journal entries list after loading', async () => {
    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Journal Entries (2)')).toBeInTheDocument()
    expect(screen.getByText('First Entry')).toBeInTheDocument()
    expect(screen.getByText('Second Entry')).toBeInTheDocument()
  })

  it('renders tab navigation', async () => {
    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Journal Entries (2)')).toBeInTheDocument()
    expect(screen.getByText('Record New Entry')).toBeInTheDocument()
  })

  it('switches to record tab when Record New Entry is clicked', async () => {
    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Record New Entry'))
    
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument()
  })

  it('displays search functionality', async () => {
    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search journal entries...')
    expect(searchInput).toBeInTheDocument()
  })

  it('filters entries based on search query', async () => {
    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search journal entries...')
    fireEvent.change(searchInput, { target: { value: 'First' } })
    
    expect(screen.getByText('First Entry')).toBeInTheDocument()
    expect(screen.queryByText('Second Entry')).not.toBeInTheDocument()
  })

  it('displays entry details with audio duration and transcription status', async () => {
    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('2:00')).toBeInTheDocument() // Duration for first entry
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('processing')).toBeInTheDocument()
  })

  it('switches to edit mode when entry is clicked', async () => {
    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('First Entry'))
    
    expect(screen.getByTestId('transcript-editor')).toBeInTheDocument()
    expect(screen.getByText('Edit Entry')).toBeInTheDocument()
  })

  it('handles recording completion', async () => {
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: {
            id: '3',
            title: 'New Entry',
            content: '(Transcription pending...)',
            audio_file_path: 'audio3.webm',
            audio_duration: 60,
            transcription_status: 'pending',
            created_at: '2024-01-16T12:00:00Z',
            updated_at: '2024-01-16T12:00:00Z'
          },
          error: null
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: mockEntries,
            error: null
          }))
        }))
      })),
      insert: mockInsert,
      update: jest.fn(),
      delete: jest.fn()
    } as any)

    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Record New Entry'))
    fireEvent.click(screen.getByText('Complete Recording'))
    
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  it('handles entry update', async () => {
    const mockUpdate = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({
        error: null
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: mockEntries,
            error: null
          }))
        }))
      })),
      insert: jest.fn(),
      update: mockUpdate,
      delete: jest.fn()
    } as any)

    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('First Entry'))
    fireEvent.click(screen.getByText('Save'))
    
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it('handles entry deletion', async () => {
    const mockDelete = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({
        error: null
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: mockEntries,
            error: null
          }))
        }))
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: mockDelete
    } as any)

    // Mock window.confirm
    const mockConfirm = jest.fn(() => true)
    Object.defineProperty(window, 'confirm', {
      value: mockConfirm,
      writable: true
    })

    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('First Entry'))
    fireEvent.click(screen.getByText('Delete'))
    
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  it('handles database error gracefully', async () => {
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: null,
          error: new Error('Database error')
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any)

    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load journal entries')).toBeInTheDocument()
    })
  })

  it('displays empty state when no entries exist', async () => {
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any)

    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('No journal entries yet')).toBeInTheDocument()
      expect(screen.getByText('Record First Entry')).toBeInTheDocument()
    })
  })

  it('renders without userId', () => {
    render(<JournalView />)
    
    expect(screen.getByText('Loading journal entries...')).toBeInTheDocument()
  })

  it('dismisses error message when close button is clicked', async () => {
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: null,
          error: new Error('Database error')
        }))
      }))
    }))
    
    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any)

    render(<JournalView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load journal entries')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(screen.queryByText('Failed to load journal entries')).not.toBeInTheDocument()
  })
}) 