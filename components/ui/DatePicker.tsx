'use client'

import React, { useState, useRef, useEffect } from 'react'

interface DatePickerProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  minDate?: string
  maxDate?: string
  showShortcuts?: boolean
  className?: string
}

const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'Select date...',
  disabled = false,
  error,
  minDate,
  maxDate,
  showShortcuts = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Format date for input (YYYY-MM-DD)
  const formatInputDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(formatDisplayDate(value))
  }, [value])

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

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Get date shortcuts
  const getDateShortcuts = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    const nextMonth = new Date(today)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    return [
      { label: 'Today', date: today.toISOString().split('T')[0] },
      { label: 'Tomorrow', date: tomorrow.toISOString().split('T')[0] },
      { label: 'Next Week', date: nextWeek.toISOString().split('T')[0] },
      { label: 'Next Month', date: nextMonth.toISOString().split('T')[0] }
    ]
  }

  const handleDateChange = (dateString: string) => {
    onChange(dateString)
    setIsOpen(false)
  }

  const handleShortcutClick = (dateString: string) => {
    handleDateChange(dateString)
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
  }

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const shortcuts = getDateShortcuts()

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div 
        onClick={handleInputClick}
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer transition-colors ${
          error 
            ? 'border-red-500 focus-within:ring-red-500' 
            : 'border-gray-300 dark:border-gray-600 focus-within:ring-blue-500 focus-within:border-blue-500'
        } ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <div className="flex items-center flex-1">
          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-sm ${inputValue ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {inputValue || placeholder}
          </span>
        </div>
        
        {value && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="p-3">
            {/* Calendar Input */}
            <div className="mb-3">
              <input
                ref={inputRef}
                type="date"
                value={formatInputDate(value)}
                onChange={(e) => handleDateChange(e.target.value)}
                min={minDate || today}
                max={maxDate}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Shortcuts */}
            {showShortcuts && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Quick Select</p>
                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.label}
                    onClick={() => handleShortcutClick(shortcut.date)}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    {shortcut.label}
                  </button>
                ))}
                
                {value && (
                  <button
                    onClick={handleClear}
                    className="w-full text-left px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    Clear Date
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker 