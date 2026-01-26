'use client'

import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Task } from '../../lib/database/kanban-queries'
import { useComments } from '../../hooks/useComments'
import CommentSection from './CommentSection'
import SubtaskList from './SubtaskList'
import TaskGoalLink from './TaskGoalLink'
import { useTaskGoals } from '../../hooks/useTaskGoals'
import PrioritySelector from '../ui/PrioritySelector'
import DatePicker from '../ui/DatePicker'
import PositionalMoveDropdown from './PositionalMoveDropdown'
import CategorySelector from '../ui/CategorySelector'
import { formatDistanceToNow, format } from 'date-fns'

interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>
  onMove?: (taskId: string, newStatus: Task['status'], newOrderIndex: number) => Promise<void>
  allTasks?: Record<Task['status'], Task[]>
  onStartTiming?: (task: Task) => void // New prop for starting timer
}

interface ConfirmationModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" data-testid="confirmation-modal">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Discard Changes?
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          All changes will be lost. Are you sure you want to discard your edits?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            No, Keep Editing
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Yes, Discard Changes
          </button>
        </div>
      </div>
    </div>
  )
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdate,
  onMove,
  allTasks,
  onStartTiming
}) => {
  const [isClosing, setIsClosing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isDescriptionPreview, setIsDescriptionPreview] = useState(false)
  
  // Editable fields
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPriority, setEditPriority] = useState<Task['priority']>('medium')
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)
  
  const {
    comments,
    isLoading: commentsLoading,
    error: commentsError,
    addComment,
    editComment,
    deleteComment
  } = useComments(task?.id || '')

  const {
    linkedGoals,
    isLoading: goalsLoading,
    error: goalsError,
    refetch: refetchTaskGoals
  } = useTaskGoals(task?.id || null)

  // Initialize edit fields when task changes
  useEffect(() => {
    if (task) {
      setEditTitle(task.title)
      setEditDescription(task.description || '')
      setEditDueDate(task.due_date || '')
      setEditPriority(task.priority)
      setEditCategoryId(task.category_id || null)
    }
  }, [task])

  // Check if there are changes
  const hasChanges = task && (
    editTitle !== task.title ||
    editDescription !== (task.description || '') ||
    editDueDate !== (task.due_date || '') ||
    editPriority !== task.priority ||
    editCategoryId !== (task.category_id || null)
  )

  // Handle closing animation
  const handleClose = () => {
    if (isEditing && hasChanges) {
      setShowConfirmation(true)
      return
    }
    
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      resetEditState()
      onClose()
    }, 150)
  }

  const resetEditState = () => {
    setIsEditing(false)
    setShowConfirmation(false)
    setIsDescriptionPreview(false)
    if (task) {
      setEditTitle(task.title)
      setEditDescription(task.description || '')
      setEditDueDate(task.due_date || '')
      setEditPriority(task.priority)
      setEditCategoryId(task.category_id || null)
    }
  }

  const handleConfirmDiscard = () => {
    setShowConfirmation(false)
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      resetEditState()
      onClose()
    }, 150)
  }

  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirmation(true)
    } else {
      resetEditState()
    }
  }

  const handleUpdate = async () => {
    if (!task || !onUpdate || !hasChanges) return

    setIsUpdating(true)
    try {
      const updates: Partial<Task> = {}
      
      if (editTitle !== task.title) updates.title = editTitle
      if (editDescription !== (task.description || '')) {
        updates.description = editDescription || undefined
        console.log('📝 Updating description:', {
          old: task.description || '(empty)',
          new: editDescription || '(empty)',
          length: editDescription.length
        })
      }
      if (editDueDate !== (task.due_date || '')) updates.due_date = editDueDate.trim() || undefined
      if (editPriority !== task.priority) updates.priority = editPriority
      if (editCategoryId !== (task.category_id || null)) updates.category_id = editCategoryId || undefined

      console.log('💾 Sending task update:', updates)
      await onUpdate(task.id, updates)
      console.log('✅ Task update call completed')
      
      // Update local state to reflect the changes immediately
      // The parent component will refresh the task prop via fetchTasks
      setEditDescription(editDescription) // Keep the edited description
      
      setIsEditing(false)
      setIsDescriptionPreview(false)
    } catch (error) {
      console.error('❌ Failed to update task:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isEditing) {
          handleCancel()
        } else {
        handleClose()
        }
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
  }, [isOpen, isEditing])

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

  const dueDateInfo = formatDate(isEditing ? editDueDate : task.due_date)

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
    <>
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto">
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] my-auto flex flex-col transition-all duration-150 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Modal Header - Sticky */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg flex-shrink-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Task Details
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(task.status)}`}>
              {getStatusDisplayName(task.status)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating || !hasChanges}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating && (
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isUpdating ? 'Updating...' : 'Update Task'}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                {onMove && allTasks && task && task.status && (
                  <PositionalMoveDropdown
                    currentTask={task}
                    allTasks={allTasks}
                    onMove={onMove}
                  />
                )}
                {onStartTiming && task && (
                  <button
                    onClick={() => onStartTiming(task)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Start Timing
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Task
              </button>
              </div>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Task Details Panel */}
          <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="space-y-6">
              {/* Task Title */}
              <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none pb-2 mb-4"
                      placeholder="Task title..."
                    />
                  ) : (
                    <h2 
                      className="text-2xl font-bold text-gray-900 dark:text-white mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={() => onUpdate && setIsEditing(true)}
                      title="Click to edit"
                    >
                  {task.title}
                </h2>
                  )}
                  
                  {/* Task Description with Markdown Support */}
                  {isEditing ? (
                    <div className="space-y-3">
                      {/* Description Input/Preview Toggle */}
                      <div className="flex items-center space-x-1 mb-2">
                        <button
                          onClick={() => setIsDescriptionPreview(false)}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            !isDescriptionPreview
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                          }`}
                        >
                          Write
                        </button>
                        <button
                          onClick={() => setIsDescriptionPreview(true)}
                          disabled={!editDescription.trim()}
                          className={`px-3 py-1 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDescriptionPreview
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                          }`}
                        >
                          Preview
                        </button>
                      </div>

                      {isDescriptionPreview ? (
                        <div className="min-h-[100px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                          {editDescription.trim() ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-blue">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                  a: ({ node, ...props }) => (
                                    <a {...props} target="_blank" rel="noopener noreferrer" />
                                  ),
                                  pre: ({ node, ...props }) => (
                                    <pre {...props} className="bg-gray-800 dark:bg-gray-900 rounded-md overflow-x-auto" />
                                  ),
                                  code: ({ node, className, children, ...props }: any) => {
                                    const match = /language-(\w+)/.exec(className || '')
                                    const inline = !match
                                    return inline ? (
                                      <code
                                        {...props}
                                        className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-sm text-gray-800 dark:text-gray-100"
                                      >
                                        {children}
                                      </code>
                                    ) : (
                                      <code {...props} className="text-sm">
                                        {children}
                                      </code>
                                    )
                                  },
                                  ol: ({ node, ...props }) => (
                                    <ol {...props} className="list-decimal list-inside pl-4 space-y-1 text-gray-800 dark:text-gray-100" />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul {...props} className="list-disc list-inside pl-4 space-y-1 text-gray-800 dark:text-gray-100" />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li {...props} className="text-sm text-gray-800 dark:text-gray-100" />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p {...props} className="text-gray-800 dark:text-gray-100" />
                                  ),
                                  h1: ({ node, ...props }) => (
                                    <h1 {...props} className="text-gray-900 dark:text-white" />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2 {...props} className="text-gray-900 dark:text-white" />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3 {...props} className="text-gray-900 dark:text-white" />
                                  ),
                                  h4: ({ node, ...props }) => (
                                    <h4 {...props} className="text-gray-900 dark:text-white" />
                                  ),
                                  h5: ({ node, ...props }) => (
                                    <h5 {...props} className="text-gray-900 dark:text-white" />
                                  ),
                                  h6: ({ node, ...props }) => (
                                    <h6 {...props} className="text-gray-900 dark:text-white" />
                                  ),
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote {...props} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 text-gray-700 dark:text-gray-200 italic" />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong {...props} className="font-bold text-gray-900 dark:text-white" />
                                  ),
                                  em: ({ node, ...props }) => (
                                    <em {...props} className="italic text-gray-800 dark:text-gray-100" />
                                  )
                                }}
                              >
                                {editDescription}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 italic">Nothing to preview</p>
                          )}
                        </div>
                      ) : (
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={4}
                          placeholder="Task description... (Markdown supported)"
                        />
                      )}
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Tip:</span> Use Markdown for formatting. **bold**, *italic*, `code`, etc.
                      </div>
                    </div>
                  ) : (
                    task.description ? (
                      <div 
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                        onClick={() => onUpdate && setIsEditing(true)}
                        title="Click to edit"
                      >
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-blue">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              a: ({ node, ...props }) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" />
                              ),
                              pre: ({ node, ...props }) => (
                                <pre {...props} className="bg-gray-800 dark:bg-gray-900 rounded-md overflow-x-auto" />
                              ),
                              code: ({ node, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '')
                                const inline = !match
                                return inline ? (
                                  <code
                                    {...props}
                                    className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-sm text-gray-800 dark:text-gray-100"
                                  >
                                    {children}
                                  </code>
                                ) : (
                                  <code {...props} className="text-sm">
                                    {children}
                                  </code>
                                )
                              },
                              ol: ({ node, ...props }) => (
                                <ol {...props} className="list-decimal list-inside pl-4 space-y-1 text-gray-800 dark:text-gray-100" />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul {...props} className="list-disc list-inside pl-4 space-y-1 text-gray-800 dark:text-gray-100" />
                              ),
                              li: ({ node, ...props }) => (
                                <li {...props} className="text-sm text-gray-800 dark:text-gray-100" />
                              ),
                              p: ({ node, ...props }) => (
                                <p {...props} className="text-gray-800 dark:text-gray-100" />
                              ),
                              h1: ({ node, ...props }) => (
                                <h1 {...props} className="text-gray-900 dark:text-white" />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2 {...props} className="text-gray-900 dark:text-white" />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3 {...props} className="text-gray-900 dark:text-white" />
                              ),
                              h4: ({ node, ...props }) => (
                                <h4 {...props} className="text-gray-900 dark:text-white" />
                              ),
                              h5: ({ node, ...props }) => (
                                <h5 {...props} className="text-gray-900 dark:text-white" />
                              ),
                              h6: ({ node, ...props }) => (
                                <h6 {...props} className="text-gray-900 dark:text-white" />
                              ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote {...props} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 text-gray-700 dark:text-gray-200 italic" />
                              ),
                              strong: ({ node, ...props }) => (
                                <strong {...props} className="font-bold text-gray-900 dark:text-white" />
                              ),
                              em: ({ node, ...props }) => (
                                <em {...props} className="italic text-gray-800 dark:text-gray-100" />
                              )
                            }}
                          >
                    {task.description}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 italic"
                        onClick={() => onUpdate && setIsEditing(true)}
                        title="Click to add description"
                      >
                        No description
                  </div>
                    )
                )}
              </div>

              {/* Task Metadata */}
              <div className="space-y-4">
                  {/* Position & Status */}
                  {onMove && allTasks && task && task.status && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Position
                      </span>
                      <div className="flex-1 max-w-xs ml-4">
                        <PositionalMoveDropdown
                          currentTask={task}
                          allTasks={allTasks}
                          onMove={onMove}
                          disabled={isEditing}
                        />
                      </div>
                    </div>
                  )}

                {/* Priority */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </span>
                  <PrioritySelector
                      value={isEditing ? editPriority : task.priority}
                      onChange={isEditing ? setEditPriority : () => {}}
                    variant="compact"
                      disabled={!isEditing}
                  />
                </div>

                {/* Category */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </span>
                  <CategorySelector
                    value={isEditing ? (editCategoryId || undefined) : (task.category_id || undefined)}
                    onChange={isEditing ? (id) => setEditCategoryId(id || null) : () => {}}
                    variant="compact"
                    disabled={!isEditing}
                    allowNone={true}
                  />
                </div>

                {/* Due Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due Date
                    </span>
                    {isEditing ? (
                      <DatePicker
                        value={editDueDate}
                        onChange={setEditDueDate}
                        placeholder="Select due date"
                      />
                    ) : dueDateInfo ? (
                      <div 
                        className="text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                        onClick={() => onUpdate && setIsEditing(true)}
                        title="Click to edit"
                      >
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
                    ) : (
                      <div 
                        className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        onClick={() => onUpdate && setIsEditing(true)}
                        title="Click to add due date"
                      >
                        No due date
                      </div>
                    )}
                  </div>

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

                {/* Subtasks Section */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <SubtaskList taskId={task.id} />
                  
                  {/* Goals Section */}
                  <TaskGoalLink
                    task={task}
                    linkedGoals={linkedGoals}
                    onLinkChange={refetchTaskGoals}
                  />
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

      <ConfirmationModal
        isOpen={showConfirmation}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowConfirmation(false)}
      />
    </>
  )
}

export default TaskDetailModal