import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../../pages/api/goals/[id]/milestones/reorder';
import { createSupabaseMock } from '../../../../test-utils';
import { GoalsService } from '../../../../../src/services/goals.service';
import { mockGoal, TEST_USER_ID } from '../../../../../src/test/fixtures/goals';
import { createClient } from '@supabase/supabase-js';

// Mock createClient from @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => {
  const actual = jest.requireActual('@supabase/supabase-js');
  return {
    ...actual,
    createClient: jest.fn(),
  };
});

// Mock the GoalsService
jest.mock('../../../../../src/services/goals.service', () => ({
  GoalsService: jest.fn(),
}));

describe('/api/goals/[id]/milestones/reorder', () => {
  let mockReq: NextApiRequest;
  let mockRes: NextApiResponse;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  let supabaseMock: any;
  let mockGoalsService: jest.Mocked<GoalsService>;

  beforeEach(() => {
    jest.clearAllMocks();

    const {
      supabaseMock: newSupabaseMock,
      createMockReqRes,
    } = createSupabaseMock();

    supabaseMock = newSupabaseMock;
    
    // Mock auth.getUser to return a user for authenticated requests
    supabaseMock.auth.getUser = jest.fn().mockImplementation((token: string) => {
      if (token === 'test-token') {
        return Promise.resolve({
          data: { user: { id: TEST_USER_ID } },
          error: null
        });
      }
      return Promise.resolve({
        data: { user: null },
        error: { message: 'Invalid token' }
      });
    });
    
    // Mock createClient to return our mocked supabase client
    (createClient as jest.Mock).mockReturnValue(supabaseMock);

    const { req, res, json, status, setHeader } = createMockReqRes('POST', {}, {}, {
      authorization: 'Bearer test-token'
    });
    mockReq = req;
    mockRes = res;
    jsonMock = json;
    statusMock = status;
    setHeaderMock = setHeader;
    
    // Ensure headers are always set
    if (!mockReq.headers) {
      mockReq.headers = {};
    }
    mockReq.headers.authorization = 'Bearer test-token';

    // Mock GoalsService
    mockGoalsService = {
      getGoalById: jest.fn(),
      reorderMilestones: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('POST /api/goals/[id]/milestones/reorder', () => {
    it('should reorder milestones', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        milestone_ids: ['milestone-1', 'milestone-2', 'milestone-3'],
      };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.reorderMilestones.mockResolvedValue();

      await handler(mockReq, mockRes);

      expect(mockGoalsService.getGoalById).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
      expect(mockGoalsService.reorderMilestones).toHaveBeenCalledWith(
        mockGoal.id,
        ['milestone-1', 'milestone-2', 'milestone-3'],
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
      });
    });

    it('should return 400 if goal ID is missing', async () => {
      mockReq.method = 'POST';
      mockReq.query = {};
      mockReq.body = {
        user_id: TEST_USER_ID,
        milestone_ids: ['milestone-1'],
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if milestone_ids is missing', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'milestone_ids is required',
      });
    });

    it('should return 400 if milestone_ids is not an array', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        milestone_ids: 'not-an-array',
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'milestone_ids must be an array',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: 'fake-id' };
      mockReq.body = {
        user_id: TEST_USER_ID,
        milestone_ids: ['milestone-1'],
      };

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        milestone_ids: ['milestone-1', 'milestone-2'],
      };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.reorderMilestones.mockRejectedValue(new Error('Database error'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
    });
  });
});
