import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../../pages/api/goals/[id]/milestones/[milestoneId]';
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

describe('/api/goals/[id]/milestones/[milestoneId]', () => {
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

    const { req, res, json, status, setHeader } = createMockReqRes('PUT', {}, {}, {
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
      updateMilestone: jest.fn(),
      deleteMilestone: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('PUT /api/goals/[id]/milestones/[milestoneId]', () => {
    it('should update milestone title', async () => {
      mockReq.method = 'PUT';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'Updated Milestone Title',
      };

      const updatedMilestone = { ...mockMilestone, title: 'Updated Milestone Title' };
      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.updateMilestone.mockResolvedValue(updatedMilestone);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.getGoalById).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
      expect(mockGoalsService.updateMilestone).toHaveBeenCalledWith(
        mockGoal.id,
        mockMilestone.id,
        { title: 'Updated Milestone Title' },
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: updatedMilestone,
      });
    });

    it('should update milestone display_order', async () => {
      mockReq.method = 'PUT';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        display_order: 5,
      };

      const updatedMilestone = { ...mockMilestone, display_order: 5 };
      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.updateMilestone.mockResolvedValue(updatedMilestone);

      await handler(mockReq, mockRes);

      expect(mockGoalsService.updateMilestone).toHaveBeenCalledWith(
        mockGoal.id,
        mockMilestone.id,
        { display_order: 5 },
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if goal ID is missing', async () => {
      mockReq.method = 'PUT';
      mockReq.query = { milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'Updated Title',
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if milestone ID is missing', async () => {
      mockReq.method = 'PUT';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'Updated Title',
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Milestone ID is required',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'PUT';
      mockReq.query = { id: 'fake-id', milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'Updated Title',
      };

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.method = 'PUT';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
        title: 'Updated Title',
      };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.updateMilestone.mockRejectedValue(new Error('Database error'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
        })
      );
    });
  });

  describe('DELETE /api/goals/[id]/milestones/[milestoneId]', () => {
    it('should delete a milestone', async () => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
      };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.deleteMilestone.mockResolvedValue();

      await handler(mockReq, mockRes);

      expect(mockGoalsService.getGoalById).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
      expect(mockGoalsService.deleteMilestone).toHaveBeenCalledWith(
        mockGoal.id,
        mockMilestone.id,
        TEST_USER_ID
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
      });
    });

    it('should return 400 if goal ID is missing', async () => {
      mockReq.method = 'DELETE';
      mockReq.query = { milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if milestone ID is missing', async () => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: mockGoal.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
      };

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Milestone ID is required',
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: 'fake-id', milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
      };

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Goal not found'));

      await handler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      mockReq.method = 'DELETE';
      mockReq.query = { id: mockGoal.id, milestoneId: mockMilestone.id };
      mockReq.body = {
        user_id: TEST_USER_ID,
      };

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);
      mockGoalsService.deleteMilestone.mockRejectedValue(new Error('Database error'));

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
