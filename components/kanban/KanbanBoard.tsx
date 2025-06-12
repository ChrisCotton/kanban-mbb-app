'use client'

import React, { useState, useEffect } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { Task } from '../../lib/database/kanban-queries'
import SwimLane from './SwimLane'
import { useDragAndDrop } from '../../hooks/useDragAndDrop'

interface KanbanBoardProps {
  className?: string
}

interface TasksByStatus {
  backlog: Task[]
  todo: Task[]
  doing: Task[]
  done: Task[]
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ className = '' }) => {
  const [tasks, setTasks] = useState<TasksByStatus>({
    backlog: [],
    todo: [],
    doing: [],
    done: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/kanban/tasks')
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
  }

  const handleTaskMove = async (taskId: string, newStatus: Task['status'], newOrderIndex: number) => {
    try {
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

      // Refresh tasks to get the latest state from server
      await fetchTasks()
    } catch (err) {
      console.error('Error moving task:', err)
      setError('Failed to move task')
      // Re-throw to let useDragAndDrop handle the error
      throw err
    }
  }

  const handleOptimisticUpdate = (updatedTasks: TasksByStatus) => {
    setTasks(updatedTasks)
  }

  // Initialize drag and drop hook
  const {
    dragDropState,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd
  } = useDragAndDrop({
    tasks,
    onTaskMove: handleTaskMove,
    onOptimisticUpdate: handleOptimisticUpdate
  })

  const handleTaskCreate = async (taskData: Partial<Task>) => {
    try {
      const response = await fetch('/api/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      // Refresh tasks
      await fetchTasks()
    } catch (err) {
      console.error('Error creating task:', err)
      setError('Failed to create task')
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
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

      // Refresh tasks
      await fetchTasks()
    } catch (err) {
      console.error('Error updating task:', err)
      setError('Failed to update task')
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      // Refresh tasks
      await fetchTasks()
    } catch (err) {
      console.error('Error deleting task:', err)
      setError('Failed to delete task')
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading kanban board...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Board
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchTasks}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <DragDropContext
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      <div className={`kanban-board ${className}`}>
        {/* Board Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Kanban Board
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your tasks across four swim lanes
          </p>
          
          {/* Drag status indicator */}
          {dragDropState.isDragging && (
            <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
              Moving task from {dragDropState.sourceStatus} to {dragDropState.destinationStatus}...
            </div>
          )}
        </div>

        {/* Swim Lanes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-96">
          <SwimLane
            title="Backlog"
            status="backlog"
            tasks={tasks.backlog}
            onTaskMove={handleTaskMove}
            onTaskCreate={handleTaskCreate}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            color="gray"
          />
          
          <SwimLane
            title="To Do"
            status="todo"
            tasks={tasks.todo}
            onTaskMove={handleTaskMove}
            onTaskCreate={handleTaskCreate}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            color="blue"
          />
          
          <SwimLane
            title="Doing"
            status="doing"
            tasks={tasks.doing}
            onTaskMove={handleTaskMove}
            onTaskCreate={handleTaskCreate}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            color="yellow"
          />
          
          <SwimLane
            title="Done"
            status="done"
            tasks={tasks.done}
            onTaskMove={handleTaskMove}
            onTaskCreate={handleTaskCreate}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            color="green"
          />
        </div>

        {/* Task Statistics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-600">{tasks.backlog.length}</div>
            <div className="text-sm text-gray-500">Backlog</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{tasks.todo.length}</div>
            <div className="text-sm text-gray-500">To Do</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{tasks.doing.length}</div>
            <div className="text-sm text-gray-500">Doing</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{tasks.done.length}</div>
            <div className="text-sm text-gray-500">Done</div>
          </div>
        </div>
      </div>
    </DragDropContext>
  )
}

export default KanbanBoard 