'use client'

import React, { useState, useEffect } from 'react'
import { Task, TaskWithCategory } from '../../lib/database/kanban-queries'
import DatePicker from '../ui/DatePicker'
import PrioritySelector from '../ui/PrioritySelector'
import CategorySelector from '../ui/CategorySelector'
import SubtaskList from './SubtaskList'
import TagSelector from '../ui/TagSelector'
import { useTaskTags } from '../../hooks/useTags'
import { Tag } from '../../pages/api/tags/index'
import { supabase } from '../../lib/supabase'
import { parseLocalDate } from '../../lib/utils/date-helpers'
import { useGoalsStore } from '../../src/stores/goals.store'
import { Goal } from '../../src/types/goals'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (taskData: Partial<Task>) => Promise<Task | void> // Return created task if creating, void if editing
  task?: TaskWithCategory | null // If provided, we're editing; if null/undefined, we're creating
  initialStatus?: Task['status'] // For creating tasks in a specific column
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  task,
  initialStatus = 'backlog'
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: initialStatus,
    priority: 'medium',
    due_date: '',
    category_id: ''
  })
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [userId, setUserId] = useState<string>('')
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null)
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false)
  const [isLinkingGoals, setIsLinkingGoals] = useState(false)
  
  // Goals store for goal selection
  const { goals, fetchGoals, isLoading: goalsLoading } = useGoalsStore()
  
  // Use task tags hook for existing tasks only
  // For new tasks, we use selectedTags state instead
  const taskTagsHook = useTaskTags(
    task?.id || '', 
    userId
  )
  const taskTags = task ? taskTagsHook.tags : []
  const addTagToTask = taskTagsHook.addTagToTask
  const removeTagFromTask = taskTagsHook.removeTagFromTask

  // Get current user ID and default category from profile
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Fetch default category from user profile
        try {
          const response = await fetch(`/api/profile?user_id=${user.id}`)
          const result = await response.json()
          if (result.success && result.data?.default_category_id) {
            setDefaultCategoryId(result.data.default_category_id)
          }
        } catch (error) {
          console.error('Error fetching default category:', error)
        }
      }
    }
    getUser()
  }, [])

  // Fetch goals when modal opens
  useEffect(() => {
    if (isOpen && goals.length === 0 && !goalsLoading) {
      fetchGoals().catch((error) => {
        console.error('[TaskModal] Error fetching goals:', error)
      })
    }
  }, [isOpen, goals.length, goalsLoading, fetchGoals])

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Editing existing task
        setFormData({
          title: task.title || '',
          description: task.description || '',
          status: task.status,
          priority: task.priority || 'medium',
          due_date: task.due_date || '',
          category_id: task.category_id || ''
        })
        // Reset goal selection for editing (goals are managed in TaskDetailModal)
        setSelectedGoalIds([])
      } else {
        // Creating new task - use default category from profile if available
        setFormData({
          title: '',
          description: '',
          status: initialStatus,
          priority: 'medium',
          due_date: '',
          category_id: defaultCategoryId || ''
        })
        // Reset goal selection for new task
        setSelectedGoalIds([])
      }
      setErrors({})
      setIsGoalDropdownOpen(false)
    }
  }, [isOpen, task, initialStatus, defaultCategoryId])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim()) {
      newErrors.title = 'Task title is required'
    }

    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'Task title must be less than 100 characters'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    if (formData.due_date) {
      // Use parseLocalDate to avoid timezone shifts
      const dueDate = parseLocalDate(formData.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dueDate < today) {
        newErrors.due_date = 'Due date cannot be in the past'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setIsLinkingGoals(true)
    try {
      const taskData: Partial<Task> = {
        ...formData,
        title: formData.title?.trim(),
        description: formData.description?.trim() || undefined,
        due_date: formData.due_date || undefined,
        category_id: formData.category_id || undefined
      }

      // Save task (create or update)
      const savedTask = await onSave(taskData)
      
      // If creating a new task and goals are selected, link them
      // savedTask will be a Task object when creating, undefined when editing
      if (!task && savedTask && 'id' in savedTask && selectedGoalIds.length > 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            // Link each selected goal to the newly created task
            for (const goalId of selectedGoalIds) {
              const linkResponse = await fetch(`/api/goals/${goalId}/tasks`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  user_id: session.user.id,
                  task_id: savedTask.id,
                  contribution_weight: 1,
                }),
              })
              
              if (!linkResponse.ok) {
                console.error(`Error linking task to goal ${goalId}:`, await linkResponse.text())
              }
            }
          }
        } catch (linkError) {
          console.error('Error linking goals to task:', linkError)
          // Don't fail the whole operation if linking fails
        }
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving task:', error)
      setErrors({ submit: 'Failed to save task. Please try again.' })
    } finally {
      setIsLoading(false)
      setIsLinkingGoals(false)
    }
  }

  const handleToggleGoal = (goalId: string) => {
    setSelectedGoalIds(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId)
      } else {
        return [...prev, goalId]
      }
    })
  }

  const handleRemoveGoal = (goalId: string) => {
    setSelectedGoalIds(prev => prev.filter(id => id !== goalId))
  }

  // Get selected goal details
  const selectedGoals = goals.filter(g => selectedGoalIds.includes(g.id))
  const availableGoals = goals.filter(g => !selectedGoalIds.includes(g.id) && g.status === 'active')

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose()
    }
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop, not on any child elements
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title Field */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter task title..."
              disabled={isLoading}
              autoFocus
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter task description..."
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Status and Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Field */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Task['status'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <PrioritySelector
                value={formData.priority}
                onChange={(priority) => setFormData(prev => ({ ...prev, priority }))}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Category Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <CategorySelector
              value={formData.category_id || undefined}
              onChange={(categoryId) => setFormData(prev => ({ ...prev, category_id: categoryId || '' }))}
              disabled={isLoading}
              error={errors.category_id}
              allowNone={true}
            />
            {errors.category_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category_id}</p>
            )}
          </div>

          {/* Tags Field */}
          {userId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <TagSelector
                selectedTags={task ? taskTags : selectedTags}
                onTagsChange={task ? async (tags) => {
                  // For existing tasks, update via API
                  const currentTagIds = taskTags.map(t => t.id)
                  const newTagIds = tags.map(t => t.id)
                  
                  // Add new tags
                  for (const tag of tags) {
                    if (!currentTagIds.includes(tag.id)) {
                      await addTagToTask(tag.id)
                    }
                  }
                  
                  // Remove removed tags
                  for (const tagId of currentTagIds) {
                    if (!newTagIds.includes(tagId)) {
                      await removeTagFromTask(tagId)
                    }
                  }
                } : setSelectedTags}
                userId={userId}
                disabled={isLoading}
                error={errors.tags}
                placeholder="Add tags to organize this task..."
              />
              {errors.tags && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tags}</p>
              )}
            </div>
          )}

          {/* Due Date Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <DatePicker
              value={formData.due_date}
              onChange={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
              disabled={isLoading}
              error={errors.due_date}
              placeholder="Select due date..."
            />
          </div>

          {/* Goals Field - Only show when creating new task */}
          {!task && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Goals
                </label>
                {availableGoals.length > 0 && (
                  <div className="relative" data-goal-dropdown>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsGoalDropdownOpen(!isGoalDropdownOpen)
                      }}
                      disabled={isLoading || isLinkingGoals}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
                    >
                      + Link Goal
                    </button>
                    {isGoalDropdownOpen && (
                      <div 
                        className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {availableGoals.map((goal) => (
                          <button
                            key={goal.id}
                            type="button"
                            onClick={() => {
                              handleToggleGoal(goal.id)
                              setIsGoalDropdownOpen(false)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                          >
                            <span>{goal.icon || '🎯'}</span>
                            <span className="flex-1">{goal.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {selectedGoals.length > 0 ? (
                <div className="space-y-2">
                  {selectedGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span>{goal.icon || '🎯'}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {goal.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGoal(goal.id)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        aria-label={`Remove ${goal.title}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No goals linked
                </p>
              )}
            </div>
          )}

          {/* Subtasks Section - Only for existing tasks */}
          {task && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subtasks
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                <SubtaskList taskId={task.id} />
              </div>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.title?.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
