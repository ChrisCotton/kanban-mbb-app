'use client'

import React from 'react'
import { Task } from '../../lib/database/kanban-queries'

interface BulkDeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedTasks: Task[]
  isDeleting?: boolean
}

const BulkDeleteConfirmDialog: React.FC<BulkDeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedTasks,
  isDeleting = false
}) => {
  if (!isOpen) return null

  const taskCount = selectedTasks.length
  const tasksByStatus = selectedTasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {} as Record<Task['status'], number>)

  const statusLabels = {
    backlog: 'Backlog',
    todo: 'Todo',
    doing: 'Doing',
    done: 'Done'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete {taskCount} Task{taskCount !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-medium mb-1">⚠️ Permanent Deletion Warning</p>
                <p>
                  You are about to permanently delete <strong>{taskCount} task{taskCount !== 1 ? 's' : ''}</strong>. 
                  This will also delete all associated comments, subtasks, and attachments.
                </p>
                <p className="mt-2 font-medium">This action cannot be undone.</p>
              </div>
            </div>
          </div>

          {/* Task Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Tasks to be deleted:
            </h4>
            
            {/* Status Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(tasksByStatus).map(([status, count]) => (
                <div key={status} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {statusLabels[status as Task['status']]}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {count}
                  </div>
                </div>
              ))}
            </div>

            {/* Task List (first 5 tasks) */}
            <div className="space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Task Preview:
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-700 dark:text-gray-300 truncate">
                      {task.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      ({task.status})
                    </span>
                  </div>
                ))}
                {selectedTasks.length > 5 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                    ... and {selectedTasks.length - 5} more tasks
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-medium">Before proceeding:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>All task data will be permanently lost</li>
                  <li>Comments and subtasks will also be deleted</li>
                  <li>This action affects {taskCount} task{taskCount !== 1 ? 's' : ''} across multiple columns</li>
                  <li>No backup or recovery option is available</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isDeleting && (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>
              {isDeleting ? 'Deleting...' : `Delete ${taskCount} Task${taskCount !== 1 ? 's' : ''}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkDeleteConfirmDialog 