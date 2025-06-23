import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'

const CategoriesPage = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visionBoardImages, setVisionBoardImages] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', hourly_rate_usd: '' })
  const [editingCategory, setEditingCategory] = useState(null)

  // Load categories from API
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to load categories')
      
      const result = await response.json()
      if (result.success) {
        setCategories(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to load categories')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      alert('Failed to load categories')
    }
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      
      // Get active vision board images for carousel
      const { data: images } = await supabase
        .from('vision_board_images')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        
      setVisionBoardImages(images || [])
      
      // Load categories
      await loadCategories()
      setLoading(false)
    }

    getUser()
  }, [router, loadCategories])

  // Handle adding new category
  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          hourly_rate_usd: parseFloat(newCategory.hourly_rate_usd) || 0
        })
      })

      if (!response.ok) throw new Error('Failed to create category')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      setNewCategory({ name: '', hourly_rate_usd: '' })
      setShowAddModal(false)
      await loadCategories()
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Failed to create category')
    }
  }

  // Handle updating category
  const handleUpdateCategory = async (categoryId, updatedData) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      })

      if (!response.ok) throw new Error('Failed to update category')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      setEditingCategory(null)
      await loadCategories()
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Failed to update category')
    }
  }

  // Handle deleting category
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete category')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      await loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    }
  }

  if (loading) {
    return (
      <Layout showCarousel={false} showNavigation={false} showTimer={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Layout carouselImages={visionBoardImages}>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Task Categories</h1>
              <p className="text-white/70">
                Manage your task categories and hourly rates for time tracking and billing.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              Add Category
            </button>
          </div>

          {/* Categories List */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
            <div className="p-6 border-b border-white/20">
              <h2 className="text-xl font-semibold text-white">Your Categories</h2>
              <p className="text-white/70 mt-1">
                {categories.length} {categories.length === 1 ? 'category' : 'categories'} configured
              </p>
            </div>

            <div className="p-6">
              {categories.length === 0 ? (
                <div className="text-center p-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Categories Yet</h3>
                  <p className="text-white/70 mb-4">Create your first category to start organizing your tasks</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Add First Category
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-colors"
                    >
                      {editingCategory?.id === category.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            handleUpdateCategory(category.id, {
                              name: editingCategory.name,
                              hourly_rate_usd: parseFloat(editingCategory.hourly_rate_usd) || 0
                            })
                          }}
                          className="flex items-center gap-4"
                        >
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                            placeholder="Category name"
                            required
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-white/70">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingCategory.hourly_rate_usd}
                              onChange={(e) => setEditingCategory(prev => ({ ...prev, hourly_rate_usd: e.target.value }))}
                              className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                              placeholder="0.00"
                            />
                            <span className="text-white/70">/hr</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategory(null)}
                              className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-white">{category.name}</h3>
                            <p className="text-white/70">
                              ${category.hourly_rate_usd?.toFixed(2) || '0.00'} per hour
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingCategory({
                                id: category.id,
                                name: category.name,
                                hourly_rate_usd: category.hourly_rate_usd?.toString() || '0'
                              })}
                              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Add New Category</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/70 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Category Name</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                  placeholder="e.g., Development, Design, Research"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Hourly Rate (USD)</label>
                <div className="flex items-center">
                  <span className="text-white/70 mr-2">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCategory.hourly_rate_usd}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, hourly_rate_usd: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="0.00"
                  />
                  <span className="text-white/70 ml-2">/hr</span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default CategoriesPage 