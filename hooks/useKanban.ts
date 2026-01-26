import { useState, useCallback, useEffect } from 'react'
import { Task } from '../lib/database/kanban-queries'
import { supabase } from '../lib/supabase'

export interface TasksByStatus {
  backlog: Task[]
  todo: Task[]
  doing: Task[]
  done: Task[]
}

export interface TaskStats {
  total: number
  backlog: number
  todo: number
  doing: number
  done: number
}

export interface UseKanbanReturn {
  // State
  tasks: TasksByStatus
  isLoading: boolean
  error: string | null
  stats: TaskStats
  
  // Actions
  fetchTasks: (goalId?: string) => Promise<void>
  createTask: (taskData: Partial<Task>) => Promise<Task>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>
  deleteTask: (taskId: string) => Promise<void>
  moveTask: (taskId: string, newStatus: Task['status'], newOrderIndex: number) => Promise<Task>
  getTask: (taskId: string, includeDetails?: boolean) => Promise<Task>
  
  // Utility functions
  clearError: () => void
  refetchTasks: () => Promise<void>
}

/**
 * Custom hook for managing kanban board tasks with full CRUD operations
 * Centralizes all task-related state management and API calls
 */
export const useKanban = (): UseKanbanReturn => {
  const [tasks, setTasks] = useState<TasksByStatus>({
    backlog: [],
    todo: [],
    doing: [],
    done: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate task statistics
  const stats: TaskStats = {
    total: Object.values(tasks).flat().length,
    backlog: tasks.backlog.length,
    todo: tasks.todo.length,
    doing: tasks.doing.length,
    done: tasks.done.length
  }

  /**
   * Fetch all tasks and organize them by status
   * Optionally filter by goal_id
   */
  const fetchTasks = useCallback(async (goalId?: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const url = goalId 
        ? `/api/kanban/tasks?goal_id=${goalId}`
        : '/api/kanban/tasks';
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tasks')
      }

      // Group tasks by status
      const tasksByStatus: TasksByStatus = {
        backlog: [],
        todo: [],
        doing: [],
        done: []
      }

      result.data.forEach((task: Task) => {
        if (tasksByStatus[task.status]) {
          tasksByStatus[task.status].push(task)
        }
      })

      // Sort tasks by order_index within each status
      Object.keys(tasksByStatus).forEach(status => {
        tasksByStatus[status as Task['status']].sort((a, b) => a.order_index - b.order_index)
      })

      setTasks(tasksByStatus)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Create a new task
   */
  const createTask = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
    try {
      setError(null)

      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }

      // Include user_id in task data
      const taskDataWithUser = {
        ...taskData,
        user_id: user.id
      }

      const response = await fetch('/api/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskDataWithUser)
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create task')
      }

      // Refresh tasks to get the latest state
      await fetchTasks()
      
      return result.data
    } catch (err) {
      console.error('Error creating task:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task'
      setError(errorMessage)
      throw err
    }
  }, [fetchTasks])

  /**
   * Update an existing task
   */
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    try {
      setError(null)

      const response = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task')
      }

      // Refresh tasks to get the latest state
      await fetchTasks()
      
      return result.data
    } catch (err) {
      console.error('Error updating task:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task'
      setError(errorMessage)
      throw err
    }
  }, [fetchTasks])

  /**
   * Delete a task
   */
  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      setError(null)

      const response = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete task')
      }

      // Refresh tasks to get the latest state
      await fetchTasks()
    } catch (err) {
      console.error('Error deleting task:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task'
      setError(errorMessage)
      throw err
    }
  }, [fetchTasks])

  /**
   * Move a task to a different status/position
   */
  const moveTask = useCallback(async (
    taskId: string, 
    newStatus: Task['status'], 
    newOrderIndex: number
  ): Promise<Task> => {
    try {
      setError(null)

      const response = await fetch(`/api/kanban/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          order_index: newOrderIndex
        })
      })

      if (!response.ok) {
        throw new Error('Failed to move task')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to move task')
      }

      // Schedule background refetch after a delay to ensure DB has propagated
      // This prevents race conditions where fetchTasks returns stale data
      setTimeout(() => {
        fetchTasks()
      }, 500)
      
      return result.data
    } catch (err) {
      console.error('Error moving task:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to move task'
      setError(errorMessage)
      // On error, immediately refetch to revert optimistic update
      fetchTasks()
      throw err
    }
  }, [fetchTasks])

  /**
   * Get a single task by ID
   */
  const getTask = useCallback(async (taskId: string, includeDetails = false): Promise<Task> => {
    try {
      setError(null)

      const url = `/api/kanban/tasks/${taskId}${includeDetails ? '?include_details=true' : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch task')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch task')
      }

      return result.data
    } catch (err) {
      console.error('Error fetching task:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Alias for fetchTasks for consistency
   */
  const refetchTasks = useCallback(() => {
    return fetchTasks()
  }, [fetchTasks])

  // Fetch tasks on hook initialization
  // Note: Goal filtering is handled by the component that uses this hook
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    // State
    tasks,
    isLoading,
    error,
    stats,
    
    // Actions
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    getTask,
    
    // Utility functions
    clearError,
    refetchTasks
  }
} 