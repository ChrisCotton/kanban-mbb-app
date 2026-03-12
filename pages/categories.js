import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import CategoryManager from '../components/ui/CategoryManager'
import CategoryBulkUpload from '../components/ui/CategoryBulkUpload'
import GoalsHeaderStrip from '../src/components/goals/GoalsHeaderStrip'
import { useGoalsStore } from '../src/stores/goals.store'

const CategoriesPage = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visionBoardImages, setVisionBoardImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCSVUpload, setShowCSVUpload] = useState(false)

  // Goals store for header strip
  const { goals, activeGoalFilter, setActiveGoalFilter, fetchGoals } = useGoalsStore()

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:20',message:'useEffect started',data:{routerPathname:router.pathname,routerAsPath:router.asPath,loading},timestamp:Date.now(),runId:'initial',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const getUser = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:22',message:'getUser called',data:{},timestamp:Date.now(),runId:'initial',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:24',message:'getUser result',data:{hasUser:!!user,userId:user?.id,authError:authError?.message},timestamp:Date.now(),runId:'initial',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        if (!user) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:26',message:'No user, redirecting',data:{},timestamp:Date.now(),runId:'initial',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          router.push('/auth/login')
          setLoading(false)
          return
        }
        
        setUser(user)
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:32',message:'Fetching vision board images',data:{userId:user.id},timestamp:Date.now(),runId:'initial',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        // Get active vision board images for carousel
        const { data: images, error: imagesError } = await supabase
          .from('vision_board_images')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:40',message:'Vision board images fetched',data:{imagesCount:images?.length||0,imagesError:imagesError?.message},timestamp:Date.now(),runId:'initial',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        setVisionBoardImages(images || [])
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:43',message:'Setting loading to false',data:{},timestamp:Date.now(),runId:'initial',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        setLoading(false)
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:46',message:'getUser error',data:{error:error?.message,stack:error?.stack},timestamp:Date.now(),runId:'initial',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setLoading(false)
      }
    }

    getUser()
  }, [router])

  // Fetch goals on mount
  useEffect(() => {
    if (goals.length === 0) {
      fetchGoals()
    }
  }, [goals.length, fetchGoals])

  const handleGoalClick = (goalId) => {
    // Toggle goal filter
    if (activeGoalFilter === goalId) {
      setActiveGoalFilter(null)
    } else {
      setActiveGoalFilter(goalId)
    }
  }

  // Handle CSV upload completion
  const handleCSVUploadComplete = (uploadedCount) => {
    setShowCSVUpload(false)
    // CategoryManager will automatically refresh its data
  }

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/9600b6eb-feac-4179-91f9-fecc0082b44b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pages/categories.js:67',message:'Render check',data:{loading,hasUser:!!user,routerPathname:router.pathname},timestamp:Date.now(),runId:'initial',hypothesisId:'A'})}).catch(()=>{});
  });
  // #endregion

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

          {/* Goals Header Strip */}
          <GoalsHeaderStrip
            goals={goals.filter((g) => g.status === 'active')}
            activeGoalId={activeGoalFilter}
            onGoalClick={handleGoalClick}
            className="mb-6"
          />

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