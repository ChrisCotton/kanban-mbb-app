import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../pages/api/journal/index';
import { createSupabaseMock, mockGetSupabase } from '../../test-utils';

describe('/api/journal', () => {
  let mockReq: NextApiRequest;
  let mockRes: NextApiResponse;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  let supabaseMock: any;
  let queryResultMock: jest.Mock;
  let queryChain: any;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks for a clean slate

    const {
      supabaseMock: newSupabaseMock,
      queryResultMock: newQueryResultMock,
      queryChain: newQueryChain,
      createMockReqRes,
    } = createSupabaseMock();

    supabaseMock = newSupabaseMock;
    queryResultMock = newQueryResultMock;
    queryChain = newQueryChain;

    mockGetSupabase.mockReturnValue(supabaseMock); // Link our API handler to this mock

    // Setup default req/res mocks
    const { req, res, json, status, setHeader } = createMockReqRes();
    mockReq = req;
    mockRes = res;
    jsonMock = json;
    statusMock = status;
    setHeaderMock = setHeader;

    // Default mock query result for successful fetches
    queryResultMock.mockReturnValue({ data: [], error: null });
  });

  describe('GET /api/journal', () => {
    it('should return journal entries for a user', async () => {
      mockReq.method = 'GET';
      mockReq.query = { user_id: 'test-user-123', limit: '10', offset: '0' };

      const mockEntries = [
        {
          id: 'entry-1',
          user_id: 'test-user-123',
          title: 'Test Entry 1',
          transcription: 'Test transcription',
          created_at: '2026-01-25T00:00:00Z',
          updated_at: '2026-01-25T00:00:00Z',
        },
      ];

      queryResultMock.mockReturnValueOnce({
        data: mockEntries,
        error: null,
      });

      await handler(mockReq, mockRes);

      expect(supabaseMock.from).toHaveBeenCalledWith('journal_entries');
      expect(queryChain.select).toHaveBeenCalledWith('*');
      expect(queryChain.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
      expect(queryChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(queryChain.range).toHaveBeenCalledWith(0, 9);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEntries,
        count: 1,
      });
    });

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'GET';
      mockReq.query = {};

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required',
      });
    });

    it('should handle database errors', async () => {
      mockReq.method = 'GET';
      mockReq.query = { user_id: 'test-user-123' };

      queryResultMock.mockReturnValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch journal entries',
      });
    });
  });

  describe('POST /api/journal', () => {
    it('should create a new journal entry', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        user_id: 'test-user-123',
        title: 'New Entry',
        transcription: 'Test transcription',
        transcription_status: 'pending',
        use_audio_for_insights: true,
        use_transcript_for_insights: true,
        tags: ['test'],
      };

      const mockEntry = {
        id: 'new-entry-1',
        user_id: 'test-user-123',
        title: 'New Entry',
        transcription: 'Test transcription',
        created_at: '2026-01-25T00:00:00Z',
        updated_at: '2026-01-25T00:00:00Z',
      };

      queryResultMock.mockReturnValueOnce({
        data: mockEntry,
        error: null,
      });

      await handler(mockReq, mockRes);

      expect(supabaseMock.from).toHaveBeenCalledWith('journal_entries');
      expect(queryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          title: 'New Entry',
          transcription: 'Test transcription',
        })
      );
      expect(queryChain.single).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEntry,
        message: 'Journal entry created successfully',
      });
    });

    it('should use default title if not provided', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        user_id: 'test-user-123',
      };

      const mockEntry = {
        id: 'new-entry-1',
        user_id: 'test-user-123',
        title: `Journal Entry - ${new Date().toLocaleDateString()}`,
        created_at: '2026-01-25T00:00:00Z',
        updated_at: '2026-01-25T00:00:00Z',
      };

      queryResultMock.mockReturnValueOnce({
        data: mockEntry,
        error: null,
      });

      await handler(mockReq, mockRes);

      expect(supabaseMock.from).toHaveBeenCalledWith('journal_entries');
      expect(queryChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-123',
          title: expect.stringContaining('Journal Entry'),
        })
      );
      expect(queryChain.single).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        title: 'Test Entry',
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required',
      });
    });

    it('should handle creation errors', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        user_id: 'test-user-123',
        title: 'New Entry',
      };

      queryResultMock.mockReturnValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create journal entry',
        details: 'Database error',
      });
    });
  });

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PUT';

      await handler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method PUT not allowed',
      });
    });
  });
});