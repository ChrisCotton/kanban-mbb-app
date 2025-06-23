import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import CalendarView from '../components/calendar/CalendarView'

const CalendarPage = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visionBoardImages, setVisionBoardImages] = useState([])
  const [loading, setLoading] = useState(true)

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
      {/* Calendar Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Task Calendar</h1>
            <p className="text-white/70">
              View and manage your tasks by their due dates. Click on any date to see tasks scheduled for that day.
            </p>
          </div>
          
          <CalendarView userId={user?.id} />
        </div>
      </main>
    </Layout>
  )
}

export default CalendarPage 