'use client'

import React, { useState, useEffect } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { Task } from '../../lib/database/kanban-queries'
import SwimLane from './SwimLane'
import TaskModal from './TaskModal'
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
  
  // Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [modalInitialStatus, setModalInitialStatus] = useState<Task['status']>('backlog')

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

  // Modal management functions
  const openCreateModal = (status: Task['status']) => {
    setEditingTask(null)
    setModalInitialStatus(status)
    setIsModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setModalInitialStatus(task.status)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTask(null)
    setModalInitialStatus('backlog')
  }

  const handleModalSave = async (taskData: Partial<Task>) => {
    if (editingTask) {
      // Updating existing task
      await handleTaskUpdate(editingTask.id, taskData)
    } else {
      // Creating new task
      await handleTaskCreate(taskData)
    }
  }

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
      throw err // Re-throw for modal error handling
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
      throw err // Re-throw for modal error handling
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
        <div className="flex flex-col items-center space-y-4 p-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
            <div className="absolute top-0 left-0 animate-ping rounded-full h-10 w-10 sm:h-12 sm:w-12 border border-blue-400 opacity-75"></div>
          </div>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Loading kanban board...</p>
            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Fetching your tasks</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className="text-center p-6 max-w-md mx-auto">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Board
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchTasks}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
            Kanban Board
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Manage your tasks across four swim lanes
          </p>
          
          {/* Drag status indicator */}
          {dragDropState.isDragging && (
            <div className="mt-2 text-xs sm:text-sm text-blue-600 dark:text-blue-400 animate-pulse">
              Moving task from {dragDropState.sourceStatus} to {dragDropState.destinationStatus}...
            </div>
          )}
        </div>

        {/* Swim Lanes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 min-h-96">
          <SwimLane
            title="Backlog"
            status="backlog"
            tasks={tasks.backlog}
            onTaskMove={handleTaskMove}
            onOpenCreateModal={() => openCreateModal('backlog')}
            onTaskEdit={openEditModal}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            color="gray"
          />
          
          <SwimLane
            title="To Do"
            status="todo"
            tasks={tasks.todo}
            onTaskMove={handleTaskMove}
            onOpenCreateModal={() => openCreateModal('todo')}
            onTaskEdit={openEditModal}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            color="blue"
          />
          
          <SwimLane
            title="Doing"
            status="doing"
            tasks={tasks.doing}
            onTaskMove={handleTaskMove}
            onOpenCreateModal={() => openCreateModal('doing')}
            onTaskEdit={openEditModal}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            color="yellow"
          />
          
          <SwimLane
            title="Done"
            status="done"
            tasks={tasks.done}
            onTaskMove={handleTaskMove}
            onOpenCreateModal={() => openCreateModal('done')}
            onTaskEdit={openEditModal}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            color="green"
          />
        </div>

        {/* Task Statistics */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-gray-600">{tasks.backlog.length}</div>
            <div className="text-xs sm:text-sm text-gray-500">Backlog</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{tasks.todo.length}</div>
            <div className="text-xs sm:text-sm text-gray-500">To Do</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{tasks.doing.length}</div>
            <div className="text-xs sm:text-sm text-gray-500">Doing</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{tasks.done.length}</div>
            <div className="text-xs sm:text-sm text-gray-500">Done</div>
          </div>
        </div>

        {/* Task Modal */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleModalSave}
          task={editingTask}
          initialStatus={modalInitialStatus}
        />
      </div>
    </DragDropContext>
  )
}

export default KanbanBoard 