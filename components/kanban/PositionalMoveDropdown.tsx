'use client'

import React, { useState } from 'react'
import { Task } from '../../lib/database/kanban-queries'

interface PositionalMoveDropdownProps {
  currentTask: Task
  allTasks: Record<Task['status'], Task[]>
  onMove: (taskId: string, newStatus: Task['status'], newOrderIndex: number) => Promise<void>
  disabled?: boolean
}

const PositionalMoveDropdown: React.FC<PositionalMoveDropdownProps> = ({
  currentTask,
  allTasks,
  onMove,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMoving, setIsMoving] = useState(false)

  const statusOptions: { value: Task['status']; label: string; color: string }[] = [
    { value: 'backlog', label: 'Backlog', color: 'text-gray-600' },
    { value: 'todo', label: 'To Do', color: 'text-blue-600' },
    { value: 'doing', label: 'Doing', color: 'text-yellow-600' },
    { value: 'done', label: 'Done', color: 'text-green-600' }
  ]

  const handleMove = async (newStatus: Task['status'], newPosition: number) => {
    if (disabled || isMoving) return

    setIsMoving(true)
    try {
      await onMove(currentTask.id, newStatus, newPosition)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to move task:', error)
    } finally {
      setIsMoving(false)
    }
  }

  const getCurrentPosition = () => {
    const tasksInCurrentStatus = allTasks[currentTask.status] || []
    return tasksInCurrentStatus.findIndex(task => task.id === currentTask.id)
  }

  const renderPositionOptions = (status: Task['status'], statusLabel: string, statusColor: string) => {
    const tasksInStatus = allTasks[status] || []
    const isCurrentStatus = status === currentTask.status
    const currentPosition = getCurrentPosition()
    
    // For current status, show all positions except current one
    // For other statuses, show all positions plus "end" position
    const maxPositions = isCurrentStatus ? tasksInStatus.length : tasksInStatus.length + 1
    
    const options = []
    
    for (let i = 0; i < maxPositions; i++) {
      // Skip current position in current status
      if (isCurrentStatus && i === currentPosition) continue
      
      const isEnd = !isCurrentStatus && i === tasksInStatus.length
      const positionLabel = isEnd ? 'End' : `${i + 1}${getOrdinalSuffix(i + 1)}`
      const taskAtPosition = isEnd ? null : tasksInStatus[i]
      
      options.push(
        <button
          key={`${status}-${i}`}
          onClick={() => handleMove(status, i)}
          disabled={isMoving}
          className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {positionLabel} position
              </span>
              {taskAtPosition && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-48">
                  {isEnd ? 'After: ' : 'Before: '}{taskAtPosition.title}
                </div>
              )}
              {isEnd && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  At the end of {statusLabel}
                </div>
              )}
            </div>
            {isMoving && (
              <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>
        </button>
      )
    }
    
    return options
  }

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  const currentPosition = getCurrentPosition()
  const currentStatusLabel = statusOptions.find(opt => opt.value === currentTask.status)?.label || currentTask.status

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isMoving}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-gray-700 dark:text-gray-300">
            {currentStatusLabel} - {currentPosition + 1}{getOrdinalSuffix(currentPosition + 1)} position
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            {statusOptions.map(({ value, label, color }) => {
              const tasksInStatus = allTasks[value] || []
              const hasPositions = value === currentTask.status ? tasksInStatus.length > 1 : true
              
              if (!hasPositions) return null
              
              return (
                <div key={value} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className={`px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-sm font-medium ${color}`}>
                    {label} ({tasksInStatus.length} task{tasksInStatus.length !== 1 ? 's' : ''})
                  </div>
                  <div className="py-1">
                    {renderPositionOptions(value, label, color)}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default PositionalMoveDropdown 