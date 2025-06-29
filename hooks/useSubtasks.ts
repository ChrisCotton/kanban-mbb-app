import { useState, useEffect, useCallback } from 'react'
import { Subtask } from '../lib/database/kanban-queries'
import { supabase } from '../lib/supabase'

interface UseSubtasksReturn {
  subtasks: Subtask[]
  loading: boolean
  error: string | null
  createSubtask: (title: string) => Promise<void>
  updateSubtask: (id: string, updates: Partial<Pick<Subtask, 'title' | 'completed' | 'order_index'>>) => Promise<void>
  toggleSubtask: (id: string) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
  reorderSubtasks: (reorderedSubtasks: Subtask[]) => Promise<void>
  refetch: () => Promise<void>
}

export function useSubtasks(taskId: string): UseSubtasksReturn {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch subtasks for the task
  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/kanban/tasks/${taskId}/subtasks`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch subtasks')
      }

      setSubtasks(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subtasks')
      console.error('Error fetching subtasks:', err)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  // Create a new subtask
  const createSubtask = useCallback(async (title: string) => {
    try {
      setError(null)
      
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }
      
      const response = await fetch(`/api/kanban/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          order_index: subtasks.length,
          user_id: user.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subtask')
      }

      // Add the new subtask to the list
      setSubtasks(prev => [...prev, result.data])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subtask')
      throw err
    }
  }, [taskId, subtasks.length])

  // Update a subtask
  const updateSubtask = useCallback(async (id: string, updates: Partial<Pick<Subtask, 'title' | 'completed' | 'order_index'>>) => {
    try {
      setError(null)
      
      const response = await fetch(`/api/kanban/subtasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update subtask')
      }

      // Update the subtask in the list
      setSubtasks(prev => prev.map(subtask => 
        subtask.id === id ? result.data : subtask
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subtask')
      throw err
    }
  }, [])

  // Toggle subtask completion
  const toggleSubtask = useCallback(async (id: string) => {
    try {
      setError(null)
      
      // Optimistic update
      setSubtasks(prev => prev.map(subtask => 
        subtask.id === id ? { ...subtask, completed: !subtask.completed } : subtask
      ))
      
      const response = await fetch(`/api/kanban/subtasks/${id}`, {
        method: 'PATCH',
      })

      const result = await response.json()

      if (!response.ok) {
        // Revert optimistic update on error
        setSubtasks(prev => prev.map(subtask => 
          subtask.id === id ? { ...subtask, completed: !subtask.completed } : subtask
        ))
        throw new Error(result.error || 'Failed to toggle subtask')
      }

      // Update with server response
      setSubtasks(prev => prev.map(subtask => 
        subtask.id === id ? result.data : subtask
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle subtask')
      throw err
    }
  }, [])

  // Delete a subtask
  const deleteSubtask = useCallback(async (id: string) => {
    try {
      setError(null)
      
      const response = await fetch(`/api/kanban/subtasks/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete subtask')
      }

      // Remove the subtask from the list
      setSubtasks(prev => prev.filter(subtask => subtask.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subtask')
      throw err
    }
  }, [])

  // Reorder subtasks
  const reorderSubtasks = useCallback(async (reorderedSubtasks: Subtask[]) => {
    try {
      setError(null)
      
      // Optimistic update
      setSubtasks(reorderedSubtasks)
      
      const updates = reorderedSubtasks.map((subtask, index) => ({
        id: subtask.id,
        order_index: index
      }))

      // For now, we'll update each subtask individually
      // In a production app, you might want to create a bulk update endpoint
      await Promise.all(
        updates.map(update => 
          fetch(`/api/kanban/subtasks/${update.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order_index: update.order_index }),
          })
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder subtasks')
      // Refetch to get the correct order from server
      await fetchSubtasks()
      throw err
    }
  }, [fetchSubtasks])

  // Refetch subtasks
  const refetch = useCallback(async () => {
    await fetchSubtasks()
  }, [fetchSubtasks])

  // Fetch subtasks on mount and when taskId changes
  useEffect(() => {
    fetchSubtasks()
  }, [fetchSubtasks])

  return {
    subtasks,
    loading,
    error,
    createSubtask,
    updateSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks,
    refetch
  }
} 