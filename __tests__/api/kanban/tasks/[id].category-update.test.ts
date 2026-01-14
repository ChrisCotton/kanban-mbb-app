/**
 * Unit Tests: Task Category Update API
 * 
 * Tests the HOTFIX for missing category_id field in task update endpoint
 */

import { createMocks } from 'node-mocks-http'
import handler from '../../../../pages/api/kanban/tasks/[id]'
import * as kanbanQueries from '../../../../lib/database/kanban-queries'
import { TEST_UUIDS } from '../../../../lib/utils/uuid'

// Mock the kanban queries module
jest.mock('../../../../lib/database/kanban-queries', () => ({
  getTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
}))

describe('API: PUT /api/kanban/tasks/[id] - Category Update', () => {
  const mockTaskId = '0b00046b-3ca3-479c-901d-4a705e79a336'
  const mockCategoryId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  
  const mockTask = {
    id: mockTaskId,
    title: 'Test Task',
    description: 'Test description',
    status: 'todo' as const,
    priority: 'medium' as const,
    order_index: 0,
    user_id: 'test-user-id',
    category_id: null,
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('✅ SUCCESS Cases', () => {
    test('should accept and update category_id with valid UUID', async () => {
      const updatedTask = { ...mockTask, category_id: mockCategoryId }
      ;(kanbanQueries.updateTask as jest.Mock).mockResolvedValue(updatedTask)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          category_id: mockCategoryId,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(kanbanQueries.updateTask).toHaveBeenCalledWith(
        mockTaskId,
        expect.objectContaining({
          category_id: mockCategoryId,
        })
      )

      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data.category_id).toBe(mockCategoryId)
    })

    test('should accept null to clear category assignment', async () => {
      const updatedTask = { ...mockTask, category_id: null }
      ;(kanbanQueries.updateTask as jest.Mock).mockResolvedValue(updatedTask)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          category_id: null,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(kanbanQueries.updateTask).toHaveBeenCalledWith(
        mockTaskId,
        expect.objectContaining({
          category_id: null,
        })
      )

      const responseData = JSON.parse(res._getData())
      expect(responseData.success).toBe(true)
      expect(responseData.data.category_id).toBeNull()
    })

    test('should update category along with other fields', async () => {
      const updatedTask = {
        ...mockTask,
        title: 'Updated Title',
        priority: 'high' as const,
        category_id: mockCategoryId,
      }
      ;(kanbanQueries.updateTask as jest.Mock).mockResolvedValue(updatedTask)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          title: 'Updated Title',
          priority: 'high',
          category_id: mockCategoryId,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(kanbanQueries.updateTask).toHaveBeenCalledWith(
        mockTaskId,
        expect.objectContaining({
          title: 'Updated Title',
          priority: 'high',
          category_id: mockCategoryId,
        })
      )
    })

    test('should handle category change (from one category to another)', async () => {
      const oldCategoryId = TEST_UUIDS.CATEGORY_1
      const newCategoryId = TEST_UUIDS.CATEGORY_2
      
      const updatedTask = { ...mockTask, category_id: newCategoryId }
      ;(kanbanQueries.updateTask as jest.Mock).mockResolvedValue(updatedTask)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          category_id: newCategoryId,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(kanbanQueries.updateTask).toHaveBeenCalledWith(
        mockTaskId,
        expect.objectContaining({
          category_id: newCategoryId,
        })
      )

      const responseData = JSON.parse(res._getData())
      expect(responseData.data.category_id).toBe(newCategoryId)
    })
  })

  describe('❌ VALIDATION Cases', () => {
    test('should reject invalid UUID format for category_id', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          category_id: 'not-a-valid-uuid',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Invalid category_id format')
    })

    test('should reject empty string as category_id', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          category_id: '',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Invalid category_id format')
    })

    test('should reject malformed UUID for category_id', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          category_id: '12345678-1234-1234-1234-1234567890', // Too short
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toContain('Invalid category_id format')
    })
  })

  describe('🔄 EDGE Cases', () => {
    test('should allow updating other fields without touching category_id', async () => {
      const updatedTask = { ...mockTask, title: 'New Title' }
      ;(kanbanQueries.updateTask as jest.Mock).mockResolvedValue(updatedTask)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          title: 'New Title',
          // category_id is undefined (not provided)
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(kanbanQueries.updateTask).toHaveBeenCalledWith(
        mockTaskId,
        expect.objectContaining({
          title: 'New Title',
        })
      )
      
      // category_id should NOT be in the updates object
      const updateCall = (kanbanQueries.updateTask as jest.Mock).mock.calls[0][1]
      expect(updateCall).not.toHaveProperty('category_id')
    })

    test('should handle database errors gracefully', async () => {
      ;(kanbanQueries.updateTask as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          category_id: mockCategoryId,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(500)
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('Internal server error')
    })
  })

  describe('📋 REGRESSION Tests', () => {
    test('should still handle all original fields correctly', async () => {
      const updatedTask = {
        ...mockTask,
        title: 'Updated',
        description: 'Updated desc',
        status: 'doing' as const,
        priority: 'urgent' as const,
        due_date: '2026-12-31',
        order_index: 5,
      }
      ;(kanbanQueries.updateTask as jest.Mock).mockResolvedValue(updatedTask)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: mockTaskId },
        body: {
          title: 'Updated',
          description: 'Updated desc',
          status: 'doing',
          priority: 'urgent',
          due_date: '2026-12-31',
          order_index: 5,
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(kanbanQueries.updateTask).toHaveBeenCalledWith(
        mockTaskId,
        expect.objectContaining({
          title: 'Updated',
          description: 'Updated desc',
          status: 'doing',
          priority: 'urgent',
          due_date: '2026-12-31',
          order_index: 5,
        })
      )
    })
  })
})
