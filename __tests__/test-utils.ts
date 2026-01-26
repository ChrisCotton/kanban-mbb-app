// __tests__/test-utils.ts

import { NextApiRequest, NextApiResponse } from 'next';

// This is a comprehensive mock for the Supabase client that allows for chaining
// and granular control over returned values for different methods.
export const createSupabaseMock = () => {
  // Mock implementations for terminal methods (like .single(), .data, .error)
  const queryResultMock = jest.fn();
  const storageDownloadResultMock = jest.fn();

  // Mock for internal headers object used by PostgrestFilterBuilder
  const mockHeaders = {
    set: jest.fn(),
    append: jest.fn(),
  };

  // Chainable query methods
  const queryChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    // Add the headers object to the queryChain mock
    headers: mockHeaders, 
    // Terminal methods that return a Promise with a configurable result
    single: jest.fn(() => Promise.resolve(queryResultMock())),
    maybeSingle: jest.fn(() => Promise.resolve(queryResultMock())),
    // Mock the .then() method to handle implicit promises
    then: jest.fn((onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) => {
      return Promise.resolve(queryResultMock()).then(onfulfilled, onrejected);
    }),
  };

  // Chainable storage methods
  const storageFileMethods = {
    download: jest.fn(() => Promise.resolve(storageDownloadResultMock())),
    remove: jest.fn(() => Promise.resolve(queryResultMock())),
    upload: jest.fn(() => Promise.resolve(queryResultMock())), // Add upload method for storage
  };

  const storageBucketMethods = {
    from: jest.fn(() => storageFileMethods),
  };

  // The main Supabase mock client
  const supabaseMock = {
    from: jest.fn(() => queryChain),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user-id' } } }, error: null })),
    },
    storage: {
      from: jest.fn(() => storageBucketMethods),
    },
  };

  // Helper to create mock request and response objects for Next.js API routes
  const createMockReqRes = (method: string = 'GET', query: any = {}, body: any = {}, headers: any = {}) => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const setHeader = jest.fn();
    const req: Partial<NextApiRequest> = { method, query, body, headers };
    const res: Partial<NextApiResponse> = { status, json, setHeader };
    return { req: req as NextApiRequest, res: res as NextApiResponse, json, status, setHeader };
  };

  return {
    supabaseMock,
    queryResultMock,
    queryChain,
    storageFileMethods,
    storageBucketMethods,
    storageDownloadResultMock,
    createMockReqRes,
    mockHeaders, // Expose mockHeaders for assertions if needed
  };
};

// Mock the getSupabase function often used in API routes
export const mockGetSupabase = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabase: mockGetSupabase,
}));

// Default mock for getSupabase, can be overridden in tests
mockGetSupabase.mockImplementation(() => {
  const { supabaseMock } = createSupabaseMock();
  return supabaseMock;
});