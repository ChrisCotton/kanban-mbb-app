import React, { useState, useRef, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useSubtasks } from '../../hooks/useSubtasks'
import { Subtask } from '../../lib/database/kanban-queries'

interface SubtaskListProps {
  taskId: string
  className?: string
}

interface SubtaskItemProps {
  subtask: Subtask
  index: number
  onToggle: (id: string) => void
  onUpdate: (id: string, title: string) => void
  onDelete: (id: string) => void
}

function SubtaskItem({ subtask, index, onToggle, onUpdate, onDelete }: SubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(subtask.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (editTitle.trim() && editTitle !== subtask.title) {
      try {
        await onUpdate(subtask.id, editTitle.trim())
      } catch (error) {
        console.error('Failed to update subtask:', error)
      }
    }
    setIsEditing(false)
    setEditTitle(subtask.title)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditTitle(subtask.title)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleDelete = async () => {
    try {
      await onDelete(subtask.id)
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to delete subtask:', error)
    }
  }

  return (
    <Draggable draggableId={subtask.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            group flex items-center gap-3 p-3 rounded-lg border transition-all
            ${snapshot.isDragging 
              ? 'bg-white/20 border-blue-400 shadow-lg rotate-1' 
              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
            }
          `}
        >
          {/* Enhanced Drag Handle - Always visible with better styling */}
          <div
            {...provided.dragHandleProps}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 touch-manipulation"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4 text-white/80" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zM7 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zM7 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zM13 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 2zM13 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zM13 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
            </svg>
          </div>

          {/* Checkbox */}
          <button
            onClick={() => onToggle(subtask.id)}
            className={`
              flex-shrink-0 w-5 h-5 rounded border-2 transition-all
              ${subtask.completed 
                ? 'bg-green-500 border-green-500' 
                : 'border-white/30 hover:border-white/50'
              }
            `}
            aria-label={`${subtask.completed ? 'Mark as incomplete' : 'Mark as complete'}: ${subtask.title}`}
            title={`${subtask.completed ? 'Mark as incomplete' : 'Mark as complete'}: ${subtask.title}`}
          >
            {subtask.completed && (
              <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Subtask title..."
              />
            ) : (
              <span
                className={`
                  block break-words whitespace-normal cursor-pointer
                  ${subtask.completed 
                    ? 'text-white/60 line-through' 
                    : 'text-white'
                  }
                `}
                onClick={() => setIsEditing(true)}
              >
                {subtask.title}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                  title={`Edit subtask "${subtask.title}"`}
                  aria-label={`Edit subtask "${subtask.title}"`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1 rounded hover:bg-red-500/20 text-white/60 hover:text-red-400"
                  title={`Delete subtask "${subtask.title}"`}
                  aria-label={`Delete subtask "${subtask.title}"`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg border border-white/20 max-w-sm mx-4">
                <h3 className="text-white font-semibold mb-2">Delete Subtask</h3>
                <p className="text-white/70 mb-4">
                  Are you sure you want to delete "{subtask.title}"?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

export default function SubtaskList({ taskId, className = '' }: SubtaskListProps) {
  const {
    subtasks,
    loading,
    error,
    createSubtask,
    updateSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks
  } = useSubtasks(taskId)

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const newSubtaskInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating && newSubtaskInputRef.current) {
      newSubtaskInputRef.current.focus()
    }
  }, [isCreating])

  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim()) return

    try {
      await createSubtask(newSubtaskTitle.trim())
      setNewSubtaskTitle('')
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create subtask:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateSubtask()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsCreating(false)
      setNewSubtaskTitle('')
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const reorderedSubtasks = Array.from(subtasks)
    const [reorderedItem] = reorderedSubtasks.splice(result.source.index, 1)
    reorderedSubtasks.splice(result.destination.index, 0, reorderedItem)

    reorderSubtasks(reorderedSubtasks)
  }

  const handleUpdateSubtask = async (id: string, title: string) => {
    await updateSubtask(id, { title })
  }

  const completedCount = subtasks.filter(s => s.completed).length
  const totalCount = subtasks.length

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Subtasks</h3>
          <div className="text-sm text-white/60">Loading...</div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Subtasks</h3>
        {totalCount > 0 && (
          <div className="text-sm text-white/70">
            {completedCount} of {totalCount} completed
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label={`${completedCount} of ${totalCount} subtasks completed`}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Add helpful instruction text */}
      {totalCount > 1 && (
        <div className="text-xs text-white/50 flex items-center gap-2 mb-2">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zM7 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zM7 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zM13 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 2zM13 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zM13 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
          </svg>
          Drag handles to reorder by priority
        </div>
      )}

      {/* Subtask List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="subtasks">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                space-y-2 min-h-[60px] p-2 rounded-lg transition-colors
                ${snapshot.isDraggingOver ? 'bg-blue-500/10 border-2 border-dashed border-blue-400' : ''}
              `}
            >
              {subtasks.map((subtask, index) => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  index={index}
                  onToggle={toggleSubtask}
                  onUpdate={handleUpdateSubtask}
                  onDelete={deleteSubtask}
                />
              ))}
              {provided.placeholder}

              {subtasks.length === 0 && !isCreating && (
                <div className="text-center py-8 text-white/50">
                  <svg className="w-8 h-8 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>No subtasks yet</p>
                  <p className="text-sm">Break this task down into smaller steps</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add New Subtask */}
      <div className="space-y-2">
        {isCreating ? (
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/20 rounded-lg">
            <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-white/30" />
            <input
              ref={newSubtaskInputRef}
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newSubtaskTitle.trim()) {
                  setIsCreating(false)
                }
              }}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/50"
              placeholder="Enter subtask title..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewSubtaskTitle('')
                }}
                className="px-3 py-1 text-sm bg-white/10 text-white rounded hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center gap-3 p-3 bg-white/5 border border-dashed border-white/20 rounded-lg hover:bg-white/10 hover:border-white/30 transition-colors group"
          >
            <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-white/30 group-hover:border-white/50" />
            <span className="text-white/70 group-hover:text-white">Add subtask</span>
            <svg className="w-4 h-4 text-white/40 group-hover:text-white/70 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
} 