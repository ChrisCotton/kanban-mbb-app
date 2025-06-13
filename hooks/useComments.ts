import { useState, useEffect, useCallback } from 'react'
import { Comment } from '../lib/database/kanban-queries'

interface UseCommentsReturn {
  comments: Comment[]
  isLoading: boolean
  error: string | null
  addComment: (content: string) => Promise<void>
  editComment: (commentId: string, content: string) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  refreshComments: () => Promise<void>
}

export const useComments = (taskId: string): UseCommentsReturn => {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch comments for a task
  const fetchComments = useCallback(async () => {
    if (!taskId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/kanban/tasks/${taskId}/comments`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch comments')
      }

      const result = await response.json()
      setComments(result.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments'
      setError(errorMessage)
      console.error('Error fetching comments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  // Add a new comment
  const addComment = useCallback(async (content: string) => {
    if (!content.trim()) {
      throw new Error('Comment content is required')
    }

    setError(null)

    try {
      const response = await fetch(`/api/kanban/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add comment')
      }

      const result = await response.json()
      const newComment = result.data

      // Add the new comment to the local state (at the beginning for LIFO order)
      setComments(prev => [newComment, ...prev])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment'
      setError(errorMessage)
      throw err
    }
  }, [taskId])

  // Edit an existing comment
  const editComment = useCallback(async (commentId: string, content: string) => {
    if (!content.trim()) {
      throw new Error('Comment content is required')
    }

    setError(null)

    try {
      const response = await fetch(`/api/kanban/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to edit comment')
      }

      const result = await response.json()
      const updatedComment = result.data

      // Update the comment in local state
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId ? updatedComment : comment
        )
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to edit comment'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Delete a comment
  const deleteComment = useCallback(async (commentId: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/kanban/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete comment')
      }

      // Remove the comment from local state
      setComments(prev => prev.filter(comment => comment.id !== commentId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete comment'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Refresh comments (manual refresh)
  const refreshComments = useCallback(async () => {
    await fetchComments()
  }, [fetchComments])

  // Initial fetch when taskId changes
  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  return {
    comments,
    isLoading,
    error,
    addComment,
    editComment,
    deleteComment,
    refreshComments,
  }
} 