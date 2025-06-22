'use client'

import React, { useState } from 'react'
import { Task } from '../../lib/database/kanban-queries'
import PrioritySelector from '../ui/PrioritySelector'

interface BulkActionsToolbarProps {
  selectedCount: number
  onBulkDelete: () => void
  onBulkMove: (status: Task['status']) => void
  onBulkPriorityChange: (priority: Task['priority']) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onExitMultiSelect: () => void
  totalTaskCount: number
  isAllSelected: boolean
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onBulkDelete,
  onBulkMove,
  onBulkPriorityChange,
  onSelectAll,
  onClearSelection,
  onExitMultiSelect,
  totalTaskCount,
  isAllSelected
}) => {
  const [showMoveDropdown, setShowMoveDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)

  const statusOptions: { value: Task['status']; label: string; color: string }[] = [
    { value: 'backlog', label: 'Backlog', color: 'text-gray-600' },
    { value: 'todo', label: 'Todo', color: 'text-blue-600' },
    { value: 'doing', label: 'Doing', color: 'text-yellow-600' },
    { value: 'done', label: 'Done', color: 'text-green-600' }
  ]

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-96">
        <div className="flex items-center justify-between space-x-4">
          {/* Selection Info */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedCount} selected
              </span>
            </div>
            
            {/* Select All / Clear Selection */}
            <button
              onClick={isAllSelected ? onClearSelection : onSelectAll}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {isAllSelected ? 'Clear all' : `Select all (${totalTaskCount})`}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Move Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Move</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showMoveDropdown && (
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-32">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onBulkMove(option.value)
                        setShowMoveDropdown(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${option.color}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2m-6 0h8m-8 0a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2" />
                </svg>
                <span>Priority</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showPriorityDropdown && (
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-40">
                  {(['low', 'medium', 'high', 'urgent'] as Task['priority'][]).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => {
                        onBulkPriorityChange(priority)
                        setShowPriorityDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <PrioritySelector
                        value={priority}
                        onChange={() => {}}
                        disabled={true}
                        variant="compact"
                      />
                      <span className="capitalize text-gray-700 dark:text-gray-300">{priority}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Button */}
            <button
              onClick={onBulkDelete}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>

            {/* Exit Multi-Select */}
            <button
              onClick={onExitMultiSelect}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="Exit multi-select mode"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Shift+Click for range selection</span>
            <span>Esc to exit • Del to delete</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkActionsToolbar 