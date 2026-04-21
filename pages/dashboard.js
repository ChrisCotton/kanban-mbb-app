import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { getClientAuthUserForPageLoad } from '../lib/get-client-auth-user'
import { KanbanProvider } from '../lib/hooks/useKanban'
import KanbanBoard from '../components/kanban/KanbanBoard'
import Layout from '../components/layout/Layout'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visionBoardImages, setVisionBoardImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState(null)

  useEffect(() => {
    let cancelled = false

    const getUser = async () => {
      try {
        const user = await getClientAuthUserForPageLoad()
        if (cancelled) return
        if (!user) {
          await router.replace('/auth/login')
          return
        }

        setUser(user)

        const { data: images, error: imagesError } = await supabase
          .from('vision_board_images')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (imagesError) {
          console.error('[Dashboard] Vision board query failed:', imagesError)
        }
        if (!cancelled) {
          setVisionBoardImages(images || [])
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Dashboard] Failed to load user or images:', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    getUser()
    return () => {
      cancelled = true
    }
  }, [router])

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

  const handleStartTiming = (task) => {
    setActiveTask(task)
  }

  return (
    <Layout 
      title="Dashboard - Mental Bank Balance"
      description="Manage your tasks and track productivity with the Kanban board"
      carouselImages={visionBoardImages}
      activeTask={activeTask}
      userId={user?.id}
      // Note: showCarousel defaults to true, but actual visibility is controlled by
      // useCarouselPreference hook (defaults to OFF for performance)
    >
      <main className="flex-1 container mx-auto px-4 py-8">
        <KanbanProvider>
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Mental Bank Balance Dashboard
              </h1>
              <p className="text-white/70">
                Organize your tasks and track your virtual earnings
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <KanbanBoard className="w-full" onStartTiming={handleStartTiming} />
            </div>
          </div>
        </KanbanProvider>
      </main>
    </Layout>
  )
}
