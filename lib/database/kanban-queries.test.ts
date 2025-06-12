/**
 * Unit Tests for Kanban Query Functions
 * Tests all database operations with proper mocking
 */

// Mock Supabase before importing our functions
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
  upsert: jest.fn().mockReturnThis()
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
  getTaskSubtasks,
  createSubtask,
  updateSubtask,
  toggleSubtask,
  deleteSubtask,
  getTaskStats,
  getRecentCompletions,
  getOverdueTasks,
  Task,
  Comment,
  Subtask
} from './kanban-queries'

// Test data
const mockTask: Task = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Test Task',
  description: 'Test Description',
  status: 'todo',
  priority: 'medium',
  due_date: '2024-12-31T23:59:59.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  user_id: 'user123',
  order_index: 0
}

const mockComment: Comment = {
  id: 'comment123',
  task_id: mockTask.id,
  content: 'Test comment',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  user_id: 'user123'
}

const mockSubtask: Subtask = {
  id: 'subtask123',
  task_id: mockTask.id,
  title: 'Test subtask',
  completed: false,
  order_index: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  user_id: 'user123'
}

describe('Kanban Query Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // TASK QUERIES TESTS
  // ============================================================================

  describe('getTasks', () => {
    test('should fetch all tasks successfully', async () => {
      const mockTasks = [mockTask]
      mockSupabaseClient.order.mockResolvedValue({ data: mockTasks, error: null })

      const result = await getTasks()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockTasks)
    })

    test('should fetch tasks filtered by status', async () => {
      const mockTasks = [mockTask]
      mockSupabaseClient.order.mockResolvedValue({ data: mockTasks, error: null })

      const result = await getTasks('todo')

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'todo')
      expect(result).toEqual(mockTasks)
    })

    test('should throw error when database query fails', async () => {
      mockSupabaseClient.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      })

      await expect(getTasks()).rejects.toThrow('Failed to fetch tasks: Database error')
    })
  })

  describe('getTask', () => {
    test('should fetch a single task', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: mockTask, error: null })

      const result = await getTask(mockTask.id)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockTask.id)
      expect(result).toEqual(mockTask)
    })

    test('should throw error when task not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Task not found' } 
      })

      await expect(getTask('nonexistent')).rejects.toThrow('Failed to fetch task: Task not found')
    })
  })

  describe('createTask', () => {
    test('should create a new task successfully', async () => {
      const taskData = {
        title: 'New Task',
        description: 'New Description',
        status: 'backlog' as const,
        priority: 'high' as const,
        due_date: '2024-12-31T23:59:59.000Z',
        order_index: 1
      }

      mockSupabaseClient.single.mockResolvedValue({ 
        data: { ...mockTask, ...taskData }, 
        error: null 
      })

      const result = await createTask(taskData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([taskData])
      expect(result).toEqual({ ...mockTask, ...taskData })
    })
  })

  describe('updateTask', () => {
    test('should update a task successfully', async () => {
      const updates = { title: 'Updated Title', priority: 'urgent' as const }
      const updatedTask = { ...mockTask, ...updates }

      mockSupabaseClient.single.mockResolvedValue({ data: updatedTask, error: null })

      const result = await updateTask(mockTask.id, updates)

      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updates)
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockTask.id)
      expect(result).toEqual(updatedTask)
    })
  })

  describe('deleteTask', () => {
    test('should delete a task successfully', async () => {
      mockSupabaseClient.eq.mockResolvedValue({ error: null })

      const result = await deleteTask(mockTask.id)

      expect(mockSupabaseClient.delete).toHaveBeenCalled()
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockTask.id)
      expect(result).toBe(true)
    })
  })

  describe('moveTask', () => {
    test('should move a task to new status and position', async () => {
      const movedTask = { ...mockTask, status: 'doing' as const, order_index: 2 }
      mockSupabaseClient.single.mockResolvedValue({ data: movedTask, error: null })

      const result = await moveTask(mockTask.id, 'doing', 2)

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'doing',
        order_index: 2
      })
      expect(result).toEqual(movedTask)
    })
  })

  // ============================================================================
  // COMMENT QUERIES TESTS
  // ============================================================================

  describe('getTaskComments', () => {
    test('should fetch comments for a task', async () => {
      const mockComments = [mockComment]
      mockSupabaseClient.order.mockResolvedValue({ data: mockComments, error: null })

      const result = await getTaskComments(mockTask.id)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('comments')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('task_id', mockTask.id)
      expect(result).toEqual(mockComments)
    })
  })

  describe('createComment', () => {
    test('should create a new comment', async () => {
      const commentData = {
        task_id: mockTask.id,
        content: 'New comment'
      }

      mockSupabaseClient.single.mockResolvedValue({ 
        data: { ...mockComment, ...commentData }, 
        error: null 
      })

      const result = await createComment(commentData)

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([commentData])
      expect(result).toEqual({ ...mockComment, ...commentData })
    })
  })

  describe('updateComment', () => {
    test('should update a comment', async () => {
      const newContent = 'Updated comment'
      const updatedComment = { ...mockComment, content: newContent }

      mockSupabaseClient.single.mockResolvedValue({ data: updatedComment, error: null })

      const result = await updateComment(mockComment.id, newContent)

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ content: newContent })
      expect(result).toEqual(updatedComment)
    })
  })

  describe('deleteComment', () => {
    test('should delete a comment', async () => {
      mockSupabaseClient.eq.mockResolvedValue({ error: null })

      const result = await deleteComment(mockComment.id)

      expect(mockSupabaseClient.delete).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // SUBTASK QUERIES TESTS
  // ============================================================================

  describe('getTaskSubtasks', () => {
    test('should fetch subtasks for a task', async () => {
      const mockSubtasks = [mockSubtask]
      mockSupabaseClient.order.mockResolvedValue({ data: mockSubtasks, error: null })

      const result = await getTaskSubtasks(mockTask.id)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subtasks')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('task_id', mockTask.id)
      expect(result).toEqual(mockSubtasks)
    })
  })

  describe('createSubtask', () => {
    test('should create a new subtask', async () => {
      const subtaskData = {
        task_id: mockTask.id,
        title: 'New subtask',
        completed: false,
        order_index: 1
      }

      mockSupabaseClient.single.mockResolvedValue({ 
        data: { ...mockSubtask, ...subtaskData }, 
        error: null 
      })

      const result = await createSubtask(subtaskData)

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([subtaskData])
      expect(result).toEqual({ ...mockSubtask, ...subtaskData })
    })
  })

  describe('toggleSubtask', () => {
    test('should toggle subtask completion status', async () => {
      // Mock the two calls: first to get current status, second to update
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { completed: false }, error: null })
        .mockResolvedValueOnce({ data: { ...mockSubtask, completed: true }, error: null })

      const result = await toggleSubtask(mockSubtask.id)

      expect(mockSupabaseClient.select).toHaveBeenCalledWith('completed')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ completed: true })
      expect(result).toEqual({ ...mockSubtask, completed: true })
    })
  })

  // ============================================================================
  // ANALYTICS QUERIES TESTS
  // ============================================================================

  describe('getTaskStats', () => {
    test('should calculate task statistics correctly', async () => {
      const mockTasksData = [
        { status: 'backlog' },
        { status: 'todo' },
        { status: 'todo' },
        { status: 'doing' },
        { status: 'done' },
        { status: 'done' }
      ]

      mockSupabaseClient.select.mockResolvedValue({ data: mockTasksData, error: null })

      const result = await getTaskStats()

      expect(result).toEqual({
        total: 6,
        backlog: 1,
        todo: 2,
        doing: 1,
        done: 2,
        completionRate: 33.33333333333333
      })
    })

    test('should handle empty task list', async () => {
      mockSupabaseClient.select.mockResolvedValue({ data: [], error: null })

      const result = await getTaskStats()

      expect(result).toEqual({
        total: 0,
        backlog: 0,
        todo: 0,
        doing: 0,
        done: 0,
        completionRate: 0
      })
    })
  })

  describe('getRecentCompletions', () => {
    test('should fetch recently completed tasks', async () => {
      const mockCompletedTasks = [{ ...mockTask, status: 'done' }]
      mockSupabaseClient.order.mockResolvedValue({ data: mockCompletedTasks, error: null })

      const result = await getRecentCompletions(7)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'done')
      expect(result).toEqual(mockCompletedTasks)
    })
  })

  describe('getOverdueTasks', () => {
    test('should fetch overdue tasks', async () => {
      const mockOverdueTasks = [mockTask]
      mockSupabaseClient.order.mockResolvedValue({ data: mockOverdueTasks, error: null })

      const result = await getOverdueTasks()

      expect(mockSupabaseClient.neq).toHaveBeenCalledWith('status', 'done')
      expect(mockSupabaseClient.not).toHaveBeenCalledWith('due_date', 'is', null)
      expect(result).toEqual(mockOverdueTasks)
    })
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      mockSupabaseClient.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Connection timeout' } 
      })

      await expect(getTasks()).rejects.toThrow('Failed to fetch tasks: Connection timeout')
    })

    test('should handle invalid data errors', async () => {
      mockSupabaseClient.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Invalid UUID format' } 
      })

      await expect(getTask('invalid-id')).rejects.toThrow('Failed to fetch task: Invalid UUID format')
    })
  })
}) 