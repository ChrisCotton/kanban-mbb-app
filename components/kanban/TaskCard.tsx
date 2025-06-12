'use client'

import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Task } from '../../lib/database/kanban-queries'
import PrioritySelector from '../ui/PrioritySelector'

interface TaskCardProps {
  task: Task
  index: number
  onTaskMove?: (taskId: string, newStatus: Task['status'], newOrderIndex: number) => void
  onTaskEdit?: (task: Task) => void
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onTaskEdit }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onTaskEdit ? () => onTaskEdit(task) : undefined}
          className={`bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-2 sm:p-3 cursor-move hover:shadow-md transition-all duration-200 select-none ${
            snapshot.isDragging 
              ? 'opacity-90 rotate-1 scale-105 shadow-lg ring-2 ring-blue-400 ring-opacity-60' 
              : 'hover:shadow-md'
          } ${
            snapshot.isDropAnimating ? 'transition-transform duration-200' : ''
          } ${
            onTaskEdit ? 'hover:ring-1 hover:ring-blue-300 hover:ring-opacity-50' : ''
          }`}
          style={{
            ...provided.draggableProps.style,
            transform: snapshot.isDragging 
              ? `${provided.draggableProps.style?.transform} rotate(2deg)`
              : provided.draggableProps.style?.transform
          }}
        >
          <div className="flex items-start justify-between mb-1 sm:mb-2">
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

            <span className="text-gray-400 dark:text-gray-500 text-xs">
              {formatDate(task.created_at)}
            </span>
          </div>

          {/* Visual indicator for drag handle */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity duration-200">
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        </div>
      )}
    </Draggable>
  )
}

export default TaskCard