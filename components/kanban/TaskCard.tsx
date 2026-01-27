'use client'

import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Task, TaskWithCategory } from '../../lib/database/kanban-queries'
import PrioritySelector from '../ui/PrioritySelector'
import { useSubtaskProgress } from '../../hooks/useSubtaskProgress'
import { formatCurrency } from '../../lib/utils/currency-formatter'
import { parseLocalDate } from '../../lib/utils/date-helpers'

interface TaskCardProps {
  task: TaskWithCategory
  index: number
  onTaskMove?: (taskId: string, newStatus: Task['status'], newOrderIndex: number) => void
  onTaskEdit?: (task: TaskWithCategory) => void
  onTaskView?: (task: TaskWithCategory) => void
  onTaskDelete?: (taskId: string) => void
  // Multi-select props
  isMultiSelectMode?: boolean
  isSelected?: boolean
  onToggleSelection?: (taskId: string, shiftKey: boolean) => void
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  index, 
  onTaskEdit, 
  onTaskView, 
  onTaskDelete,
  isMultiSelectMode = false,
  isSelected = false,
  onToggleSelection
}) => {
  const { total, completed, loading } = useSubtaskProgress(task.id)

  const formatDate = (dateString: string) => {
    // Use parseLocalDate to avoid timezone shifts
    const date = parseLocalDate(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = (dueDateString: string) => {
    // Use parseLocalDate to avoid timezone shifts
    const dueDate = parseLocalDate(dueDateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate.getTime() < today.getTime()
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('develop') || name.includes('code') || name.includes('programming')) return '💻'
    if (name.includes('design') || name.includes('ui') || name.includes('ux')) return '🎨'
    if (name.includes('research') || name.includes('analysis')) return '🔍'
    if (name.includes('meeting') || name.includes('discussion')) return '🗣️'
    if (name.includes('writing') || name.includes('content')) return '✍️'
    if (name.includes('marketing') || name.includes('promotion')) return '📢'
    if (name.includes('admin') || name.includes('management')) return '📋'
    return '📁'
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (isMultiSelectMode && onToggleSelection) {
      e.preventDefault()
      e.stopPropagation()
      onToggleSelection(task.id, e.shiftKey)
    } else if (onTaskView) {
      onTaskView(task)
    } else if (onTaskEdit) {
      onTaskEdit(task)
    }
  }

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isMultiSelectMode}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...(!isMultiSelectMode ? provided.dragHandleProps : {})}
          onClick={handleCardClick}
          className={`bg-white dark:bg-gray-700 rounded-lg shadow-sm border transition-all duration-200 select-none group relative ${
            isSelected 
              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 ring-opacity-30 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-200 dark:border-gray-600'
          } ${
            snapshot.isDragging 
              ? 'opacity-90 rotate-1 scale-105 shadow-lg ring-2 ring-blue-400 ring-opacity-60' 
              : 'hover:shadow-md'
          } ${
            snapshot.isDropAnimating ? 'transition-transform duration-200' : ''
          } ${
            isMultiSelectMode 
              ? 'cursor-pointer hover:ring-1 hover:ring-blue-300 hover:ring-opacity-50' 
              : 'cursor-move'
          } ${
            !isMultiSelectMode && (onTaskView || onTaskEdit) ? 'hover:ring-1 hover:ring-blue-300 hover:ring-opacity-50' : ''
          } p-2 sm:p-3`}
          style={{
            ...provided.draggableProps.style,
            transform: snapshot.isDragging 
              ? `${provided.draggableProps.style?.transform} rotate(2deg)`
              : provided.draggableProps.style?.transform
          }}
        >
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <div className="absolute top-2 left-2 z-10">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isSelected 
                  ? 'bg-blue-600 border-blue-600' 
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-blue-400'
              }`}>
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          )}

          <div className={`flex items-start justify-between mb-1 sm:mb-2 ${isMultiSelectMode ? 'ml-7' : ''}`}>
            <h3 className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm leading-tight flex-1 mr-2">
              {task.title}
            </h3>
            
            {task.priority && (
              <PrioritySelector
                value={task.priority}
                onChange={() => {}} // Read-only in card view
                disabled={true}
                variant="compact"
              />
            )}
          </div>

          {/* Category Display */}
          {task.category && (
            <div className="flex flex-wrap items-center gap-1 text-xs mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-blue-700 bg-blue-100 border border-blue-200">
                <span>{getCategoryIcon(task.category.name)}</span>
                <span className="font-medium">{task.category.name}</span>
                <span className="text-blue-600">{formatCurrency(task.category.hourly_rate_usd || task.category.hourly_rate || 0)}/hr</span>
              </span>
            </div>
          )}

          {task.description && (
            <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 sm:mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {task.due_date && (
                <div className={`flex items-center space-x-1 ${
                  isOverdue(task.due_date) 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-medium">
                    {formatDate(task.due_date)}
                    {isOverdue(task.due_date) && ' (Overdue)'}
                  </span>
                </div>
              )}
            </div>

            {/* Subtask Progress Indicator */}
            {!loading && total > 0 && (
              <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-xs">
                  {completed}/{total}
                </span>
                {completed === total && (
                  <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons on hover - hidden in multi-select mode */}
          {!isMultiSelectMode && (onTaskView || onTaskEdit || onTaskDelete) && (
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-md shadow-lg p-1">
              {onTaskView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTaskView(task)
                  }}
                  className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-700"
                  title="View details"
                >
                  <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              )}
              {onTaskEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTaskEdit(task)
                  }}
                  className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                  title="Edit task"
                >
                  <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {onTaskDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTaskDelete(task.id)
                  }}
                  className="p-1.5 rounded-md bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-700 hover:scale-110 transform"
                  title="Delete task"
                >
                  <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Visual indicator for drag handle when no actions - hidden in multi-select mode */}
          {!isMultiSelectMode && !(onTaskView || onTaskEdit || onTaskDelete) && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity duration-200">
              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

export default TaskCard