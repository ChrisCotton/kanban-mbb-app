import { useState, useCallback } from 'react'
import { DropResult, DragStart, DragUpdate } from '@hello-pangea/dnd'
import { Task } from '../lib/database/kanban-queries'

export interface DragDropState {
  isDragging: boolean
  draggedTaskId: string | null
  sourceStatus: Task['status'] | null
  destinationStatus: Task['status'] | null
}

export interface UseDragAndDropProps {
  tasks: Record<Task['status'], Task[]>
  onTaskMove: (taskId: string, newStatus: Task['status'], newOrderIndex: number) => Promise<void>
  onOptimisticUpdate?: (tasks: Record<Task['status'], Task[]>) => void
}

export interface UseDragAndDropReturn {
  dragDropState: DragDropState
  handleDragStart: (start: DragStart) => void
  handleDragUpdate: (update: DragUpdate) => void
  handleDragEnd: (result: DropResult) => Promise<void>
  reorderTasksInColumn: (columnId: string, tasks: Task[]) => Task[]
  moveTaskBetweenColumns: (
    source: { droppableId: string; index: number },
    destination: { droppableId: string; index: number },
    tasks: Record<Task['status'], Task[]>
  ) => Record<Task['status'], Task[]>
}

/**
 * Custom hook for managing drag and drop functionality in the kanban board
 */
export const useDragAndDrop = ({
  tasks,
  onTaskMove,
  onOptimisticUpdate
}: UseDragAndDropProps): UseDragAndDropReturn => {
  const [dragDropState, setDragDropState] = useState<DragDropState>({
    isDragging: false,
    draggedTaskId: null,
    sourceStatus: null,
    destinationStatus: null
  })

  /**
   * Handle the start of a drag operation
   */
  const handleDragStart = useCallback((start: DragStart) => {
    const sourceColumn = start.source.droppableId as Task['status']
    
    setDragDropState({
      isDragging: true,
      draggedTaskId: start.draggableId,
      sourceStatus: sourceColumn,
      destinationStatus: sourceColumn
    })
  }, [])

  /**
   * Handle drag updates (when hovering over different drop zones)
   */
  const handleDragUpdate = useCallback((update: DragUpdate) => {
    const destinationColumn = update.destination?.droppableId as Task['status'] | null
    
    setDragDropState(prev => ({
      ...prev,
      destinationStatus: destinationColumn || prev.sourceStatus
    }))
  }, [])

  /**
   * Reorder tasks within the same column
   */
  const reorderTasksInColumn = useCallback((columnId: string, columnTasks: Task[]): Task[] => {
    return columnTasks.map((task, index) => ({
      ...task,
      order_index: index
    }))
  }, [])

  /**
   * Move task between different columns
   */
  const moveTaskBetweenColumns = useCallback((
    source: { droppableId: string; index: number },
    destination: { droppableId: string; index: number },
    currentTasks: Record<Task['status'], Task[]>
  ): Record<Task['status'], Task[]> => {
    const sourceColumn = source.droppableId as Task['status']
    const destColumn = destination.droppableId as Task['status']
    
    const sourceItems = Array.from(currentTasks[sourceColumn])
    const destItems = sourceColumn === destColumn ? sourceItems : Array.from(currentTasks[destColumn])
    
    // Remove from source
    const [movedTask] = sourceItems.splice(source.index, 1)
    
    // Update the task status if moving between columns
    const updatedTask = sourceColumn !== destColumn 
      ? { ...movedTask, status: destColumn }
      : movedTask
    
    // Add to destination
    destItems.splice(destination.index, 0, updatedTask)
    
    // Update order indexes
    const updatedSourceItems = reorderTasksInColumn(sourceColumn, sourceItems)
    const updatedDestItems = reorderTasksInColumn(destColumn, destItems)
    
    return {
      ...currentTasks,
      [sourceColumn]: updatedSourceItems,
      [destColumn]: updatedDestItems
    }
  }, [reorderTasksInColumn])

  /**
   * Handle the end of a drag operation
   */
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Reset drag state
    setDragDropState({
      isDragging: false,
      draggedTaskId: null,
      sourceStatus: null,
      destinationStatus: null
    })

    // If no destination, do nothing
    if (!destination) {
      return
    }

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    try {
      // Perform optimistic update if callback provided
      if (onOptimisticUpdate) {
        const optimisticTasks = moveTaskBetweenColumns(source, destination, tasks)
        onOptimisticUpdate(optimisticTasks)
      }

      // Persist changes to backend
      const newStatus = destination.droppableId as Task['status']
      await onTaskMove(draggableId, newStatus, destination.index)

    } catch (error) {
      console.error('Failed to move task:', error)
      
      // Revert optimistic update on error if callback provided
      if (onOptimisticUpdate) {
        onOptimisticUpdate(tasks)
      }
      
      // You might want to show a toast notification here
      throw error
    }
  }, [tasks, onTaskMove, onOptimisticUpdate, moveTaskBetweenColumns])

  return {
    dragDropState,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    reorderTasksInColumn,
    moveTaskBetweenColumns
  }
}

export default useDragAndDrop 