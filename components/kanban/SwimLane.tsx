'use client'

import React, { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { Task } from '../../lib/database/kanban-queries'
import TaskCard from './TaskCard'

interface SwimLaneProps {
  title: string
  status: Task['status']
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: Task['status'], newOrderIndex: number) => void
  onTaskCreate?: (taskData: Partial<Task>) => Promise<void>
  onOpenCreateModal?: () => void
  onTaskEdit?: (task: Task) => void
  onTaskView?: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskDelete?: (taskId: string) => Promise<void>
  color: 'gray' | 'blue' | 'yellow' | 'green'
  isDraggingOver?: boolean
  // Multi-select props
  isMultiSelectMode?: boolean
  selectedTaskIds?: string[]
  onToggleTaskSelection?: (taskId: string, shiftKey: boolean) => void
  onToggleMultiSelectMode?: () => void
}

const colorClasses = {
  gray: {
    header: 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600',
    headerText: 'text-gray-800 dark:text-gray-200',
    badge: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
    addButton: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
    dropZone: 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
  },
  blue: {
    header: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    headerText: 'text-blue-800 dark:text-blue-200',
    badge: 'bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-300',
    addButton: 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200',
    dropZone: 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/10'
  },
  yellow: {
    header: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
    headerText: 'text-yellow-800 dark:text-yellow-200',
    badge: 'bg-yellow-200 dark:bg-yellow-700 text-yellow-700 dark:text-yellow-300',
    addButton: 'text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-200',
    dropZone: 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
  },
  green: {
    header: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    headerText: 'text-green-800 dark:text-green-200',
    badge: 'bg-green-200 dark:bg-green-700 text-green-700 dark:text-green-300',
    addButton: 'text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200',
    dropZone: 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
  }
}

const SwimLane: React.FC<SwimLaneProps> = ({
  title,
  status,
  tasks,
  onTaskMove,
  onTaskCreate,
  onOpenCreateModal,
  onTaskEdit,
  onTaskView,
  onTaskUpdate,
  onTaskDelete,
  color,
  isMultiSelectMode = false,
  selectedTaskIds = [],
  onToggleTaskSelection,
  onToggleMultiSelectMode
}) => {
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const colors = colorClasses[color]

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      if (onTaskCreate) {
        await onTaskCreate({
          title: newTaskTitle.trim(),
          status: status,
          order_index: tasks.length
        })
      } else {
        const response = await fetch('/api/kanban/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newTaskTitle.trim(),
            status: status,
            order_index: tasks.length
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create task')
        }
      }

      setNewTaskTitle('')
      setShowAddTask(false)
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask()
    } else if (e.key === 'Escape') {
      setShowAddTask(false)
      setNewTaskTitle('')
    }
  }

  return (
    <div className="swim-lane flex flex-col h-full">
      {/* Lane Header */}
      <div className={`p-3 sm:p-4 rounded-t-lg border-b ${colors.header}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className={`font-semibold text-sm sm:text-base ${colors.headerText}`}>
              {title}
            </h2>
            {/* Multi-select toggle button */}
            {onToggleMultiSelectMode && tasks.length > 0 && (
              <button
                onClick={onToggleMultiSelectMode}
                className={`p-1 rounded transition-colors ${
                  isMultiSelectMode 
                    ? 'bg-blue-600 text-white' 
                    : `${colors.addButton} hover:bg-gray-200 dark:hover:bg-gray-600`
                }`}
                title={isMultiSelectMode ? 'Exit multi-select mode' : 'Enter multi-select mode'}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
            {tasks.length > 10 ? `10 of ${tasks.length}` : tasks.length}
          </span>
        </div>
      </div>

      {/* Lane Content with Droppable */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col flex-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-b-lg border-l border-r border-b border-gray-200 dark:border-gray-700 transition-all duration-200 min-h-[100px] ${
              snapshot.isDraggingOver ? colors.dropZone : ''
            }`}
          >
            {/* Tasks Container with Scrolling */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent py-2 px-1">
              <div className="space-y-2 sm:space-y-3">
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onTaskMove={onTaskMove}
                    onTaskEdit={onTaskEdit}
                    onTaskView={onTaskView}
                    onTaskDelete={onTaskDelete}
                    isMultiSelectMode={isMultiSelectMode}
                    isSelected={selectedTaskIds.includes(task.id)}
                    onToggleSelection={onToggleTaskSelection}
                  />
                ))}
                {provided.placeholder}
              </div>
            </div>

            {/* Empty state */}
            {tasks.length === 0 && !showAddTask && (
              <div className="flex items-center justify-center h-24 sm:h-32 text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-4.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-xs sm:text-sm">No tasks in {title.toLowerCase()}</p>
                </div>
              </div>
            )}

            {/* Add Task Section */}
            {!showAddTask && ( // Only show if not adding
              <div className="">
                <button
                  onClick={onOpenCreateModal || (() => setShowAddTask(true))}
                  className={`w-full flex items-center justify-center p-2 rounded-lg border-2 border-dashed ${colors.addButton} transition-colors`}
                  title="Add new task"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Task
                </button>
              </div>
            )}
            {showAddTask && (
              <div className="flex flex-col space-y-2">
                <textarea
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter task title..."
                  className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddTask}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export default SwimLane