import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../../../pages/api/goals/[id]/milestones/[milestoneId]/toggle';
import { createSupabaseMock } from '../../../../../../test-utils';
import { GoalsService } from '../../../../../../src/services/goals.service';
import { mockGoal, TEST_USER_ID } from '../../../../../../src/test/fixtures/goals';
import { GoalMilestone } from '../../../../../../src/types/goals';
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
jest.mock('../../../../../../src/services/goals.service', () => ({
  GoalsService: jest.fn(),
}));

describe('/api/goals/[id]/milestones/[milestoneId]/toggle', () => {
  let mockReq: NextApiRequest;
  let mockRes: NextApiResponse;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  let supabaseMock: any;
  let mockGoalsService: jest.Mocked<GoalsService>;

  const mockMilestone: GoalMilestone = {
    id: 'milestone-1',
    goal_id: mockGoal.id,
    title: 'Test Milestone',
    is_complete: false,
    display_order: 0,
    created_at: new Date().toISOString(),
    completed_at: null,
  };

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

    const { req, res, json, status, setHeader } = createMockReqRes('PATCH', {}, {}, {
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
      toggleMilestone: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('PATCH /api/goals/[id]/milestones/[milestoneId]/toggle', () => {
    it('should toggle milestone to complete', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        is_complete: true,
      };

      const completedMilestone = {
        ...mockMilestone,
        is_complete: true,
        completed_at: new Date().toISOString(),
      };
      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.toggleMilestone.mockResolvedValue(completedMilestone);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.getGoalById).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
      expect(mockGoalsService.toggleMilestone).toHaveBeenCalledWith(
        mockGoal.id,
        mockMilestone.id,
        true,
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: completedMilestone,
      });
    });

    it('should toggle milestone to incomplete', async () => {
      const completedMilestone = { ...mockMilestone, is_complete: true };
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        is_complete: false,
      };

      const incompleteMilestone = {
        ...mockMilestone,
        is_complete: false,
        completed_at: null,
      };
      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.toggleMilestone.mockResolvedValue(incompleteMilestone);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.toggleMilestone).toHaveBeenCalledWith(
        mockGoal.id,
        mockMilestone.id,
        false,
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if goal ID is missing', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        is_complete: true,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if milestone ID is missing', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        is_complete: true,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Milestone ID is required',
      });
    });

    it('should return 400 if is_complete is missing', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'is_complete is required',
      });
    });

    it('should return 400 if is_complete is not boolean', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        is_complete: 'true', // string instead of boolean
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'is_complete must be a boolean',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: 'fake-id', milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        is_complete: true,
      };

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.method = 'PATCH';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        is_complete: true,
      };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.toggleMilestone.mockRejectedValue(new Error('Database error'));

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
