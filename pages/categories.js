import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import CategoryManager from '../components/ui/CategoryManager'
import CategoryBulkUpload from '../components/ui/CategoryBulkUpload'

const CategoriesPage = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visionBoardImages, setVisionBoardImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCSVUpload, setShowCSVUpload] = useState(false)

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
      setLoading(false)
    }

    getUser()
  }, [router])

  // Handle CSV upload completion
  const handleCSVUploadComplete = (uploadedCount) => {
    setShowCSVUpload(false)
    // CategoryManager will automatically refresh its data
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
    <Layout carouselImages={visionBoardImages} userId={user?.id}>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Task Categories</h1>
              <p className="text-white/70">
                Manage your task categories and hourly rates for time tracking and billing.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCSVUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import CSV
              </button>
            </div>
          </div>

          {/* Enhanced Category Manager with CSV functionality */}
          <CategoryManager 
            className="min-h-[400px]"
            showHeader={true}
            maxHeight="max-h-none"
          />
        </div>
      </main>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <CategoryBulkUpload
              onUploadComplete={handleCSVUploadComplete}
              onClose={() => setShowCSVUpload(false)}
              className="w-full"
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default CategoriesPage 