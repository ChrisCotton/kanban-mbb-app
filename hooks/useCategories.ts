/**
 * useCategories Hook
 * Task 4.11: Create useCategories hook for category state management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface Category {
  id: string
  name: string
  hourly_rate: number // Database uses hourly_rate (not hourly_rate_usd)
  color?: string
  is_active: boolean
  total_hours: number // NEW: Total hours tracked for this category
  created_at: string
  updated_at: string
  created_by: string // Updated to match our database schema
  updated_by?: string // Updated to match our database schema  
  task_count: number // New field from our enhanced API
}

export interface CategoryFormData {
  name: string
  hourly_rate_usd: string // Keep this as the UI input field name
  color?: string
  is_active?: boolean
}

export interface UseCategoriesReturn {
  // State
  categories: Category[]
  loading: boolean
  error: string | null
  submitting: boolean
  
  // Actions
  loadCategories: () => Promise<void>
  createCategory: (data: CategoryFormData) => Promise<Category | null>
  updateCategory: (id: string, data: Partial<CategoryFormData>) => Promise<Category | null>
  deleteCategory: (id: string) => Promise<boolean>
  bulkUpload: (csvContent: string) => Promise<{ success: boolean; created: number; errors: string[] }>
  
  // Helpers
  getCategoryById: (id: string) => Category | undefined
  getCategoriesByIds: (ids: string[]) => Category[]
  getActiveCategories: () => Category[]
  searchCategories: (query: string) => Category[]
  validateCategoryName: (name: string, excludeId?: string) => string | null
  
  // State setters
  setError: (error: string | null) => void
  clearError: () => void
  refresh: () => Promise<void>
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Keep track of active requests to prevent race conditions
  const loadingRef = useRef<AbortController | null>(null)
  
  /**
   * Load categories from API
   */
  const loadCategories = useCallback(async () => {
    // Cancel any existing request
    if (loadingRef.current) {
      loadingRef.current.abort()
    }
    
    const controller = new AbortController()
    loadingRef.current = controller
    
    setLoading(true)
    setError(null)
    
    try {
      // Get auth token from Supabase
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/categories', {
        signal: controller.signal,
        headers
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to load categories')
      }
      
      setCategories(result.data || [])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      
      console.error('Error loading categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
      loadingRef.current = null
    }
  }, [])

  /**
   * Create a new category
   */
  const createCategory = useCallback(async (data: CategoryFormData): Promise<Category | null> => {
    setSubmitting(true)
    setError(null)
    
    try {
      // Get auth token from Supabase
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        throw new Error('Authentication required. Please sign in.')
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: data.name.trim(),
          hourly_rate_usd: parseFloat(data.hourly_rate_usd) || 0,
          color: data.color,
          is_active: data.is_active !== false,
        })
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create category')
      }

      const newCategory = result.data
      setCategories(prev => [...prev, newCategory])
      
      // Dispatch event to sync other components using this hook
      window.dispatchEvent(new CustomEvent('category-created', { 
        detail: newCategory 
      }))
      
      return newCategory
    } catch (err) {
      console.error('Error creating category:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category'
      setError(errorMessage)
      return null
    } finally {
      setSubmitting(false)
    }
  }, [])

  /**
   * Update an existing category
   */
  const updateCategory = useCallback(async (
    id: string, 
    data: Partial<CategoryFormData>
  ): Promise<Category | null> => {
    setSubmitting(true)
    setError(null)
    
    try {
      // Get user ID from localStorage or session
      const userId = localStorage.getItem('user_id') || 'current_user'
      
      const updateData: any = {
        user_id: userId
      }
      
      if (data.name !== undefined) {
        updateData.name = data.name.trim()
      }
      if (data.hourly_rate_usd !== undefined) {
        updateData.hourly_rate_usd = parseFloat(data.hourly_rate_usd) || 0
      }
      if (data.color !== undefined) {
        updateData.color = data.color
      }
      if (data.is_active !== undefined) {
        updateData.is_active = data.is_active
      }

      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update category')
      }

      const updatedCategory = result.data
      setCategories(prev => 
        prev.map(cat => cat.id === id ? updatedCategory : cat)
      )
      
      // Dispatch event to sync other components
      window.dispatchEvent(new CustomEvent('category-updated', { 
        detail: updatedCategory 
      }))
      
      return updatedCategory
    } catch (err) {
      console.error('Error updating category:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category'
      setError(errorMessage)
      return null
    } finally {
      setSubmitting(false)
    }
  }, [])

  /**
   * Delete a category
   * FIXED: Use Supabase auth user ID instead of localStorage
   */
  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    setSubmitting(true)
    setError(null)
    
    try {
      console.log('[deleteCategory] Starting delete for category:', id)
      
      // Get actual authenticated user from Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      console.log('[deleteCategory] Auth result:', {
        user: user ? { id: user.id, email: user.email } : null,
        error: authError
      })
      
      if (authError || !user) {
        console.error('[deleteCategory] Auth failed:', authError)
        throw new Error('Not authenticated. Please log in again.')
      }
      
      const apiUrl = `/api/categories/${id}?user_id=${user.id}`
      console.log('[deleteCategory] Calling API:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'DELETE'
      })
      
      console.log('[deleteCategory] Response status:', response.status)

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete category')
      }

      setCategories(prev => prev.filter(cat => cat.id !== id))
      
      // Dispatch event to sync other components
      window.dispatchEvent(new CustomEvent('category-deleted', { 
        detail: id 
      }))
      
      return true
    } catch (err) {
      console.error('Error deleting category:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category'
      setError(errorMessage)
      return false
    } finally {
      setSubmitting(false)
    }
  }, [])

  /**
   * Bulk upload categories from CSV
   */
  const bulkUpload = useCallback(async (csvContent: string): Promise<{
    success: boolean
    created: number
    errors: string[]
  }> => {
    setSubmitting(true)
    setError(null)
    
    try {
      // Get user ID from localStorage or session
      const userId = localStorage.getItem('user_id') || 'current_user'
      
      const response = await fetch('/api/categories/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          csvContent,
          user_id: userId
        })
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success && result.created > 0) {
        // Reload categories to get the new ones
        await loadCategories()
      }
      
      return {
        success: result.success,
        created: result.created || 0,
        errors: result.errors || []
      }
    } catch (err) {
      console.error('Error bulk uploading categories:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload categories'
      setError(errorMessage)
      
      return {
        success: false,
        created: 0,
        errors: [errorMessage]
      }
    } finally {
      setSubmitting(false)
    }
  }, [loadCategories])

  /**
   * Get category by ID
   */
  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(cat => cat.id === id)
  }, [categories])

  /**
   * Get multiple categories by IDs
   */
  const getCategoriesByIds = useCallback((ids: string[]): Category[] => {
    return categories.filter(cat => ids.includes(cat.id))
  }, [categories])

  /**
   * Get only active categories
   */
  const getActiveCategories = useCallback((): Category[] => {
    return categories.filter(cat => cat.is_active)
  }, [categories])

  /**
   * Search categories by name
   */
  const searchCategories = useCallback((query: string): Category[] => {
    if (!query.trim()) {
      return categories
    }
    
    const searchTerm = query.toLowerCase().trim()
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm)
    )
  }, [categories])

  /**
   * Validate category name for uniqueness
   */
  const validateCategoryName = useCallback((name: string, excludeId?: string): string | null => {
    if (!name || name.trim().length === 0) {
      return 'Category name is required'
    }

    const trimmedName = name.trim()
    
    if (trimmedName.length < 2) {
      return 'Category name must be at least 2 characters long'
    }
    
    if (trimmedName.length > 100) {
      return 'Category name must be less than 100 characters'
    }

    // Check for duplicate names (case insensitive)
    const existing = categories.find(cat => 
      cat.id !== excludeId && 
      cat.name.toLowerCase() === trimmedName.toLowerCase()
    )
    
    if (existing) {
      return 'A category with this name already exists'
    }

    return null
  }, [categories])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Refresh categories (alias for loadCategories)
   */
  const refresh = useCallback(async () => {
    await loadCategories()
  }, [loadCategories])

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingRef.current) {
        loadingRef.current.abort()
      }
    }
  }, [])

  // Sync categories across all instances when one creates/updates/deletes
  useEffect(() => {
    const handleCategoryCreated = (event: CustomEvent) => {
      const newCategory = event.detail
      setCategories(prev => {
        // Check if category already exists (avoid duplicates)
        if (prev.some(cat => cat.id === newCategory.id)) {
          return prev
        }
        return [...prev, newCategory]
      })
    }

    const handleCategoryUpdated = (event: CustomEvent) => {
      const updatedCategory = event.detail
      setCategories(prev => 
        prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
      )
    }

    const handleCategoryDeleted = (event: CustomEvent) => {
      const categoryId = event.detail
      setCategories(prev => prev.filter(cat => cat.id !== categoryId))
    }

    window.addEventListener('category-created', handleCategoryCreated as EventListener)
    window.addEventListener('category-updated', handleCategoryUpdated as EventListener)
    window.addEventListener('category-deleted', handleCategoryDeleted as EventListener)

    return () => {
      window.removeEventListener('category-created', handleCategoryCreated as EventListener)
      window.removeEventListener('category-updated', handleCategoryUpdated as EventListener)
      window.removeEventListener('category-deleted', handleCategoryDeleted as EventListener)
    }
  }, [])

  return {
    // State
    categories,
    loading,
    error,
    submitting,
    
    // Actions
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    bulkUpload,
    
    // Helpers
    getCategoryById,
    getCategoriesByIds,
    getActiveCategories,
    searchCategories,
    validateCategoryName,
    
    // State setters
    setError,
    clearError,
    refresh
  }
}

export default useCategories 