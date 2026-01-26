import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/tasks/[id]/goals';
import { GoalsService } from '../../../../src/services/goals.service';

jest.mock('../../../../src/services/goals.service');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

describe('/api/tasks/[id]/goals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns goals linked to task', async () => {
    const mockTaskGoals = [
      {
        goal_id: 'goal-1',
        task_id: 'task-1',
        contribution_weight: 1,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const mockGetTaskGoals = jest.fn().mockResolvedValue(mockTaskGoals);
    (GoalsService as jest.MockedClass<typeof GoalsService>).mockImplementation(() => ({
      getTaskGoals: mockGetTaskGoals,
    } as any));

    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'task-1' },
      headers: {
        authorization: 'Bearer mock-token',
      },
    });

    // Mock supabase auth
    const { createClient } = require('@supabase/supabase-js');
    const mockSupabase = createClient();
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockTaskGoals);
  });

  it('returns 400 if task ID is missing', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {},
      headers: {
        authorization: 'Bearer mock-token',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Task ID is required');
  });

  it('returns 401 if not authenticated', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'task-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { id: 'task-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
