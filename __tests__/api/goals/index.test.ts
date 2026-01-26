import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../pages/api/goals/index';
import { createSupabaseMock, mockGetSupabase } from '../../test-utils';
import { GoalsService } from '../../../src/services/goals.service';
import { mockGoal, mockCreateGoalInput, mockGoalsList, TEST_USER_ID } from '../../../src/test/fixtures/goals';

// Mock the GoalsService
jest.mock('../../../src/services/goals.service');

describe('/api/goals', () => {
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

    // Mock GoalsService instance
    mockGoalsService = {
      getGoals: jest.fn(),
      createGoal: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('GET /api/goals', () => {
    it('should return goals for authenticated user', async () => {
      mockReq.method = 'GET';
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockReq.query = { user_id: TEST_USER_ID };

      mockGoalsService.getGoals.mockResolvedValue({
        goals: mockGoalsList,
        count: mockGoalsList.length,
      });

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockGoalsList,
        count: mockGoalsList.length,
      });
    });

    it('should filter goals by status', async () => {
      mockReq.method = 'GET';
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockReq.query = { user_id: TEST_USER_ID, status: 'active' };

      const activeGoals = mockGoalsList.filter(g => g.status === 'active');
      mockGoalsService.getGoals.mockResolvedValue({
        goals: activeGoals,
        count: activeGoals.length,
      });

      await handler(mockReq, mockRes);

      expect(mockGoalsService.getGoals).toHaveBeenCalledWith(
        { status: 'active' },
        undefined,
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(200);
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

    it('should return 500 on service error', async () => {
      mockReq.method = 'GET';
      mockReq.query = { user_id: TEST_USER_ID };

      mockGoalsService.getGoals.mockRejectedValue(new Error('Database error'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch goals',
        details: 'Database error',
      });
    });
  });

  describe('POST /api/goals', () => {
    it('should create goal with valid input', async () => {
      mockReq.method = 'POST';
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockReq.body = {
        user_id: TEST_USER_ID,
        ...mockCreateGoalInput,
      };

      mockGoalsService.createGoal.mockResolvedValue(mockGoal);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.createGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockCreateGoalInput.title,
        }),
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockGoal,
        message: 'Goal created successfully',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'POST';
      mockReq.body = mockCreateGoalInput;

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required',
      });
    });

    it('should return 400 if title is missing', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        user_id: TEST_USER_ID,
        description: 'Test',
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Title is required',
      });
    });

    it('should return 400 if title is too long', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'A'.repeat(256),
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Title must be 255 characters or less',
      });
    });

    it('should return 400 if progress_value is invalid', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'Test Goal',
        progress_value: 150,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Progress value must be between 0 and 100',
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.method = 'POST';
      mockReq.body = {
        user_id: TEST_USER_ID,
        ...mockCreateGoalInput,
      };

      mockGoalsService.createGoal.mockRejectedValue(new Error('Database error'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to create goal',
        })
      );
    });
  });

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'PUT';

      await handler(mockReq, mockRes);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET', 'POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method PUT not allowed',
      });
    });
  });
});
