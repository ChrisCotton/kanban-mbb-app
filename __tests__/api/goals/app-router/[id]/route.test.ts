import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../../../../../src/app/api/goals/[id]/route';
import { createSupabaseMock } from '../../../../test-utils';
import { GoalsService } from '../../../../../src/services/goals.service';
import { mockGoal, mockGoalCompleted, TEST_USER_ID } from '../../../../../src/test/fixtures/goals';

// Mock the GoalsService
jest.mock('../../../../../src/services/goals.service', () => ({
  GoalsService: jest.fn(),
}));

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('App Router: GET/PATCH/DELETE /api/goals/[id]', () => {
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
      getGoalById: jest.fn(),
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('GET /api/goals/[id]', () => {
    it('should return single goal', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}?user_id=${TEST_USER_ID}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      mockGoalsService.getGoalById.mockResolvedValue(mockGoal);

      const response = await GET(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockGoal,
      });
      expect(mockGoalsService.getGoalById).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
    });

    it('should return 400 if goal ID is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals?user_id=${TEST_USER_ID}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request, { params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}?user_id=${TEST_USER_ID}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 404 when goal not found', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/fake-id?user_id=${TEST_USER_ID}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Goal not found'));

      const response = await GET(request, { params: { id: 'fake-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}?user_id=${TEST_USER_ID}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      mockGoalsService.getGoalById.mockRejectedValue(new Error('Database error'));

      const response = await GET(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch goal');
    });
  });

  describe('PATCH /api/goals/[id]', () => {
    it('should update goal with valid input', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          title: 'Updated Title',
          progress_value: 75,
        }),
      });

      const updated = { ...mockGoal, title: 'Updated Title', progress_value: 75 };
      mockGoalsService.updateGoal.mockResolvedValue(updated);

      const response = await PATCH(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: updated,
        message: 'Goal updated successfully',
      });
      expect(mockGoalsService.updateGoal).toHaveBeenCalledWith(
        mockGoal.id,
        expect.objectContaining({
          title: 'Updated Title',
          progress_value: 75,
        }),
        TEST_USER_ID
      );
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await PATCH(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 400 if progress_value is invalid', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          progress_value: 150,
        }),
      });

      const response = await PATCH(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Progress value must be between 0 and 100',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          title: 'Updated',
        }),
      });

      const response = await PATCH(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 404 when goal not found', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/fake-id`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          title: 'Updated',
        }),
      });

      mockGoalsService.updateGoal.mockRejectedValue(new Error('Goal not found'));

      const response = await PATCH(request, { params: { id: 'fake-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          title: 'Updated',
        }),
      });

      mockGoalsService.updateGoal.mockRejectedValue(new Error('Database error'));

      const response = await PATCH(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update goal');
    });
  });

  describe('DELETE /api/goals/[id]', () => {
    it('should archive (soft delete) goal', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      const archived = { ...mockGoal, status: 'archived' };
      mockGoalsService.deleteGoal.mockResolvedValue(archived);

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: archived,
        message: 'Goal archived successfully',
      });
      expect(mockGoalsService.deleteGoal).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 404 when goal not found', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/fake-id`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      mockGoalsService.deleteGoal.mockRejectedValue(new Error('Goal not found'));

      const response = await DELETE(request, { params: { id: 'fake-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'Goal not found',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ user_id: TEST_USER_ID }),
      });

      mockGoalsService.deleteGoal.mockRejectedValue(new Error('Database error'));

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to archive goal');
    });
  });
});
