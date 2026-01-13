'use client'

import React, { useState, useCallback } from 'react'
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
import { useTaskSearch } from '../../hooks/useTaskSearch'
import SearchAndFilter, { SearchFilters } from './SearchAndFilter'

interface KanbanBoardProps {
  className?: string
  onStartTiming?: (task: Task) => void
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ className = '', onStartTiming }) => {
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

  // Search functionality
  const {
    organizedResults: searchResults,
    searchStats,
    isSearching,
    searchError,
    activeFilters,
    isSearchMode,
    hasActiveFilters,
    performSearch,
    clearSearch,
    clearError: clearSearchError
  } = useTaskSearch({
    onError: (error) => console.error('Search error:', error)
  })

  // Use search results when in search mode, otherwise use regular tasks
  const displayTasks = isSearchMode ? searchResults : tasks
  const displayStats = isSearchMode ? searchStats : stats

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
    
    // Refresh search results if in search mode
    if (isSearchMode && hasActiveFilters) {
      await performSearch(activeFilters)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    await updateTask(taskId, updates)
    
    // Update the viewing task if it's the same task being updated
    if (viewingTask && viewingTask.id === taskId) {
      setViewingTask(prev => prev ? { ...prev, ...updates } : null)
    }
    
    // Refresh search results if in search mode
    if (isSearchMode && hasActiveFilters) {
      await performSearch(activeFilters)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask(taskId)
    
    // Refresh search results if in search mode
    if (isSearchMode && hasActiveFilters) {
      await performSearch(activeFilters)
    }
  }

  // Search handlers (memoized to prevent infinite re-renders)
  const handleSearch = useCallback(async (filters: SearchFilters) => {
    await performSearch(filters)
  }, [performSearch])

  const handleClearSearch = useCallback(() => {
    clearSearch()
  }, [clearSearch])

  // Initialize drag and drop hook
  const {
    dragDropState,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd
  } = useDragAndDrop({
    tasks: displayTasks,
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
        
        // Refresh search results if in search mode
        if (isSearchMode && hasActiveFilters) {
          await performSearch(activeFilters)
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
      
      // Refresh search results if in search mode
      if (isSearchMode && hasActiveFilters) {
        await performSearch(activeFilters)
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
    
    // Refresh search results if in search mode
    if (isSearchMode && hasActiveFilters) {
      await performSearch(activeFilters)
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
        
        // Refresh search results if in search mode
        if (isSearchMode && hasActiveFilters) {
          await performSearch(activeFilters)
        }
      } catch (error) {
        // Error is already handled by the hook
        console.error('Delete failed:', error)
      }
    }
  }

  // Enhanced task delete wrapper with confirmation
  const handleTaskDeleteWithConfirm = async (taskId: string) => {
    const allTasks = Object.values(displayTasks).flat()
    const task = allTasks.find(t => t.id === taskId)
    if (task) {
      openDeleteConfirm(task)
    }
  }

  // Retry function for error handling
  const handleRetry = () => {
    clearError()
    clearSearchError()
    if (isSearchMode && hasActiveFilters) {
      performSearch(activeFilters)
    } else {
      refetchTasks()
    }
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
    
    // Refresh search results if in search mode
    if (isSearchMode && hasActiveFilters) {
      await performSearch(activeFilters)
    }
  }

  const handleBulkPriorityChange = async (priority: Task['priority']) => {
    const updates = { priority }
    for (const taskId of selectedTaskIds) {
      await updateTask(taskId, updates)
    }
    clearSelection()
    
    // Refresh search results if in search mode
    if (isSearchMode && hasActiveFilters) {
      await performSearch(activeFilters)
    }
  }

  const handleSelectAll = () => {
    const allTaskIds = Object.values(displayTasks).flat().map(task => task.id)
    selectAllTasks(allTaskIds)
  }

  const handleToggleTaskSelection = (taskId: string, shiftKey: boolean) => {
    const allTasks = Object.values(displayTasks).flat()
    toggleTaskSelection(taskId, shiftKey, allTasks)
  }

  const getSelectedTasks = (): Task[] => {
    const allTasks = Object.values(displayTasks).flat()
    return allTasks.filter(task => selectedTaskIds.includes(task.id))
  }

  const totalTaskCount = Object.values(displayTasks).flat().length
  const isAllSelected = selectedCount === totalTaskCount && totalTaskCount > 0

  const currentError = error || searchError
  const currentIsLoading = isLoading || isSearching

  if (currentIsLoading && !isSearchMode) {
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

  if (currentError && !isSearchMode) {
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
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{currentError}</p>
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
        {/* Search and Filter Component */}
        <SearchAndFilter
          onSearch={handleSearch}
          onClear={handleClearSearch}
          isLoading={isSearching}
          className="mb-6"
        />

        {/* Board Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
            {isSearchMode ? 'Search Results' : 'Kanban Board'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            {isSearchMode 
              ? `Found ${displayStats.total} task${displayStats.total !== 1 ? 's' : ''} matching your search`
              : 'Manage your tasks across four swim lanes'
            }
          </p>
          
          {/* Task stats display */}
          <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Total tasks: {displayStats.total} • Completed: {displayStats.done} • In progress: {displayStats.doing}
          </div>
          
          {/* Search error display */}
          {searchError && (
            <div className="mt-2 text-xs sm:text-sm text-red-600 dark:text-red-400">
              Search error: {searchError}
            </div>
          )}
          
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
            tasks={displayTasks.backlog}
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
            tasks={displayTasks.todo}
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
            tasks={displayTasks.doing}
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
            tasks={displayTasks.done}
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
            <div className="text-xl sm:text-2xl font-bold text-gray-600">{displayStats.backlog}</div>
            <div className="text-xs sm:text-sm text-gray-500">Backlog</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{displayStats.todo}</div>
            <div className="text-xs sm:text-sm text-gray-500">To Do</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{displayStats.doing}</div>
            <div className="text-xs sm:text-sm text-gray-500">Doing</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{displayStats.done}</div>
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
          allTasks={displayTasks}
          onStartTiming={onStartTiming}
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
              
              // Refresh search results if in search mode
              if (isSearchMode && hasActiveFilters) {
                await performSearch(activeFilters)
              }
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete Task
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete "{taskToDelete.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
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