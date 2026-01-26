import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../pages/api/goals/[id]';
import { createSupabaseMock, mockGetSupabase } from '../../test-utils';
import { GoalsService } from '../../../src/services/goals.service';
import { mockGoal, mockGoalCompleted, TEST_USER_ID } from '../../../src/test/fixtures/goals';

// Mock the GoalsService
jest.mock('../../../src/services/goals.service', () => ({
  GoalsService: jest.fn(),
}));

describe('/api/goals/[id]', () => {
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
      getGoalById: jest.fn(),
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('GET /api/goals/[id]', () => {
    it('should return single goal', async () => {
      mockReq.method = 'GET';
      mockReq.query = { id: mockGoal.id, user_id: TEST_USER_ID };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.getGoalById).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockGoal,
      });
    });

    it('should return 400 if goal ID is missing', async () => {
      mockReq.method = 'GET';
      mockReq.query = { user_id: TEST_USER_ID };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'GET';
      mockReq.query = { id: mockGoal.id };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'GET';
      mockReq.query = { id: 'fake-id', user_id: TEST_USER_ID };

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.method = 'GET';
      mockReq.query = { id: mockGoal.id, user_id: TEST_USER_ID };

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Database error'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to fetch goal',
        })
      );
    });
  });

  describe('PATCH /api/goals/[id]', () => {
    it('should update goal with valid input', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'Updated Title',
        progress_value: 75,
      };

      const updated = { ...mockGoal, title: 'Updated Title', progress_value: 75 };
      mockGoalsService.updateGoal.mockResolvedValue(updated);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.updateGoal).toHaveBeenCalledWith(
        mockGoal.id,
        expect.objectContaining({
          title: 'Updated Title',
          progress_value: 75,
        }),
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: updated,
        message: 'Goal updated successfully',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = { title: 'Updated' };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required',
      });
    });

    it('should return 400 if progress_value is invalid', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        progress_value: 150,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Progress value must be between 0 and 100',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: 'fake-id' };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'Updated',
      };

      mockGoalsService.updateGoal.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });
  });

  describe('DELETE /api/goals/[id]', () => {
    it('should archive (soft delete) goal', async () => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = { user_id: TEST_USER_ID };

      const archived = { ...mockGoal, status: 'archived' };
      mockGoalsService.deleteGoal.mockResolvedValue(archived);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.deleteGoal).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: archived,
        message: 'Goal archived successfully',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {};

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: 'fake-id' };
      mockReq.body = { user_id: TEST_USER_ID };

      mockGoalsService.deleteGoal.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });
  });

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };

      await handler(mockReq, mockRes);

      expect(setHeaderMock).toHaveBeenCalledWith('Allow', ['GET', 'PATCH', 'DELETE']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Method POST not allowed',
      });
    });
  });
});
