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
  color
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
          <h2 className={`font-semibold text-sm sm:text-base ${colors.headerText}`}>
            {title}
          </h2>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Lane Content with Droppable */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-b-lg border-l border-r border-b border-gray-200 dark:border-gray-700 min-h-88 sm:min-h-96 transition-all duration-200 ${
              snapshot.isDraggingOver ? colors.dropZone : ''
            }`}
          >
            {/* Tasks */}
            <div className="space-y-2 sm:space-y-3">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onTaskMove={onTaskMove}
                  onTaskEdit={onTaskEdit}
                  onTaskView={onTaskView}
                />
              ))}
              {provided.placeholder}
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
            <div className="mt-3 sm:mt-4">
              {onOpenCreateModal ? (
                <button
                  onClick={onOpenCreateModal}
                  className={`w-full p-2 sm:p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg ${colors.addButton} hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center space-x-2`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm">Add Task</span>
                </button>
              ) : showAddTask ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter task title..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddTask}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddTask(false)
                        setNewTaskTitle('')
                      }}
                      className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddTask(true)}
                  className={`w-full p-2 sm:p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg ${colors.addButton} hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex items-center justify-center space-x-2`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm">Add Task</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  )
}

export default SwimLane