import { NextRequest } from 'next/server';
import { POST } from '../../../../../../src/app/api/goals/[id]/complete/route';
import { createSupabaseMock } from '../../../../../test-utils';
import { GoalsService } from '../../../../../../src/services/goals.service';
import { mockGoal, mockGoalCompleted, TEST_USER_ID } from '../../../../../../src/test/fixtures/goals';

// Mock the GoalsService
jest.mock('../../../../../../src/services/goals.service', () => ({
  GoalsService: jest.fn(),
}));

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('App Router: POST /api/goals/[id]/complete', () => {
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
      completeGoal: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('POST /api/goals/[id]/complete', () => {
    it('should mark goal as completed', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/complete`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      mockGoalsService.completeGoal.mockResolvedValue(mockGoalCompleted);

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockGoalCompleted,
        message: 'Goal marked as completed',
      });
      expect(mockGoalsService.completeGoal).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
    });

    it('should return 400 if goal ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals/complete', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      const response = await POST(request, { params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/complete`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/complete`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 404 when goal not found', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/fake-id/complete`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      mockGoalsService.completeGoal.mockRejectedValue(new Error('Goal not found'));

      const response = await POST(request, { params: { id: 'fake-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/complete`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      mockGoalsService.completeGoal.mockRejectedValue(new Error('Database error'));

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to complete goal');
    });
  });
});
