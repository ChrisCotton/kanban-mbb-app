import React, { useState } from 'react'
import { useCategories, type Category, type CategoryFormData } from '../../hooks/useCategories'
import CategoryList from './CategoryList'

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
  const [showCSVDropdown, setShowCSVDropdown] = useState(false)
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

  // Handle edit from CategoryList
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

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/categories/export')
      if (!response.ok) throw new Error('Failed to export categories')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `categories-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      setError('Failed to export categories')
    }
  }

  // Handle CSV template download
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/categories/template')
      if (!response.ok) throw new Error('Failed to download template')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'categories-template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Template download error:', error)
      setError('Failed to download template')
    }
  }

  // Handle category change from CategoryList
  const handleCategoryChange = () => {
    onCategoryChange?.()
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header with Controls */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Task Categories</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your task categories and hourly rates for time tracking and billing</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* CSV Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCSVDropdown(!showCSVDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showCSVDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20">
                    <button
                      onClick={() => {
                        handleExportCSV()
                        setShowCSVDropdown(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                    <button
                      onClick={() => {
                        handleDownloadTemplate()
                        setShowCSVDropdown(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-t border-gray-200 dark:border-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Template
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleAddNew}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showCSVDropdown && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowCSVDropdown(false)}
        />
      )}

      {/* Enhanced CategoryList with pagination, filtering, and sorting */}
      <div className={`${maxHeight === 'max-h-96' ? '' : maxHeight}`}>
        <CategoryList
          onCategoryChange={handleCategoryChange}
          className="border-0 shadow-none"
          showActions={true}
          selectable={false}
          searchable={true}
          sortable={true}
          maxHeight="max-h-none"
          emptyMessage="No categories found. Create your first category to get started."
        />
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
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                >
                  {submitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Add Category')}
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