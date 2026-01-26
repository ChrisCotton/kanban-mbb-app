// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// Mock data factory
const getMockJournalEntries = () => [
  {
    id: '1',
    user_id: 'test-user',
    title: 'First Entry',
    audio_file_path: '/audio/first.webm',
    audio_duration: 120,
    audio_file_size: 50000,
    transcription: 'This is the transcription of the first entry.',
    transcription_status: 'completed',
    use_audio_for_insights: true,
    use_transcript_for_insights: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'test-user',
    title: 'Second Entry',
    audio_file_path: '/audio/second.webm',
    audio_duration: 60,
    audio_file_size: 25000,
    transcription: 'This is the transcription of the second entry.',
    transcription_status: 'processing',
    use_audio_for_insights: false,
    use_transcript_for_insights: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Mock fetch API
global.fetch = jest.fn((url, init) => {
  const currentEntries = getMockJournalEntries(); // Use a fresh copy for isolation

  if (url === '/api/journal' && init?.method === 'POST') {
    const newEntry = {
      id: (currentEntries.length + 1).toString(), // Generate a new ID
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
    currentEntries.push(newEntry); // Add to the mock data for subsequent fetches in the same test
    return Promise.resolve({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ data: newEntry }),
    });
  }
  if (url === '/api/journal/audio' && init?.method === 'POST') {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ audio_file_path: '/audio/new.webm', audio_url: 'http://localhost/audio/new.webm' }),
    });
  }
  if (url.toString().startsWith('/api/journal/transcribe') && init?.method === 'POST') {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ transcription: 'Mocked transcription for new entry.' }),
    });
  }
  if (url.toString().startsWith('/api/journal/')) {
    const id = url.toString().split('/').pop()?.split('?')[0];
    if (init?.method === 'PUT') {
      const updates = JSON.parse(init.body);
      const index = currentEntries.findIndex(entry => entry.id === id);
      if (index !== -1) {
        currentEntries[index] = { ...currentEntries[index], ...updates };
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: currentEntries[index] }),
      });
    }
    if (init?.method === 'DELETE') {
      const index = currentEntries.findIndex(entry => entry.id === id);
      if (index !== -1) {
        currentEntries.splice(index, 1);
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
      json: () => Promise.resolve({ data: currentEntries }),
    });
  }
  return Promise.reject(new Error(`Unhandled fetch request: ${url} ${init?.method}`));
});


// Mock Response, Request, and Headers to prevent ReferenceErrors
global.Response = jest.fn(() => ({
  ok: true,
  json: () => Promise.resolve([]),
}));
global.Request = jest.fn();
global.Headers = jest.fn();

// Mock the window.scrollTo
global.scrollTo = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock next/headers for App Router tests
jest.mock('next/headers', () => {
  const mockCookies = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
  };
  return {
    cookies: jest.fn(() => mockCookies),
  };
});