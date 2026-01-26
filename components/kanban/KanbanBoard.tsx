'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { Task } from '../../lib/database/kanban-queries'
import { TasksByStatus } from '../../hooks/useKanban'
import SwimLane from './SwimLane'
import TaskModal from './TaskModal'
import TaskDetailModal from './TaskDetailModal'
import BulkActionsToolbar from './BulkActionsToolbar'
import BulkDeleteConfirmDialog from './BulkDeleteConfirmDialog'
import FilterIndicator from './FilterIndicator'
import GoalsHeaderStrip from '../../src/components/goals/GoalsHeaderStrip'
import { useDragAndDrop } from '../../hooks/useDragAndDrop'
import { useKanban } from '../../hooks/useKanban'
import { useMultiSelect } from '../../hooks/useMultiSelect'
import { useTaskSearch } from '../../hooks/useTaskSearch'
import { useGoalsStore } from '../../src/stores/goals.store'
import { supabase } from '../../lib/supabase'
import SearchAndFilter, { SearchFilters } from './SearchAndFilter'

interface KanbanBoardProps {
  className?: string
  onStartTiming?: (task: Task) => void
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ className = '', onStartTiming }) => {
  // Goals store for filtering
  const { goals, activeGoalFilter, setActiveGoalFilter, fetchGoals } = useGoalsStore();
  
  // Fetch goals on mount if not already loaded
  useEffect(() => {
    if (goals.length === 0) {
      fetchGoals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
    refetchTasks,
    fetchTasks
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

  // Optimistic tasks state for instant drag feedback
  const [optimisticTasks, setOptimisticTasks] = useState<TasksByStatus | null>(null)

  const tasksMatchByIdOrder = useCallback((left: TasksByStatus, right: TasksByStatus) => {
    const statuses: Task['status'][] = ['backlog', 'todo', 'doing', 'done']

    return statuses.every(status => {
      const leftIds = left[status].map(task => task.id)
      const rightIds = right[status].map(task => task.id)

      if (leftIds.length !== rightIds.length) return false

      return leftIds.every((id, index) => id === rightIds[index])
    })
  }, [])

  // Clear optimistic state when tasks update from server (after background refetch)
  useEffect(() => {
    if (optimisticTasks !== null) {
      // Only clear optimistic state when server data matches it
      if (tasksMatchByIdOrder(tasks, optimisticTasks)) {
        setOptimisticTasks(null)
      }
    }
  }, [tasks, optimisticTasks, tasksMatchByIdOrder])

  // Handle optimistic updates for drag and drop (memoized to prevent recreation)
  const handleOptimisticUpdate = useCallback((updatedTasks: typeof tasks) => {
    // Apply optimistic UI update immediately for instant feedback
    setOptimisticTasks(updatedTasks)
  }, [])

  // Use optimistic tasks if available (applies to BOTH regular and search modes)
  const tasksToDisplay = optimisticTasks || tasks
  const searchResultsToDisplay = optimisticTasks || searchResults

  // Wrapper functions to match SwimLane interface expectations
  // MEMOIZED to prevent useDragAndDrop from recreating on every render
  const handleTaskMove = useCallback(async (taskId: string, newStatus: Task['status'], newOrderIndex: number) => {
    await moveTask(taskId, newStatus, newOrderIndex)
    
    // DON'T clear optimistic state immediately - let background refetch handle it
    // This prevents the "snap back" effect when fetchTasks returns stale data
    // setOptimisticTasks(null) is called when fetchTasks completes
  }, [moveTask]) // Memoize with dependencies

  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    console.log('🔄 handleTaskUpdate called:', { taskId, updates })
    
    // Call updateTask which will refresh tasks via fetchTasks
    await updateTask(taskId, updates)
    
    // Wait a bit for fetchTasks to complete, then update viewingTask with fresh data
    // This ensures we have the latest data from the server
    setTimeout(async () => {
      if (viewingTask && viewingTask.id === taskId) {
        // Find the updated task from the tasks object
        const allTasks = Object.values(tasks).flat()
        const refreshedTask = allTasks.find(t => t.id === taskId)
        if (refreshedTask) {
          console.log('✅ Updating viewingTask with refreshed data:', refreshedTask)
          setViewingTask(refreshedTask)
        }
      }
    }, 100)
    
    // DON'T refresh search on every update - let natural refetch handle it
    // if (isSearchMode && hasActiveFilters) {
    //   await performSearch(activeFilters)
    // }
  }, [updateTask, viewingTask, tasks]) // Memoized

  const handleTaskDelete = useCallback(async (taskId: string) => {
    await deleteTask(taskId)
    
    // Search results will update naturally on next refetch
    // if (isSearchMode && hasActiveFilters) {
    //   await performSearch(activeFilters)
    // }
  }, [deleteTask]) // Memoized

  // Search handlers (memoized to prevent infinite re-renders)
  const handleSearch = useCallback(async (filters: SearchFilters) => {
    await performSearch(filters)
  }, [performSearch])

  const handleClearSearch = useCallback(() => {
    clearSearch()
  }, [clearSearch])

  // Calculate displayTasksForRender BEFORE using it in hooks
  // Use tasks directly (already filtered server-side by goal_id if activeGoalFilter is set)
  // In search mode, use searchResults instead
  // Apply optimistic updates if available
  const displayTasksForRender: TasksByStatus = useMemo(() => {
    return isSearchMode 
      ? (searchResultsToDisplay || {
          backlog: [],
          todo: [],
          doing: [],
          done: [],
        })
      : (tasksToDisplay || tasks);
  }, [isSearchMode, searchResultsToDisplay, tasksToDisplay, tasks]);

  // Initialize drag and drop hook
  const {
    dragDropState,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd
  } = useDragAndDrop({
    tasks: displayTasksForRender as TasksByStatus,
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
    // Always get the latest version of the task from the tasks object
    // This ensures we have the most up-to-date data including description
    const allTasks = Object.values(tasks).flat()
    const latestTask = allTasks.find(t => t.id === task.id) || task
    console.log('📂 Opening task detail modal:', {
      taskId: latestTask.id,
      title: latestTask.title,
      hasDescription: !!latestTask.description,
      descriptionLength: latestTask.description?.length || 0
    })
    setViewingTask(latestTask)
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
      const createdTask = await createTask(taskData)
      
      // If goal filter is active, auto-link the new task to the goal
      if (activeGoalFilter && createdTask) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const linkResponse = await fetch(`/api/goals/${activeGoalFilter}/tasks`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                user_id: session.user.id,
                task_id: createdTask.id,
                contribution_weight: 1,
              }),
            });
            
            if (!linkResponse.ok) {
              console.error('Error linking task to goal:', await linkResponse.text());
            }
          }
        } catch (error) {
          console.error('Error linking task to goal:', error);
        }
      }
    }
    
    // Refresh tasks to reflect any changes
    refetchTasks();
    
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
    const allTasks = Object.values(displayTasksForRender).flat()
    const task = allTasks.find((t: Task) => t.id === taskId)
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
    const allTaskIds = Object.values(displayTasksForRender).flat().map((task: Task) => task.id)
    selectAllTasks(allTaskIds)
  }

  const handleToggleTaskSelection = (taskId: string, shiftKey: boolean) => {
    const allTasks = Object.values(displayTasksForRender).flat() as Task[]
    toggleTaskSelection(taskId, shiftKey, allTasks)
  }

  const getSelectedTasks = (): Task[] => {
    const allTasks = Object.values(displayTasksForRender).flat() as Task[]
    return allTasks.filter((task: Task) => selectedTaskIds.includes(task.id))
  }

  // Handle goal filter changes - MUST be before early returns
  const handleGoalClick = useCallback(async (goalId: string) => {
    // Toggle filter: if clicking the same goal, clear filter
    const newFilter = activeGoalFilter === goalId ? null : goalId;
    setActiveGoalFilter(newFilter);
    // Refetch tasks - the hook will handle filtering via API
    refetchTasks();
  }, [activeGoalFilter, setActiveGoalFilter, refetchTasks]);

  const handleClearGoalFilter = useCallback(async () => {
    setActiveGoalFilter(null);
    refetchTasks();
  }, [setActiveGoalFilter, refetchTasks]);

  // Refetch tasks when goal filter changes (modify useKanban hook to accept goal_id)
  useEffect(() => {
    if (!isSearchMode) {
      // Fetch tasks with goal filter if active
      const fetchFilteredTasks = async () => {
        const url = activeGoalFilter 
          ? `/api/kanban/tasks?goal_id=${activeGoalFilter}`
          : '/api/kanban/tasks';
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Update tasks state manually
            const tasksByStatus: TasksByStatus = {
              backlog: [],
              todo: [],
              doing: [],
              done: []
            };
            result.data.forEach((task: Task) => {
              if (tasksByStatus[task.status]) {
                tasksByStatus[task.status].push(task);
              }
            });
            Object.keys(tasksByStatus).forEach(status => {
              tasksByStatus[status as Task['status']].sort((a, b) => a.order_index - b.order_index);
            });
            // Note: This won't update the hook's state directly, but refetchTasks will
            refetchTasks();
          }
        }
      };
      fetchFilteredTasks();
    }
  }, [activeGoalFilter, isSearchMode, refetchTasks]);

  // Get active goal for filter indicator - MUST be before early returns
  const activeGoal = activeGoalFilter 
    ? goals.find((g) => g.id === activeGoalFilter) || null
    : null;

  // Calculate filtered stats - MUST be before early returns
  const displayStatsForRender = useMemo(() => {
    return isSearchMode ? searchStats : {
      total: Object.values(displayTasksForRender).flat().length,
      backlog: displayTasksForRender.backlog.length,
      todo: displayTasksForRender.todo.length,
      doing: displayTasksForRender.doing.length,
      done: displayTasksForRender.done.length,
    };
  }, [isSearchMode, searchStats, displayTasksForRender]);

  const totalTaskCount = Object.values(displayTasksForRender).flat().length
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
        {/* Goals Header Strip */}
        <GoalsHeaderStrip
          goals={goals.filter((g) => g.status === 'active')}
          activeGoalId={activeGoalFilter}
          onGoalClick={handleGoalClick}
          className="mb-4"
        />

        {/* Filter Indicator */}
        {activeGoal && !isSearchMode && (
          <FilterIndicator goal={activeGoal} onClear={handleClearGoalFilter} />
        )}

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
              ? `Found ${displayStatsForRender.total} task${displayStatsForRender.total !== 1 ? 's' : ''} matching your search`
              : 'Manage your tasks across four swim lanes'
            }
          </p>
          
          {/* Task stats display */}
          <div className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Total tasks: {displayStatsForRender.total} • Completed: {displayStatsForRender.done} • In progress: {displayStatsForRender.doing}
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
            tasks={displayTasksForRender.backlog}
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
            tasks={displayTasksForRender.todo}
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
            tasks={displayTasksForRender.doing}
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
            tasks={displayTasksForRender.done}
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
            <div className="text-xl sm:text-2xl font-bold text-gray-600">{displayStatsForRender.backlog}</div>
            <div className="text-xs sm:text-sm text-gray-500">Backlog</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{displayStatsForRender.todo}</div>
            <div className="text-xs sm:text-sm text-gray-500">To Do</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{displayStatsForRender.doing}</div>
            <div className="text-xs sm:text-sm text-gray-500">Doing</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{displayStatsForRender.done}</div>
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
          allTasks={displayTasksForRender}
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