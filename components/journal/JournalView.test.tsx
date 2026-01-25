import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import JournalView from './JournalView';

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
    );
  };
});

jest.mock('./TranscriptEditor', () => {
  // Import React inside the mock factory to resolve ReferenceError
  const React = require('react'); 
  return function MockTranscriptEditor(props: any) {
    const { entry, onSave, onCancel, onDelete } = props;
    const [title, setTitle] = React.useState(entry.title);
    const [transcription, setTranscription] = React.useState(entry.transcription);

    React.useEffect(() => {
      setTitle(entry.title);
      setTranscription(entry.transcription);
    }, [entry]);

    return (
      <div data-testid="transcript-editor">
        <input
          data-testid="transcript-editor-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          data-testid="transcript-editor-content"
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
        />
        <button onClick={() => onSave(title, transcription)}>
          Save
        </button>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    );
  };
});

describe('JournalView', () => {
  // Use a function to get fresh mock entries for each test
  const getMockEntries = () => [
    {
      id: '1',
      user_id: 'test-user',
      title: 'First Entry',
      audio_file_path: 'audio1.webm',
      audio_duration: 120,
      audio_file_size: 50000,
      transcription: 'This is the transcription of the first entry.',
      transcription_status: 'completed' as const,
      use_audio_for_insights: true,
      use_transcript_for_insights: true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      user_id: 'test-user',
      title: 'Second Entry',
      audio_file_path: 'audio2.webm',
      audio_duration: 90,
      audio_file_size: 25000,
      transcription: 'This is the transcription of the second entry.',
      transcription_status: 'processing' as const,
      use_audio_for_insights: false,
      use_transcript_for_insights: true,
      created_at: '2024-01-14T15:30:00Z',
      updated_at: '2024-01-14T15:30:00Z',
    },
  ];

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    // Reset the mock implementation for global.fetch before each test
    fetchSpy.mockImplementation((url, init) => {
      const mockEntries = getMockEntries(); // Always start with fresh data
      
      if (url === '/api/journal' && init?.method === 'POST') {
        const newEntry = {
          id: (mockEntries.length + 1).toString(), // Generate a new ID
          user_id: 'test-user',
          title: `Journal Entry - ${new Date().toLocaleDateString()}`,
          audio_duration: 0,
          transcription_status: 'pending',
          use_audio_for_insights: true,
          use_transcript_for_insights: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...JSON.parse(init.body),
        };
        mockEntries.push(newEntry);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ data: newEntry }),
        } as Response);
      }
      if (url === '/api/journal/audio' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ audio_file_path: '/audio/new.webm', audio_url: 'http://localhost/audio/new.webm' }),
        } as Response);
      }
      if (url.toString().startsWith('/api/journal/transcribe') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ transcription: 'Mocked transcription for new entry.' }),
        } as Response);
      }
      if (url.toString().startsWith('/api/journal/')) {
        const id = url.toString().split('/').pop()?.split('?')[0];
        if (init?.method === 'PUT') {
          const updates = JSON.parse(init.body as string);
          const index = mockEntries.findIndex(entry => entry.id === id);
          if (index !== -1) {
            mockEntries[index] = { ...mockEntries[index], ...updates };
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: mockEntries[index] }),
          });
        }
        if (init?.method === 'DELETE') {
          const index = mockEntries.findIndex(entry => entry.id === id);
          if (index !== -1) {
            mockEntries.splice(index, 1);
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ message: 'Entry deleted' }),
          });
        }
      }

      // Default GET /api/journal response
      if (url.toString().startsWith('/api/journal')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: mockEntries }),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch request: ${url} ${init?.method}`));
    });

    // Mock window.confirm for deletion tests
    Object.defineProperty(window, 'confirm', {
      value: jest.fn(() => true),
      writable: true,
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore(); // Restore original fetch after each test
  });

  it('renders loading state initially', () => {
    act(() => {
      render(<JournalView userId="test-user" />);
    });
    expect(screen.getByText('Loading journal entries...')).toBeInTheDocument();
  });

  it('renders journal entries list after loading', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    expect(screen.getByText(`Journal Entries (${getMockEntries().length})`)).toBeInTheDocument();
    expect(screen.getByText('First Entry')).toBeInTheDocument();
    expect(screen.getByText('Second Entry')).toBeInTheDocument();
  });

  it('renders tab navigation', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    expect(screen.getByText(`Journal Entries (${getMockEntries().length})`)).toBeInTheDocument();
    expect(screen.getByText('Record New Entry')).toBeInTheDocument();
  });

  it('switches to record tab when Record New Entry is clicked', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Record New Entry'));
    });
    
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument();
  });

  it('displays search functionality', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search journal entries...');
    expect(searchInput).toBeInTheDocument();
  });

  it('filters entries based on search query', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search journal entries...');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'First' } });
    });
    
    expect(screen.getByText('First Entry')).toBeInTheDocument();
    expect(screen.queryByText('Second Entry')).not.toBeInTheDocument();
  });

  it('displays entry details with audio duration and transcription status', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('2:00')).toBeInTheDocument(); // Duration for first entry
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
  });

  it('switches to edit mode when entry is clicked', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('First Entry'));
    });
    
    expect(screen.getByTestId('transcript-editor')).toBeInTheDocument();
    // More specific assertion for the title input within the TranscriptEditor
    expect(screen.getByTestId('transcript-editor-title')).toHaveDisplayValue('First Entry');
  });

  it('handles recording completion', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    fetchSpy.mockClear(); // Clear previous calls to focus on this test's calls
    await act(async () => {
      fireEvent.click(screen.getByText('Record New Entry'));
    });
    
    const completeRecordingButton = screen.getByText('Complete Recording');
    await act(async () => {
      fireEvent.click(completeRecordingButton);
    });
    
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/journal',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"user_id":"test-user"')
        })
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/journal/audio',
        expect.objectContaining({
          method: 'POST',
        })
      );
      // Assert that a new entry with dynamic title is visible
      expect(screen.getByText(/Journal Entry - \d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument();
    });
  });

  it('handles entry update', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('First Entry'));
    });
    
    const titleInput = screen.getByTestId('transcript-editor-title');
    const contentInput = screen.getByTestId('transcript-editor-content');
    
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
      fireEvent.change(contentInput, { target: { value: 'Updated Content' } });
    });

    fetchSpy.mockClear(); // Clear previous calls before acting on save
    const saveButton = screen.getByText('Save');
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/journal/1', // Assuming 'First Entry' has id '1'
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            user_id: 'test-user',
            title: 'Updated Title',
            transcription: 'Updated Content'
          })
        })
      );
    });
  });

  it('handles entry deletion', async () => {
    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading journal entries...')).not.toBeInTheDocument();
    });

    fetchSpy.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByText('First Entry'));
    });
    
    const deleteButton = screen.getByText('Delete');
    await act(async () => {
      fireEvent.click(deleteButton);
    });
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/journal/1?user_id=test-user', // Assuming 'First Entry' has id '1'
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(screen.queryByText('First Entry')).not.toBeInTheDocument();
    });
  });

  it('handles database error gracefully', async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Database error' }),
      } as Response)
    );

    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load journal entries')).toBeInTheDocument();
    });
  });

  it('displays empty state when no entries exist', async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      } as Response)
    );

    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('No journal entries yet')).toBeInTheDocument();
      expect(screen.getByText('Record First Entry')).toBeInTheDocument();
    });
  });

  it('renders without userId', async () => {
    await act(async () => {
      render(<JournalView />);
    });
    
    expect(screen.getByText('Loading journal entries...')).toBeInTheDocument();
  });

  it('dismisses error message when close button is clicked', async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Database error' }),
      } as Response)
    );

    await act(async () => {
      render(<JournalView userId="test-user" />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load journal entries')).toBeInTheDocument();
    });

    // Find the close button by its class name, as it doesn't have an accessible name
    const closeButton = screen.getByRole('button', { name: '' });
    await act(async () => {
      fireEvent.click(closeButton);
    });
    
    expect(screen.queryByText('Failed to load journal entries')).not.toBeInTheDocument();
  });
});