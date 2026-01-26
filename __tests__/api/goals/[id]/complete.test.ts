import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/goals/[id]/complete';
import { createSupabaseMock, mockGetSupabase } from '../../../test-utils';
import { GoalsService } from '../../../../src/services/goals.service';
import { mockGoal, mockGoalCompleted, TEST_USER_ID } from '../../../../src/test/fixtures/goals';

// Mock the GoalsService
jest.mock('../../../../src/services/goals.service', () => ({
  GoalsService: jest.fn(),
}));

describe('/api/goals/[id]/complete', () => {
  let mockReq: NextApiRequest;
  let mockRes: NextApiResponse;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  let supabaseMock: any;
  let queryResultMock: jest.Mock;
  let queryChain: any;
  let mockGoalsService: jest.Mocked<GoalsService>;

  beforeEach(() => {
    jest.clearAllMocks();

    const {
      supabaseMock: newSupabaseMock,
      queryResultMock: newQueryResultMock,
      queryChain: newQueryChain,
      createMockReqRes,
    } = createSupabaseMock();

    supabaseMock = newSupabaseMock;
    queryResultMock = newQueryResultMock;
    queryChain = newQueryChain;

    mockGetSupabase.mockReturnValue(supabaseMock);

    const { req, res, json, status, setHeader } = createMockReqRes();
    mockReq = req;
    mockRes = res;
    jsonMock = json;
    statusMock = status;
    setHeaderMock = setHeader;

    // Mock GoalsService
    mockGoalsService = {
      completeGoal: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('POST /api/goals/[id]/complete', () => {
    it('should mark goal as completed', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = { user_id: TEST_USER_ID };

      mockGoalsService.completeGoal.mockResolvedValue(mockGoalCompleted);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.completeGoal).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockGoalCompleted,
        message: 'Goal marked as completed',
      });
    });

    it('should return 400 if goal ID is missing', async () => {
      mockReq.method = 'POST';
      mockReq.query = {};
      mockReq.body = { user_id: TEST_USER_ID };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {};

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: 'fake-id' };
      mockReq.body = { user_id: TEST_USER_ID };

      mockGoalsService.completeGoal.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = { user_id: TEST_USER_ID };

      mockGoalsService.completeGoal.mockRejectedValue(new Error('Database error'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to complete goal',
        })
      );
    });
  });

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'GET';
      mockReq.query = { id: mockGoal.id };

      await handler(mockReq, mockRes);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method GET not allowed',
      });
    });
  });
});
