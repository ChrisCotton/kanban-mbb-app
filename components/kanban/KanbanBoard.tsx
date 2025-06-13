'use client'

import React, { useState } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { Task } from '../../lib/database/kanban-queries'
import SwimLane from './SwimLane'
import TaskModal from './TaskModal'
import TaskDetailModal from './TaskDetailModal'
import BulkActionsToolbar from './BulkActionsToolbar'
import BulkDeleteConfirmDialog from './BulkDeleteConfirmDialog'
import { useDragAndDrop } from '../../hooks/useDragAndDrop'
import { useKanban } from '../../hooks/useKanban'
import { useMultiSelect } from '../../hooks/useMultiSelect'

interface KanbanBoardProps {
  className?: string
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ className = '' }) => {
  // Use centralized kanban hook for all task management
  const {
    tasks,
    isLoading,
    error,
    stats,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    clearError,
    refetchTasks
  } = useKanban()

  // Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [modalInitialStatus, setModalInitialStatus] = useState<Task['status']>('backlog')

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  // Task detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)

  // Bulk delete confirmation state
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Handle optimistic updates for drag and drop
  const handleOptimisticUpdate = (updatedTasks: typeof tasks) => {
    // For now, we'll rely on the server state and refetch
    // Could implement optimistic updates later for better UX
  }

  // Wrapper functions to match SwimLane interface expectations
  const handleTaskMove = async (taskId: string, newStatus: Task['status'], newOrderIndex: number) => {
    await moveTask(taskId, newStatus, newOrderIndex)
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    await updateTask(taskId, updates)
    
    // Update the viewing task if it's the same task being updated
    if (viewingTask && viewingTask.id === taskId) {
      setViewingTask(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask(taskId)
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

  // Initialize multi-select hook
  const {
    selectedTaskIds,
    selectedCount,
    isMultiSelectMode,
    toggleMultiSelectMode,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    isTaskSelected
  } = useMultiSelect({
    onBulkDelete: async (taskIds: string[]) => {
      setIsBulkDeleting(true)
      try {
        // Delete tasks one by one
        for (const taskId of taskIds) {
          await deleteTask(taskId)
        }
      } finally {
        setIsBulkDeleting(false)
        setIsBulkDeleteDialogOpen(false)
      }
    },
    onBulkUpdate: async (taskIds: string[], updates: Partial<Task>) => {
      // Update tasks one by one
      for (const taskId of taskIds) {
        await updateTask(taskId, updates)
      }
    }
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

  // Task detail modal management
  const openDetailModal = (task: Task) => {
    setViewingTask(task)
    setIsDetailModalOpen(true)
  }

  const closeDetailModal = () => {
    setIsDetailModalOpen(false)
    setViewingTask(null)
  }

  const handleModalSave = async (taskData: Partial<Task>) => {
    if (editingTask) {
      // Updating existing task
      await updateTask(editingTask.id, taskData)
    } else {
      // Creating new task
      await createTask(taskData)
    }
  }

  // Delete confirmation functions
  const openDeleteConfirm = (task: Task) => {
    setTaskToDelete(task)
    setDeleteConfirmOpen(true)
  }

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false)
    setTaskToDelete(null)
  }

  const handleConfirmDelete = async () => {
    if (taskToDelete) {
      try {
        await deleteTask(taskToDelete.id)
        closeDeleteConfirm()
      } catch (error) {
        // Error is already handled by the hook
        console.error('Delete failed:', error)
      }
    }
  }

  // Enhanced task delete wrapper with confirmation
  const handleTaskDeleteWithConfirm = async (taskId: string) => {
    const task = Object.values(tasks).flat().find(t => t.id === taskId)
    if (task) {
      openDeleteConfirm(task)
    }
  }

  // Retry function for error handling
  const handleRetry = () => {
    clearError()
    refetchTasks()
  }

  // Multi-select handlers
  const handleBulkDelete = () => {
    setIsBulkDeleteDialogOpen(true)
  }

  const handleBulkMove = async (status: Task['status']) => {
    const updates = { status }
    for (const taskId of selectedTaskIds) {
      await updateTask(taskId, updates)
    }
    clearSelection()
  }

  const handleBulkPriorityChange = async (priority: Task['priority']) => {
    const updates = { priority }
    for (const taskId of selectedTaskIds) {
      await updateTask(taskId, updates)
    }
    clearSelection()
  }

  const handleSelectAll = () => {
    const allTaskIds = Object.values(tasks).flat().map(task => task.id)
    selectAllTasks(allTaskIds)
  }

  const handleToggleTaskSelection = (taskId: string, shiftKey: boolean) => {
    const allTasks = Object.values(tasks).flat()
    toggleTaskSelection(taskId, shiftKey, allTasks)
  }

  const getSelectedTasks = (): Task[] => {
    const allTasks = Object.values(tasks).flat()
    return allTasks.filter(task => selectedTaskIds.includes(task.id))
  }

  const totalTaskCount = Object.values(tasks).flat().length
  const isAllSelected = selectedCount === totalTaskCount && totalTaskCount > 0

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
            onClick={handleRetry}
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
          
          {/* Task stats display */}
          <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Total tasks: {stats.total} • Completed: {stats.done} • In progress: {stats.doing}
          </div>
          
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
            onTaskView={openDetailModal}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDeleteWithConfirm}
            color="gray"
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            onToggleTaskSelection={handleToggleTaskSelection}
            onToggleMultiSelectMode={toggleMultiSelectMode}
          />
          
          <SwimLane
            title="To Do"
            status="todo"
            tasks={tasks.todo}
            onTaskMove={handleTaskMove}
            onOpenCreateModal={() => openCreateModal('todo')}
            onTaskEdit={openEditModal}
            onTaskView={openDetailModal}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDeleteWithConfirm}
            color="blue"
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            onToggleTaskSelection={handleToggleTaskSelection}
            onToggleMultiSelectMode={toggleMultiSelectMode}
          />
          
          <SwimLane
            title="Doing"
            status="doing"
            tasks={tasks.doing}
            onTaskMove={handleTaskMove}
            onOpenCreateModal={() => openCreateModal('doing')}
            onTaskEdit={openEditModal}
            onTaskView={openDetailModal}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDeleteWithConfirm}
            color="yellow"
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            onToggleTaskSelection={handleToggleTaskSelection}
            onToggleMultiSelectMode={toggleMultiSelectMode}
          />
          
          <SwimLane
            title="Done"
            status="done"
            tasks={tasks.done}
            onTaskMove={handleTaskMove}
            onOpenCreateModal={() => openCreateModal('done')}
            onTaskEdit={openEditModal}
            onTaskView={openDetailModal}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDeleteWithConfirm}
            color="green"
            isMultiSelectMode={isMultiSelectMode}
            selectedTaskIds={selectedTaskIds}
            onToggleTaskSelection={handleToggleTaskSelection}
            onToggleMultiSelectMode={toggleMultiSelectMode}
          />
        </div>

        {/* Task Statistics */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-gray-600">{stats.backlog}</div>
            <div className="text-xs sm:text-sm text-gray-500">Backlog</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.todo}</div>
            <div className="text-xs sm:text-sm text-gray-500">To Do</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.doing}</div>
            <div className="text-xs sm:text-sm text-gray-500">Doing</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.done}</div>
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

        {/* Task Detail Modal */}
        <TaskDetailModal
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          task={viewingTask}
          onUpdate={handleTaskUpdate}
          onMove={handleTaskMove}
          allTasks={tasks}
        />

        {/* Bulk Actions Toolbar */}
        {isMultiSelectMode && selectedCount > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedCount}
            onBulkDelete={handleBulkDelete}
            onBulkMove={handleBulkMove}
            onBulkPriorityChange={handleBulkPriorityChange}
            onSelectAll={handleSelectAll}
            onClearSelection={clearSelection}
            onExitMultiSelect={toggleMultiSelectMode}
            totalTaskCount={totalTaskCount}
            isAllSelected={isAllSelected}
          />
        )}

        {/* Bulk Delete Confirmation Dialog */}
        <BulkDeleteConfirmDialog
          isOpen={isBulkDeleteDialogOpen}
          onClose={() => setIsBulkDeleteDialogOpen(false)}
          onConfirm={async () => {
            const taskIds = selectedTaskIds
            setIsBulkDeleting(true)
            try {
              for (const taskId of taskIds) {
                await deleteTask(taskId)
              }
              clearSelection()
            } finally {
              setIsBulkDeleting(false)
              setIsBulkDeleteDialogOpen(false)
            }
          }}
          selectedTasks={getSelectedTasks()}
          isDeleting={isBulkDeleting}
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Task
                </h2>
                <button
                  onClick={closeDeleteConfirm}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                      Are you sure you want to delete this task?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>"{taskToDelete.title}"</strong>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      This action cannot be undone. This will permanently delete the task and all associated data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  )
}

export default KanbanBoard 