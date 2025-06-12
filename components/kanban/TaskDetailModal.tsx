'use client'

import React, { useState, useEffect } from 'react'
import { Task } from '../../lib/database/kanban-queries'
import { useComments } from '../../hooks/useComments'
import CommentSection from './CommentSection'
import PrioritySelector from '../ui/PrioritySelector'
import { formatDistanceToNow, format } from 'date-fns'

interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onEdit?: (task: Task) => void
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onEdit
}) => {
  const [isClosing, setIsClosing] = useState(false)
  
  const {
    comments,
    isLoading: commentsLoading,
    error: commentsError,
    addComment,
    editComment,
    deleteComment
  } = useComments(task?.id || '')

  // Handle closing animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 150)
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !task) return null

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return null
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffInDays < 0) {
        return {
          formatted: format(date, 'MMM d, yyyy'),
          relative: `${Math.abs(diffInDays)} day${Math.abs(diffInDays) !== 1 ? 's' : ''} overdue`,
          isOverdue: true
        }
      } else if (diffInDays === 0) {
        return {
          formatted: format(date, 'MMM d, yyyy'),
          relative: 'Due today',
          isOverdue: false
        }
      } else {
        return {
          formatted: format(date, 'MMM d, yyyy'),
          relative: formatDistanceToNow(date, { addSuffix: true }),
          isOverdue: false
        }
      }
    } catch {
      return null
    }
  }

  const dueDateInfo = formatDate(task.due_date)

  const getStatusBadgeColor = (status: Task['status']) => {
    switch (status) {
      case 'backlog':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'todo':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      case 'doing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusDisplayName = (status: Task['status']) => {
    switch (status) {
      case 'backlog':
        return 'Backlog'
      case 'todo':
        return 'To Do'
      case 'doing':
        return 'In Progress'
      case 'done':
        return 'Done'
      default:
        return status
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden transition-all duration-150 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Task Details
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(task.status)}`}>
              {getStatusDisplayName(task.status)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(task)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Task
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex h-[calc(90vh-80px)]">
          {/* Task Details Panel */}
          <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="space-y-6">
              {/* Task Title */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {task.title}
                </h2>
                {task.description && (
                  <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {task.description}
                  </div>
                )}
              </div>

              {/* Task Metadata */}
              <div className="space-y-4">
                {/* Priority */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </span>
                  <PrioritySelector
                    value={task.priority}
                    onChange={() => {}} // Read-only in detail view
                    variant="compact"
                    disabled
                  />
                </div>

                {/* Due Date */}
                {dueDateInfo && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due Date
                    </span>
                    <div className="text-right">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {dueDateInfo.formatted}
                      </div>
                      <div className={`text-xs ${
                        dueDateInfo.isOverdue 
                          ? 'text-red-600 dark:text-red-400 font-medium' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {dueDateInfo.relative}
                      </div>
                    </div>
                  </div>
                )}

                {/* Created Date */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Created
                  </span>
                  <div className="text-right">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {format(new Date(task.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                {/* Updated Date */}
                {task.created_at !== task.updated_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Updated
                    </span>
                    <div className="text-right">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(task.updated_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Task ID (for debugging/reference) */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Task ID
                  </span>
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                    {task.id}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Panel */}
          <div className="w-1/2 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {commentsError ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Failed to load comments: {commentsError}
                      </span>
                    </div>
                  </div>
                ) : (
                  <CommentSection
                    taskId={task.id}
                    comments={comments}
                    onAddComment={addComment}
                    onEditComment={editComment}
                    onDeleteComment={deleteComment}
                    isLoading={commentsLoading}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailModal