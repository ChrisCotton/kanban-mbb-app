'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useCategories } from '../../hooks/useCategories'

interface Category {
  id: string
  name: string
  hourly_rate_usd: number
  created_at: string
  updated_at: string
}

interface CategorySelectorProps {
  value?: string // category ID
  onChange: (categoryId: string | null) => void
  disabled?: boolean
  error?: string
  className?: string
  variant?: 'default' | 'compact'
  allowNone?: boolean
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  variant = 'default',
  allowNone = true
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // ✅ FIX: Use the useCategories hook (includes auth token automatically)
  const { 
    categories, 
    loading, 
    error: loadError 
  } = useCategories()

  const selectedCategory = categories.find(cat => cat.id === value) || null

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the dropdown container
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        
        // Check if we're inside a modal context
        // Look for modal backdrop or modal content containers
        const isInsideModal = target.closest('.fixed.inset-0') !== null && 
                            (target.closest('.bg-black.bg-opacity-50') !== null ||
                             target.closest('[class*="z-\\[80\\]"]') !== null ||
                             target.closest('[class*="z-\\[90\\]"]') !== null);
        
        // If we're inside a modal, don't close the dropdown
        // The modal's backdrop click handler will manage closing
        if (!isInsideModal) {
          setIsOpen(false);
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    }
  }, [isOpen])

  const handleSelect = (categoryId: string | null) => {
    onChange(categoryId)
    setIsOpen(false)
  }

  const handleToggle = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!disabled && !loading) {
      setIsOpen(!isOpen)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getCategoryIcon = (categoryName: string) => {
    // Simple icon mapping based on category name
    const name = categoryName.toLowerCase()
    if (name.includes('develop') || name.includes('code') || name.includes('programming')) return '💻'
    if (name.includes('design') || name.includes('ui') || name.includes('ux')) return '🎨'
    if (name.includes('research') || name.includes('analysis')) return '🔍'
    if (name.includes('meeting') || name.includes('discussion')) return '🗣️'
    if (name.includes('writing') || name.includes('content')) return '✍️'
    if (name.includes('marketing') || name.includes('promotion')) return '📢'
    if (name.includes('admin') || name.includes('management')) return '📋'
    return '📁' // Default category icon
  }

  if (variant === 'compact') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          onClick={(e) => handleToggle(e)}
          disabled={disabled || loading}
          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full transition-colors ${
            selectedCategory
              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          } ${
            disabled || loading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full mr-1"></div>
              Loading...
            </>
          ) : selectedCategory ? (
            <>
              <span className="mr-1">{getCategoryIcon(selectedCategory.name)}</span>
              {selectedCategory.name}
            </>
          ) : (
            <>
              <span className="mr-1">📁</span>
              No Category
            </>
          )}
        </button>

        {isOpen && !loading && (
          <div 
            className="absolute z-[100] mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg right-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
              {allowNone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(null);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    !value ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-2">📁</span>
                    <span className="font-medium text-gray-600 dark:text-gray-400">No Category</span>
                  </div>
                </button>
              )}
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(category.id);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    value === category.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-2">{getCategoryIcon(category.name)}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(category.hourly_rate_usd)}/hr
                    </span>
                  </div>
                </button>
              ))}
              {categories.length === 0 && !loadError && (
                <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No categories available. Create some categories first.
                </div>
              )}
              {loadError && (
                <div className="px-3 py-2 text-center text-red-500 dark:text-red-400 text-sm">
                  {loadError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      <button
        onClick={(e) => handleToggle(e)}
        disabled={disabled || loading}
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
        } ${
          disabled || loading
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2'
        }`}
      >
        <div className="flex items-center">
          {loading ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full mr-3"></div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Loading categories...
                </div>
              </div>
            </>
          ) : selectedCategory ? (
            <>
              <span className="mr-3 text-lg">{getCategoryIcon(selectedCategory.name)}</span>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCategory.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatCurrency(selectedCategory.hourly_rate_usd)} per hour
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="mr-3 text-lg">📁</span>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {allowNone ? 'No Category Selected' : 'Select a Category'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Choose a category to track time and earnings
                </div>
              </div>
            </>
          )}
        </div>
        
        <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Error Message */}
      {(error || loadError) && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error || loadError}</p>
      )}

      {/* Dropdown */}
        {isOpen && !loading && (
          <div 
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg right-0"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="p-2">
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">Select Category</p>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {allowNone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(null);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    !value 
                      ? 'bg-gray-50 dark:bg-gray-700 ring-1 ring-blue-200 dark:ring-blue-800' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center mr-3">
                        <span className="text-sm">📁</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          No Category
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          No time tracking or earnings calculation
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )}
              
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(category.id);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    value === category.id 
                      ? 'bg-gray-50 dark:bg-gray-700 ring-1 ring-blue-200 dark:ring-blue-800' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mr-3">
                        <span className="text-sm">{getCategoryIcon(category.name)}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(category.hourly_rate_usd)} per hour
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(category.hourly_rate_usd)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        /hr
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {categories.length === 0 && !loadError && (
                <div className="px-3 py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Categories Available</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Create some categories first to organize your tasks and track earnings.
                  </p>
                </div>
              )}
              
              {loadError && (
                <div className="px-3 py-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Error Loading Categories</p>
                  <p className="text-xs text-red-500 dark:text-red-400 mb-2">{loadError}</p>
                  <button
                    onClick={loadCategories}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategorySelector 