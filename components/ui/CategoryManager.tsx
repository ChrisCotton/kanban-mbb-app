'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface Category {
  id: string
  name: string
  hourly_rate_usd: number
  created_at: string
  updated_at: string
}

interface CategoryManagerProps {
  onCategoryChange?: () => void
  className?: string
  showHeader?: boolean
  maxHeight?: string
}

interface CategoryFormData {
  name: string
  hourly_rate_usd: string
  description?: string
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  onCategoryChange,
  className = '',
  showHeader = true,
  maxHeight = 'max-h-96'
}) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    hourly_rate_usd: '',
    description: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Validate form data
  const validateForm = (data: CategoryFormData): Record<string, string> => {
    const errors: Record<string, string> = {}
    
    if (!data.name.trim()) {
      errors.name = 'Category name is required'
    } else if (data.name.trim().length < 2) {
      errors.name = 'Category name must be at least 2 characters'
    } else if (data.name.trim().length > 50) {
      errors.name = 'Category name must be less than 50 characters'
    }
    
    const hourlyRate = parseFloat(data.hourly_rate_usd)
    if (isNaN(hourlyRate) || hourlyRate < 0) {
      errors.hourly_rate_usd = 'Please enter a valid hourly rate (0 or greater)'
    } else if (hourlyRate > 10000) {
      errors.hourly_rate_usd = 'Hourly rate seems unusually high. Please verify.'
    }
    
    // Check for duplicate names (excluding current category when editing)
    const existingCategory = categories.find(cat => 
      cat.name.toLowerCase() === data.name.trim().toLowerCase() && 
      cat.id !== editingCategory?.id
    )
    if (existingCategory) {
      errors.name = 'A category with this name already exists'
    }
    
    return errors
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm(formData)
    setFormErrors(errors)
    
    if (Object.keys(errors).length > 0) return
    
    setIsSubmitting(true)
    
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          hourly_rate_usd: parseFloat(formData.hourly_rate_usd) || 0
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to save category')
      }

      // Reset form and close modal
      setFormData({ name: '', hourly_rate_usd: '', description: '' })
      setFormErrors({})
      setShowAddModal(false)
      setEditingCategory(null)
      
      // Reload categories
      await loadCategories()
      
    } catch (err) {
      console.error('Error saving category:', err)
      setFormErrors({ submit: err instanceof Error ? err.message : 'Failed to save category' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"? This cannot be undone.`)) {
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
      
    } catch (err) {
      console.error('Error deleting category:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      hourly_rate_usd: category.hourly_rate_usd.toString(),
      description: ''
    })
    setFormErrors({})
    setShowAddModal(true)
  }

  // Handle add new
  const handleAddNew = () => {
    setEditingCategory(null)
    setFormData({ name: '', hourly_rate_usd: '', description: '' })
    setFormErrors({})
    setShowAddModal(true)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Categories</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {categories.length} {categories.length === 1 ? 'category' : 'categories'} configured
            </p>
          </div>
          <button
            onClick={handleAddNew}
            disabled={loading}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add Category
          </button>
        </div>
      )}

      <div className={`p-4 ${maxHeight} overflow-y-auto`}>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading categories...</span>
          </div>
        )}

        {loadError && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Error Loading Categories</p>
              <p className="text-xs text-red-500 dark:text-red-400 mb-3">{loadError}</p>
              <button
                onClick={loadCategories}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !loadError && categories.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Categories Yet</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first category to start organizing your tasks and tracking time.</p>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create First Category
            </button>
          </div>
        )}

        {!loading && !loadError && categories.length > 0 && (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <span className="text-lg">{getCategoryIcon(category.name)}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{category.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatCurrency(category.hourly_rate_usd)} per hour
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Edit category"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete category"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formErrors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    formErrors.name 
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                  placeholder="e.g., Development, Design, Research"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hourly Rate (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10000"
                    value={formData.hourly_rate_usd}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate_usd: e.target.value }))}
                    className={`w-full pl-8 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      formErrors.hourly_rate_usd 
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                    } text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400">/hr</span>
                  </div>
                </div>
                {formErrors.hourly_rate_usd && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.hourly_rate_usd}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingCategory(null)
                    setFormData({ name: '', hourly_rate_usd: '', description: '' })
                    setFormErrors({})
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      {editingCategory ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingCategory ? 'Update Category' : 'Create Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryManager 