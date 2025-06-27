'use client'

import React, { useState } from 'react'
import { useCategories, type Category, type CategoryFormData } from '../../hooks/useCategories'

interface CategoryManagerProps {
  onCategoryChange?: () => void
  className?: string
  showHeader?: boolean
  maxHeight?: string
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  onCategoryChange,
  className = '',
  showHeader = true,
  maxHeight = 'max-h-96'
}) => {
  // Use our robust useCategories hook
  const {
    categories,
    loading,
    error,
    submitting,
    createCategory,
    updateCategory,
    deleteCategory,
    setError,
    clearError
  } = useCategories()

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    hourly_rate_usd: '',
    color: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Notify parent component when categories change
  React.useEffect(() => {
    onCategoryChange?.()
  }, [categories, onCategoryChange])

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
    
    try {
      let result
      if (editingCategory) {
        result = await updateCategory(editingCategory.id, formData)
      } else {
        result = await createCategory(formData)
      }

      if (result) {
        // Reset form and close modal
        setFormData({ name: '', hourly_rate_usd: '', color: '' })
        setFormErrors({})
        setShowAddModal(false)
        setEditingCategory(null)
        clearError()
      }
      
    } catch (err) {
      console.error('Error saving category:', err)
      setFormErrors({ submit: err instanceof Error ? err.message : 'Failed to save category' })
    }
  }

  // Handle delete
  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${categoryName}"? This cannot be undone.`)) {
      return
    }

    const success = await deleteCategory(categoryId)
    if (!success && error) {
      alert(error)
    }
  }

  // Handle edit
  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      hourly_rate_usd: category.hourly_rate.toString(),
      color: category.color || ''
    })
    setFormErrors({})
    setShowAddModal(true)
  }

  // Handle add new
  const handleAddNew = () => {
    setEditingCategory(null)
    setFormData({ name: '', hourly_rate_usd: '', color: '' })
    setFormErrors({})
    setShowAddModal(true)
  }

  // Close modal and reset
  const closeModal = () => {
    setShowAddModal(false)
    setEditingCategory(null)
    setFormData({ name: '', hourly_rate_usd: '', color: '' })
    setFormErrors({})
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
    // Simple icon mapping based on category name
    const name = categoryName.toLowerCase()
    if (name.includes('development') || name.includes('coding') || name.includes('programming')) {
      return '💻'
    } else if (name.includes('design') || name.includes('ui') || name.includes('ux')) {
      return '🎨'
    } else if (name.includes('meeting') || name.includes('call') || name.includes('discussion')) {
      return '💬'
    } else if (name.includes('research') || name.includes('analysis') || name.includes('study')) {
      return '🔍'
    } else if (name.includes('writing') || name.includes('content') || name.includes('documentation')) {
      return '📝'
    } else {
      return '📁'
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Categories</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your task categories and hourly rates for time tracking and billing
          </p>
          <button
            onClick={handleAddNew}
            className="ml-4 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
          >
            Add Category
          </button>
        </div>
      )}

      <div className={`p-4 ${maxHeight} overflow-y-auto`}>
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading categories...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Error Loading Categories</p>
              <p className="text-xs text-red-500 dark:text-red-400 mb-3">{error}</p>
              <button
                onClick={() => {
                  setError(null)
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📁</span>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Categories Yet</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Create your first category to start organizing tasks and tracking time
            </p>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              Add Your First Category
            </button>
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-lg">
                    {getCategoryIcon(category.name)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{category.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatCurrency(category.hourly_rate)} per hour
                      {category.task_count !== undefined && (
                        <span className="ml-2">• {category.task_count} task{category.task_count !== 1 ? 's' : ''}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit category"
                  >
                    <span className="sr-only">Edit</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete category"
                  >
                    <span className="sr-only">Delete</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v3a1 1 0 11-2 0V9zm4 0a1 1 0 10-2 0v3a1 1 0 002 0V9z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Development, Design, Research"
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="hourly_rate_usd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hourly Rate (USD) *
                </label>
                <input
                  type="number"
                  id="hourly_rate_usd"
                  value={formData.hourly_rate_usd}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate_usd: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="50.00"
                  step="0.01"
                  min="0"
                />
                {formErrors.hourly_rate_usd && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.hourly_rate_usd}</p>}
              </div>

              {formErrors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {submitting ? (
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