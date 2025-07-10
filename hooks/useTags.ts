import { useState, useEffect, useCallback } from 'react'
import { Tag } from '../pages/api/tags/index'

interface UseTagsResult {
  tags: Tag[]
  loading: boolean
  error: string | null
  createTag: (name: string, color?: string) => Promise<Tag | null>
  updateTag: (id: string, updates: { name?: string; color?: string }) => Promise<Tag | null>
  deleteTag: (id: string) => Promise<boolean>
  refreshTags: () => Promise<void>
}

interface UseTaskTagsResult {
  tags: Tag[]
  loading: boolean
  error: string | null
  addTagToTask: (tagId: string) => Promise<boolean>
  removeTagFromTask: (tagId: string) => Promise<boolean>
  refreshTaskTags: () => Promise<void>
}

export function useTags(userId: string): UseTagsResult {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/tags?user_id=${userId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tags')
      }

      setTags(data.tags || [])
    } catch (err) {
      console.error('Error fetching tags:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const createTag = useCallback(async (name: string, color?: string): Promise<Tag | null> => {
    if (!userId) return null

    try {
      setError(null)

      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          color,
          user_id: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tag')
      }

      const newTag = data.tag
      setTags(prev => [...prev, newTag])
      return newTag
    } catch (err) {
      console.error('Error creating tag:', err)
      setError(err instanceof Error ? err.message : 'Failed to create tag')
      return null
    }
  }, [userId])

  const updateTag = useCallback(async (id: string, updates: { name?: string; color?: string }): Promise<Tag | null> => {
    if (!userId) return null

    try {
      setError(null)

      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          user_id: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tag')
      }

      const updatedTag = data.tag
      setTags(prev => prev.map(tag => tag.id === id ? updatedTag : tag))
      return updatedTag
    } catch (err) {
      console.error('Error updating tag:', err)
      setError(err instanceof Error ? err.message : 'Failed to update tag')
      return null
    }
  }, [userId])

  const deleteTag = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false

    try {
      setError(null)

      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tag')
      }

      setTags(prev => prev.filter(tag => tag.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting tag:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete tag')
      return false
    }
  }, [userId])

  const refreshTags = useCallback(async () => {
    await fetchTags()
  }, [fetchTags])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    refreshTags,
  }
}

export function useTaskTags(taskId: string, userId: string): UseTaskTagsResult {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTaskTags = useCallback(async () => {
    if (!taskId || !userId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/tasks/${taskId}/tags?user_id=${userId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch task tags')
      }

      setTags(data.tags || [])
    } catch (err) {
      console.error('Error fetching task tags:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch task tags')
    } finally {
      setLoading(false)
    }
  }, [taskId, userId])

  const addTagToTask = useCallback(async (tagId: string): Promise<boolean> => {
    if (!taskId || !userId) return false

    try {
      setError(null)

      const response = await fetch(`/api/tasks/${taskId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_id: tagId,
          user_id: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add tag to task')
      }

      const newTag = data.tag
      setTags(prev => [...prev, newTag])
      return true
    } catch (err) {
      console.error('Error adding tag to task:', err)
      setError(err instanceof Error ? err.message : 'Failed to add tag to task')
      return false
    }
  }, [taskId, userId])

  const removeTagFromTask = useCallback(async (tagId: string): Promise<boolean> => {
    if (!taskId || !userId) return false

    try {
      setError(null)

      const response = await fetch(`/api/tasks/${taskId}/tags`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_id: tagId,
          user_id: userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove tag from task')
      }

      setTags(prev => prev.filter(tag => tag.id !== tagId))
      return true
    } catch (err) {
      console.error('Error removing tag from task:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove tag from task')
      return false
    }
  }, [taskId, userId])

  const refreshTaskTags = useCallback(async () => {
    await fetchTaskTags()
  }, [fetchTaskTags])

  useEffect(() => {
    fetchTaskTags()
  }, [fetchTaskTags])

  return {
    tags,
    loading,
    error,
    addTagToTask,
    removeTagFromTask,
    refreshTaskTags,
  }
} 