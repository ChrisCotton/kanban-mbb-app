'use client'

import React from 'react'
import Head from 'next/head'
import VisionBoardCarousel from '../vision-board/VisionBoardCarousel'
import Navigation from './Navigation'
import MBBTimerSection from '../timer/MBBTimerSection'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  showCarousel?: boolean
  showNavigation?: boolean
  showTimer?: boolean
  carouselImages?: any[] // Will be properly typed when we have the full vision board system
  activeTask?: {
    id: string
    title: string
    category?: {
      id: string
      name: string
      hourly_rate: number
      color?: string
    }
  } | null
  userId?: string
  onTaskSelect?: () => void
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'Mental Bank Balance - Kanban Board',
  description = 'Track your productivity and calculate virtual earnings with our innovative Kanban board system.',
  showCarousel = true,
  showNavigation = true,
  showTimer = true,
  carouselImages = [],
  activeTask,
  userId,
  onTaskSelect
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>

        {/* Persistent Layout Structure */}
        <div className="relative z-10 flex flex-col min-h-screen">
          
          {/* Vision Board Carousel Header */}
          {showCarousel && (
            <div className="w-full bg-black/20 backdrop-blur-sm border-b border-white/10">
              <VisionBoardCarousel 
                images={carouselImages}
                height="h-48 md:h-64"
                autoAdvanceInterval={8000}
                showControls={true}
                showCounter={true}
              />
            </div>
          )}

          {/* Navigation Header */}
          {showNavigation && (
            <Navigation />
          )}

          {/* Main Content Area - Flexible Height */}
          <main className="flex-1">
            {children}
          </main>

          {/* MBB Timer Footer */}
          {showTimer && (
            <MBBTimerSection 
              activeTask={activeTask}
              userId={userId}
              onTaskSelect={onTaskSelect}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default Layout 