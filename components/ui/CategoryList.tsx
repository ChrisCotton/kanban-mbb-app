'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface Category {
  id: string
  name: string
  hourly_rate_usd: number
  created_at: string
  updated_at: string
}

interface CategoryListProps {
  onCategorySelect?: (category: Category) => void
  onCategoryChange?: () => void
  className?: string
  showActions?: boolean
  selectable?: boolean
  searchable?: boolean
  sortable?: boolean
  maxHeight?: string
  emptyMessage?: string
}

type SortField = 'name' | 'hourly_rate_usd' | 'created_at' | 'updated_at'
type SortDirection = 'asc' | 'desc'

const CategoryList: React.FC<CategoryListProps> = ({
  onCategorySelect,
  onCategoryChange,
  className = '',
  showActions = true,
  selectable = false,
  searchable = true,
  sortable = true,
  maxHeight = 'max-h-96',
  emptyMessage = 'No categories found. Create your first category to get started.'
}) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Load categories from API
  const loadCategories = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to load categories')
      }
      
      setCategories(result.data || [])
      onCategoryChange?.()
    } catch (err) {
      console.error('Error loading categories:', err)
      setLoadError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [onCategoryChange])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Filter and sort categories
  useEffect(() => {
    let filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort categories
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortField]
      let bValue: string | number = b[sortField]

      if (sortField === 'hourly_rate_usd') {
        aValue = Number(aValue)
        bValue = Number(bValue)
      } else {
        aValue = String(aValue).toLowerCase()
        bValue = String(bValue).toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredCategories(filtered)
  }, [categories, searchTerm, sortField, sortDirection])

  // Handle delete
  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"?\n\nThis action cannot be undone and may affect existing tasks.`)) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete category')
      }

      await loadCategories()
      
      // Clear selection if deleted category was selected
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null)
      }
      
    } catch (err) {
      console.error('Error deleting category:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle category selection
  const handleCategoryClick = (category: Category) => {
    if (selectable) {
      setSelectedCategory(category)
      onCategorySelect?.(category)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get category icon
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('develop') || name.includes('code') || name.includes('programming')) return '💻'
    if (name.includes('design') || name.includes('ui') || name.includes('ux')) return '🎨'
    if (name.includes('research') || name.includes('analysis')) return '🔍'
    if (name.includes('meeting') || name.includes('discussion')) return '🗣️'
    if (name.includes('writing') || name.includes('content')) return '✍️'
    if (name.includes('marketing') || name.includes('promotion')) return '📢'
    if (name.includes('admin') || name.includes('management')) return '📋'
    return '📁'
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '⬆️' : '⬇️'
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading categories...</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-800 dark:text-red-400 font-medium">Error loading categories</span>
        </div>
        <p className="text-red-700 dark:text-red-300 text-sm mt-1">{loadError}</p>
        <button
          onClick={loadCategories}
          className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header with Search */}
      {searchable && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className={`overflow-y-auto ${maxHeight}`}>
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? (
              <>
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No categories found matching "{searchTerm}"</p>
                <p className="text-sm mt-1">Try adjusting your search term</p>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>{emptyMessage}</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Table Header */}
            {sortable && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Name</span>
                    <span className="text-xs">{getSortIcon('name')}</span>
                  </button>
                  <button
                    onClick={() => handleSort('hourly_rate_usd')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Rate</span>
                    <span className="text-xs">{getSortIcon('hourly_rate_usd')}</span>
                  </button>
                  <button
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Created</span>
                    <span className="text-xs">{getSortIcon('created_at')}</span>
                  </button>
                  {showActions && <span>Actions</span>}
                </div>
              </div>
            )}

            {/* Category Items */}
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className={`px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectable ? 'cursor-pointer' : ''
                } ${
                  selectedCategory?.id === category.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-2xl">{getCategoryIcon(category.name)}</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(category.hourly_rate_usd)}/hr
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Created {formatDate(category.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {showActions && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCategory(category)
                          setShowEditModal(true)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(category.id, category.name)
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {filteredCategories.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
          Showing {filteredCategories.length} of {categories.length} categories
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}
    </div>
  )
}

export default CategoryList 