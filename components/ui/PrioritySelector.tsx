'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Task } from '../../lib/database/kanban-queries'

interface PrioritySelectorProps {
  value?: Task['priority']
  onChange: (priority: Task['priority']) => void
  disabled?: boolean
  error?: string
  className?: string
  variant?: 'default' | 'compact'
}

interface PriorityOption {
  value: Task['priority']
  label: string
  description: string
  color: string
  bgColor: string
  icon: string
}

const priorityOptions: PriorityOption[] = [
  {
    value: 'low',
    label: 'Low Priority',
    description: 'Nice to have, non-urgent',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    icon: '⬇️'
  },
  {
    value: 'medium',
    label: 'Medium Priority',
    description: 'Important, normal timeline',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    icon: '➡️'
  },
  {
    value: 'high',
    label: 'High Priority',
    description: 'Important, needs attention',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    icon: '⬆️'
  }
  // Removed 'urgent' priority to match database enum (low, medium, high only)
]

const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value = 'medium',
  onChange,
  disabled = false,
  error,
  className = '',
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = priorityOptions.find(option => option.value === value) || priorityOptions[1]

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (priority: Task['priority']) => {
    onChange(priority)
    setIsOpen(false)
  }

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  if (variant === 'compact') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          onClick={handleToggle}
          disabled={disabled}
          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full transition-colors ${
            selectedOption.bgColor
          } ${selectedOption.color} ${
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
          }`}
        >
          <span className="mr-1">{selectedOption.icon}</span>
          {selectedOption.value}
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <div className="p-2 space-y-1">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    value === option.value ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-2">{option.icon}</span>
                    <span className={`font-medium ${option.color}`}>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
        } ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2'
        }`}
      >
        <div className="flex items-center">
          <span className="mr-2 text-lg">{selectedOption.icon}</span>
          <div className="text-left">
            <div className={`text-sm font-medium ${selectedOption.color}`}>
              {selectedOption.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedOption.description}
            </div>
          </div>
        </div>
        
        <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="p-2">
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">Select Priority Level</p>
            </div>
            <div className="space-y-1">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    value === option.value 
                      ? 'bg-gray-50 dark:bg-gray-700 ring-1 ring-blue-200 dark:ring-blue-800' 
                      : ''
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full ${option.bgColor} flex items-center justify-center mr-3`}>
                      <span className="text-sm">{option.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${option.color}`}>
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                    {value === option.value && (
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrioritySelector 