import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../../../../../../src/app/api/goals/[id]/tasks/route';
import { createSupabaseMock } from '../../../../../test-utils';
import { GoalsService } from '../../../../../../src/services/goals.service';
import { mockGoal, TEST_USER_ID } from '../../../../../../src/test/fixtures/goals';
import { GoalTask } from '../../../../../../src/types/goals';

// Mock the GoalsService
jest.mock('../../../../../../src/services/goals.service', () => ({
  GoalsService: jest.fn(),
}));

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockGoalTask: GoalTask = {
  goal_id: mockGoal.id,
  task_id: 'task-uuid-1',
  contribution_weight: 5,
  created_at: '2026-01-25T12:00:00.000Z',
};

describe('App Router: GET/POST/DELETE /api/goals/[id]/tasks', () => {
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
      getGoalTasks: jest.fn(),
      addGoalTask: jest.fn(),
      removeGoalTask: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('GET /api/goals/[id]/tasks', () => {
    it('should return goal tasks', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks?user_id=${TEST_USER_ID}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      mockGoalsService.getGoalTasks.mockResolvedValue([mockGoalTask]);

      const response = await GET(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: [mockGoalTask],
      });
      expect(mockGoalsService.getGoalTasks).toHaveBeenCalledWith(mockGoal.id, TEST_USER_ID);
    });

    it('should return 400 if goal ID is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/tasks?user_id=${TEST_USER_ID}`, {
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
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
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
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks?user_id=${TEST_USER_ID}`, {
        method: 'GET',
      });

      const response = await GET(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks?user_id=${TEST_USER_ID}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      mockGoalsService.getGoalTasks.mockRejectedValue(new Error('Database error'));

      const response = await GET(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch goal tasks');
    });
  });

  describe('POST /api/goals/[id]/tasks', () => {
    it('should add task to goal', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
          contribution_weight: 5,
        }),
      });

      mockGoalsService.addGoalTask.mockResolvedValue(mockGoalTask);

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        data: mockGoalTask,
        message: 'Task added to goal successfully',
      });
      expect(mockGoalsService.addGoalTask).toHaveBeenCalledWith(
        mockGoal.id,
        'task-uuid-1',
        5,
        TEST_USER_ID
      );
    });

    it('should return 400 if goal ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals/tasks', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
        }),
      });

      const response = await POST(request, { params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          task_id: 'task-uuid-1',
        }),
      });

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 400 if task_id is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
        }),
      });

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'task_id is required',
      });
    });

    it('should return 400 if contribution_weight is invalid', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
          contribution_weight: 15,
        }),
      });

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'contribution_weight must be between 1 and 10',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
        }),
      });

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
        }),
      });

      mockGoalsService.addGoalTask.mockRejectedValue(new Error('Database error'));

      const response = await POST(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to add task to goal');
    });
  });

  describe('DELETE /api/goals/[id]/tasks', () => {
    it('should remove task from goal', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
        }),
      });

      mockGoalsService.removeGoalTask.mockResolvedValue(undefined);

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Task removed from goal successfully',
      });
      expect(mockGoalsService.removeGoalTask).toHaveBeenCalledWith(
        mockGoal.id,
        'task-uuid-1',
        TEST_USER_ID
      );
    });

    it('should return 400 if goal ID is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals/tasks', {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
        }),
      });

      const response = await DELETE(request, { params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Goal ID is required',
      });
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          task_id: 'task-uuid-1',
        }),
      });

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 400 if task_id is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
        }),
      });

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'task_id is required',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
        }),
      });

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals/${mockGoal.id}/tasks`, {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          task_id: 'task-uuid-1',
        }),
      });

      mockGoalsService.removeGoalTask.mockRejectedValue(new Error('Database error'));

      const response = await DELETE(request, { params: { id: mockGoal.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to remove task from goal');
    });
  });
});
