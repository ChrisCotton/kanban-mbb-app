// Mock cookies before importing NextRequest
jest.mock('next/headers', () => {
  const mockCookies = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
  };
  return {
    cookies: jest.fn(() => mockCookies),
  };
});

import { NextRequest } from 'next/server';
import { GET, POST } from '../../../../src/app/api/goals/route';
import { createSupabaseMock } from '../../../test-utils';
import { GoalsService } from '../../../../src/services/goals.service';
import { mockGoal, mockCreateGoalInput, mockGoalsList, TEST_USER_ID } from '../../../../src/test/fixtures/goals';

// Mock the GoalsService
jest.mock('../../../../src/services/goals.service');

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('App Router: GET/POST /api/goals', () => {
  let mockGoalsService: jest.Mocked<GoalsService>;
  let supabaseMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const { supabaseMock: newSupabaseMock } = createSupabaseMock();
    supabaseMock = newSupabaseMock;

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(supabaseMock);

    // Mock GoalsService instance
    mockGoalsService = {
      getGoals: jest.fn(),
      createGoal: jest.fn(),
    } as any;

    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => mockGoalsService);
  });

  describe('GET /api/goals', () => {
    it('should return goals for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals?user_id=' + TEST_USER_ID, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      mockGoalsService.getGoals.mockResolvedValue({
        goals: mockGoalsList,
        count: mockGoalsList.length,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockGoalsList,
        count: mockGoalsList.length,
      });
      expect(mockGoalsService.getGoals).toHaveBeenCalled();
    });

    it('should filter goals by status', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/goals?user_id=${TEST_USER_ID}&status=active`,
        {
          method: 'GET',
          headers: {
            authorization: 'Bearer valid-token',
          },
        }
      );

      const activeGoals = mockGoalsList.filter((g) => g.status === 'active');
      mockGoalsService.getGoals.mockResolvedValue({
        goals: activeGoals,
        count: activeGoals.length,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGoalsService.getGoals).toHaveBeenCalledWith(
        { status: 'active' },
        undefined,
        TEST_USER_ID
      );
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals?user_id=${TEST_USER_ID}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required',
      });
    });

    it('should return 500 on service error', async () => {
      const request = new NextRequest(`http://localhost:3000/api/goals?user_id=${TEST_USER_ID}`, {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      mockGoalsService.getGoals.mockRejectedValue(new Error('Database error'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch goals');
    });
  });

  describe('POST /api/goals', () => {
    it('should create goal with valid input', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          ...mockCreateGoalInput,
        }),
      });

      mockGoalsService.createGoal.mockResolvedValue(mockGoal);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        data: mockGoal,
        message: 'Goal created successfully',
      });
      expect(mockGoalsService.createGoal).toHaveBeenCalled();
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(mockCreateGoalInput),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'user_id is required',
      });
    });

    it('should return 400 if title is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          description: 'Test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Title is required',
      });
    });

    it('should return 400 if title is too long', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          title: 'A'.repeat(256),
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Title must be 255 characters or less',
      });
    });

    it('should return 400 if progress_value is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          title: 'Test Goal',
          progress_value: 150,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Progress value must be between 0 and 100',
      });
    });

    it('should return 401 if authorization header is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          ...mockCreateGoalInput,
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
      const request = new NextRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user_id: TEST_USER_ID,
          ...mockCreateGoalInput,
        }),
      });

      mockGoalsService.createGoal.mockRejectedValue(new Error('Database error'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create goal');
    });
  });
});
