import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../../pages/api/goals/[id]/milestones';
import { createSupabaseMock } from '../../../../test-utils';
import { GoalsService } from '../../../../../src/services/goals.service';
import { mockGoal, TEST_USER_ID } from '../../../../../src/test/fixtures/goals';
import { GoalMilestone } from '../../../../../src/types/goals';
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

describe('/api/goals/[id]/milestones', () => {
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
      createMilestone: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('POST /api/goals/[id]/milestones', () => {
    it('should create a new milestone for a goal', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'New Milestone',
      };

      const newMilestone: GoalMilestone = {
        id: 'milestone-1',
        goal_id: mockGoal.id,
        title: 'New Milestone',
        is_complete: false,
        display_order: 0,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.createMilestone.mockResolvedValue(newMilestone);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.getGoalById).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
      expect(mockGoalsService.createMilestone).toHaveBeenCalledWith(
        mockGoal.id,
        'New Milestone',
        undefined,
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: newMilestone,
      });
    });

    it('should create milestone with display_order when provided', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'New Milestone',
        display_order: 5,
      };
      mockReq.headers = { authorization: 'Bearer test-token' };

      const newMilestone: GoalMilestone = {
        id: 'milestone-1',
        goal_id: mockGoal.id,
        title: 'New Milestone',
        is_complete: false,
        display_order: 5,
        created_at: new Date().toISOString(),
        completed_at: null,
      };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.createMilestone.mockResolvedValue(newMilestone);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.createMilestone).toHaveBeenCalledWith(
        mockGoal.id,
        'New Milestone',
        5,
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 if goal ID is missing', async () => {
      mockReq.method = 'POST';
      mockReq.query = { user_id: TEST_USER_ID };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'New Milestone',
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        title: 'New Milestone',
      };
      mockReq.headers = { authorization: 'Bearer test-token' };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'user_id is required',
      });
    });

    it('should return 400 if title is missing', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Title is required',
      });
    });

    it('should return 400 if title is empty', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: '',
      };
      mockReq.headers = { authorization: 'Bearer test-token' };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Title is required',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: 'fake-id' };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'New Milestone',
      };
      if (mockReq.headers) {
        mockReq.headers.authorization = 'Bearer test-token';
      } else {
        mockReq.headers = { authorization: 'Bearer test-token' };
      }

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });

    it('should return 404 when goal does not belong to user', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: 'different-user-id',
        title: 'New Milestone',
      };
      mockReq.headers = { authorization: 'Bearer test-token' };

      // Mock getGoalById to return null or throw error for wrong user
      mockGoalsService.getGoalById.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 500 on service error', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'New Milestone',
      };
      // Headers are already set in beforeEach, but ensure they're there
      Object.assign(mockReq.headers || {}, { authorization: 'Bearer test-token' });
      
      // Ensure auth mock returns user
      supabaseMock.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null
      });

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.createMilestone.mockRejectedValue(new Error('Database error'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      mockReq.method = 'POST';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'New Milestone',
      };
      mockReq.headers = {}; // No authorization header
      // Mock auth.getUser to return error for unauthenticated request
      supabaseMock.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
    });
  });
});
