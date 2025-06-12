import { useState, useEffect } from 'react'

interface SubtaskProgress {
  total: number
  completed: number
  loading: boolean
}

export function useSubtaskProgress(taskId: string): SubtaskProgress {
  const [progress, setProgress] = useState<SubtaskProgress>({
    total: 0,
    completed: 0,
    loading: true
  })

  useEffect(() => {
    const fetchSubtaskProgress = async () => {
      try {
        const response = await fetch(`/api/kanban/tasks/${taskId}/subtasks`)
        const result = await response.json()

        if (response.ok) {
          setProgress({
            total: result.count || 0,
            completed: result.completed || 0,
            loading: false
          })
        } else {
          setProgress({
            total: 0,
            completed: 0,
            loading: false
          })
        }
      } catch (error) {
        console.error('Error fetching subtask progress:', error)
        setProgress({
          total: 0,
          completed: 0,
          loading: false
        })
      }
    }

    fetchSubtaskProgress()
  }, [taskId])

  return progress
} 