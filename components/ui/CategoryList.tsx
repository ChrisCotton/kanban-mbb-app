'use client'

import React, { useState, useEffect } from 'react'
import { useCategories, Category } from '../../hooks/useCategories'

type SortField = 'name' | 'hourly_rate' | 'total_hours' | 'created_at' | 'updated_at'
type SortDirection = 'asc' | 'desc'

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
  const { 
    categories, 
    loading, 
    error: loadError, 
    deleteCategory, 
    loadCategories 
  } = useCategories()

  // State for search, sort, pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Call onCategoryChange when categories change
  useEffect(() => {
    if (onCategoryChange) {
      onCategoryChange()
    }
  }, [categories, onCategoryChange])

  // Filter categories by search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort categories
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue)
      return sortDirection === 'asc' ? comparison : -comparison
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const comparison = aValue - bValue
      return sortDirection === 'asc' ? comparison : -comparison
    }
    
    return 0
  })

  // Calculate pagination
  const totalPages = Math.ceil(sortedCategories.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCategories = sortedCategories.slice(startIndex, endIndex)

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, itemsPerPage])

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (window.confirm(`Are you sure you want to delete the category "${categoryName}"?`)) {
      const success = await deleteCategory(categoryId)
      if (success) {
        // Reset selection if deleted category was selected
        if (selectedCategory?.id === categoryId) {
          setSelectedCategory(null)
        }
        // Reset to first page if current page becomes empty
        const newTotal = Math.ceil((sortedCategories.length - 1) / itemsPerPage)
        if (currentPage > newTotal && newTotal > 0) {
          setCurrentPage(newTotal)
        }
      }
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page when sorting changes
  }

  const handleCategoryClick = (category: Category) => {
    if (selectable && onCategorySelect) {
      setSelectedCategory(category)
      onCategorySelect(category)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatHours = (hours: number | null | undefined) => {
    if (hours === null || hours === undefined || isNaN(hours)) {
      return '0.0h'
    }
    return `${hours.toFixed(1)}h`
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('development') || name.includes('coding') || name.includes('programming')) return '💻'
    if (name.includes('design') || name.includes('creative')) return '🎨'
    if (name.includes('meeting') || name.includes('call')) return '📞'
    if (name.includes('research')) return '🔍'
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

  // Pagination controls
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
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
      {/* Header with Search and Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-4">
          {/* Top row: Search and Filter */}
          <div className="flex items-center justify-between">
            {searchable && (
              <div className="relative flex-1 max-w-md">
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
            )}
            
            {/* Filter/Sort Dropdown */}
            {sortable && (
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-sm">Sort by {sortField}</span>
                  <span className="text-xs">{getSortIcon(sortField)}</span>
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => { handleSort('name'); setShowFilterDropdown(false) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
                      >
                        <span>Sort by Name</span>
                        {sortField === 'name' && <span className="text-xs">{getSortIcon('name')}</span>}
                      </button>
                      <button
                        onClick={() => { handleSort('hourly_rate'); setShowFilterDropdown(false) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
                      >
                        <span>Sort by Hourly Rate</span>
                        {sortField === 'hourly_rate' && <span className="text-xs">{getSortIcon('hourly_rate')}</span>}
                      </button>
                      <button
                        onClick={() => { handleSort('total_hours'); setShowFilterDropdown(false) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
                      >
                        <span>Sort by Total Hours</span>
                        {sortField === 'total_hours' && <span className="text-xs">{getSortIcon('total_hours')}</span>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Bottom row: Per-page selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            
            {filteredCategories.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {startIndex + 1}-{Math.min(endIndex, sortedCategories.length)} of {sortedCategories.length} categories
                {searchTerm && ` matching "${searchTerm}"`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category List */}
      <div className={`overflow-y-auto ${maxHeight}`}>
        {paginatedCategories.length === 0 ? (
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
                    onClick={() => handleSort('hourly_rate')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Rate</span>
                    <span className="text-xs">{getSortIcon('hourly_rate')}</span>
                  </button>
                  <button
                    onClick={() => handleSort('total_hours')}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <span>Hours</span>
                    <span className="text-xs">{getSortIcon('total_hours')}</span>
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
            {paginatedCategories.map((category) => (
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
                          {formatCurrency(category.hourly_rate)}/hr
                        </span>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {formatHours(category.total_hours)}
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-sm border rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryList 