import { NextRequest } from 'next/server';
import { POST } from '../../../../../src/app/api/goals/reorder/route';
import { createSupabaseMock } from '../../../../test-utils';
import { GoalsService } from '../../../../../src/services/goals.service';
import { TEST_USER_ID } from '../../../../../src/test/fixtures/goals';

// Mock the GoalsService
jest.mock('../../../../../src/services/goals.service', () => ({
  GoalsService: jest.fn(),
}));

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('App Router: POST /api/goals/reorder', () => {
  let mockGoalsService: jest.Mocked<GoalsService>;
  let supabaseMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const { supabaseMock: newSupabaseMock } = createSupabaseMock();
    supabaseMock = newSupabaseMock;

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(supabaseMock);

    // Mock GoalsService
    mockGoalsService = {
      reorderGoals: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('POST /api/goals/reorder', () => {
    it('should reorder goals', async () => {
      const goalIds = ['goal-1', 'goal-2', 'goal-3'];
      const request = new NextRequest('http://localhost:3000/api/goals/reorder', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          goal_ids: goalIds,
        }),
      });

      mockGoalsService.reorderGoals.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Goals reordered successfully',
      });
      expect(mockGoalsService.reorderGoals).toHaveBeenCalledWith(goalIds, TEST_USER_ID);
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals/reorder', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          goal_ids: ['goal-1', 'goal-2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 400 if goal_ids is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals/reorder', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'goal_ids is required',
      });
    });

    it('should return 400 if goal_ids is not an array', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals/reorder', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          goal_ids: 'not-an-array',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'goal_ids must be an array',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals/reorder', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          goal_ids: ['goal-1', 'goal-2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals/reorder', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          goal_ids: ['goal-1', 'goal-2'],
        }),
      });

      mockGoalsService.reorderGoals.mockRejectedValue(new Error('Database error'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to reorder goals');
    });
  });
});
