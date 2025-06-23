import React from 'react'
import Layout from '@/components/layout/Layout'
import VisionBoardCarousel from '@/components/vision-board/VisionBoardCarousel'
import JournalView from '@/components/journal/JournalView'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

const JournalPage = ({ user, visionBoardImages }) => {
  return (
    <Layout>
      {/* Hero Vision Board Carousel */}
      <section className="w-full">
        <VisionBoardCarousel 
          images={visionBoardImages}
          userId={user?.id}
          className="h-64 md:h-80 lg:h-96"
        />
      </section>

      {/* Journal Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Audio Journal</h1>
            <p className="text-gray-600">
              Record your thoughts and ideas as audio entries. Your recordings will be automatically transcribed and you can edit the transcripts using markdown formatting.
            </p>
          </div>
          
          <JournalView userId={user?.id} />
        </div>
      </main>
    </Layout>
  )
}

export const getServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx)
  
  // Get user session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }

  // Get active vision board images for carousel
  const { data: visionBoardImages } = await supabase
    .from('vision_board_images')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return {
    props: {
      user: session.user,
      visionBoardImages: visionBoardImages || [],
    },
  }
}

export default JournalPage 