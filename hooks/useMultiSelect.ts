import { useState, useCallback, useEffect } from 'react'
import { Task } from '../lib/database/kanban-queries'

interface UseMultiSelectOptions {
  onBulkDelete?: (taskIds: string[]) => Promise<void>
  onBulkUpdate?: (taskIds: string[], updates: Partial<Task>) => Promise<void>
}

export const useMultiSelect = (options: UseMultiSelectOptions = {}) => {
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  // Toggle multi-select mode
  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => !prev)
    if (isMultiSelectMode) {
      // Clear selections when exiting multi-select mode
      setSelectedTaskIds(new Set())
      setLastSelectedId(null)
    }
  }, [isMultiSelectMode])

  // Select/deselect a single task
  const toggleTaskSelection = useCallback((taskId: string, shiftKey = false, allTasks: Task[] = []) => {
    setSelectedTaskIds(prev => {
      const newSelected = new Set(prev)
      
      if (shiftKey && lastSelectedId && allTasks.length > 0) {
        // Handle shift+click for range selection
        const lastIndex = allTasks.findIndex(task => task.id === lastSelectedId)
        const currentIndex = allTasks.findIndex(task => task.id === taskId)
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex)
          const end = Math.max(lastIndex, currentIndex)
          
          for (let i = start; i <= end; i++) {
            newSelected.add(allTasks[i].id)
          }
        }
      } else {
        // Regular toggle
        if (newSelected.has(taskId)) {
          newSelected.delete(taskId)
        } else {
          newSelected.add(taskId)
        }
      }
      
      return newSelected
    })
    
    setLastSelectedId(taskId)
  }, [lastSelectedId])

  // Select all tasks
  const selectAllTasks = useCallback((taskIds: string[]) => {
    setSelectedTaskIds(new Set(taskIds))
  }, [])

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set())
    setLastSelectedId(null)
  }, [])

  // Check if a task is selected
  const isTaskSelected = useCallback((taskId: string) => {
    return selectedTaskIds.has(taskId)
  }, [selectedTaskIds])

  // Get selected task count
  const selectedCount = selectedTaskIds.size

  // Bulk operations
  const bulkDelete = useCallback(async () => {
    if (options.onBulkDelete && selectedTaskIds.size > 0) {
      await options.onBulkDelete(Array.from(selectedTaskIds))
      clearSelection()
    }
  }, [selectedTaskIds, options.onBulkDelete, clearSelection])

  const bulkUpdate = useCallback(async (updates: Partial<Task>) => {
    if (options.onBulkUpdate && selectedTaskIds.size > 0) {
      await options.onBulkUpdate(Array.from(selectedTaskIds), updates)
      clearSelection()
    }
  }, [selectedTaskIds, options.onBulkUpdate, clearSelection])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when in multi-select mode
      if (!isMultiSelectMode) return

      if (event.key === 'Escape') {
        setIsMultiSelectMode(false)
        clearSelection()
      } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        // This would need to be called with all available task IDs
        // Will be handled by the component using this hook
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedTaskIds.size > 0) {
          event.preventDefault()
          // Trigger bulk delete confirmation
          // Will be handled by the component using this hook
        }
      }
    }

    if (isMultiSelectMode) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMultiSelectMode, selectedTaskIds.size, clearSelection])

  return {
    // State
    selectedTaskIds: Array.from(selectedTaskIds),
    selectedCount,
    isMultiSelectMode,
    lastSelectedId,

    // Actions
    toggleMultiSelectMode,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    isTaskSelected,

    // Bulk operations
    bulkDelete,
    bulkUpdate
  }
} 