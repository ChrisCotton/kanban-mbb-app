'use client'

import React, { useEffect } from 'react'
import Head from 'next/head'
import VisionBoardCarousel from '../vision-board/VisionBoardCarousel'
import InspirationalQuotesStrip from '../quotes/InspirationalQuotesStrip'
import Navigation from './Navigation'
import MBBTimerSection from '../timer/MBBTimerSection'
import { useCarouselPreference } from '../../hooks/useCarouselPreference'
import {
  useCarouselFullscreenPreference,
  COMPACT_CAROUSEL_HEIGHT,
  IMMERSIVE_CAROUSEL_HEIGHT,
} from '../../hooks/useCarouselFullscreenPreference'

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
    category_id?: string | null
    category?: {
      id: string
      name: string
      hourly_rate_usd: number
      hourly_rate?: number
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
  const { enabled: carouselEnabled } = useCarouselPreference()
  const { enabled: carouselFullscreen, setEnabled: setCarouselFullscreen } =
    useCarouselFullscreenPreference()

  const showCompactCarousel = showCarousel && carouselEnabled && !carouselFullscreen
  const showImmersiveCarousel = showCarousel && carouselEnabled && carouselFullscreen

  useEffect(() => {
    if (typeof document === 'undefined') return

    if (showImmersiveCarousel) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [showImmersiveCarousel])
  
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
          
          {/* Navigation Header - Fixed Overlay */}
          {showNavigation && !showImmersiveCarousel && (
            <div className="fixed top-0 inset-x-0 z-50">
              <Navigation />
            </div>
          )}

          {/* Monitor fullscreen: carousel + quotes only. Exit via Esc or the button. */}
          {showImmersiveCarousel && (
            <div
              data-testid="immersive-carousel-shell"
              className="fixed inset-0 z-[100] flex flex-col bg-black"
            >
              <button
                type="button"
                onClick={() => {
                  void setCarouselFullscreen(false)
                }}
                className="absolute top-4 right-4 z-[110] px-3 py-1.5 rounded-md bg-black/50 hover:bg-black/70 text-white text-sm border border-white/20 backdrop-blur-sm"
                aria-label="Exit monitor fullscreen"
                title="Exit monitor fullscreen (Esc)"
              >
                Exit fullscreen
              </button>
              <VisionBoardCarousel 
                images={carouselImages}
                height={IMMERSIVE_CAROUSEL_HEIGHT}
                autoAdvanceInterval={8000}
                showControls={true}
                showCounter={true}
              />
              <InspirationalQuotesStrip userId={userId} className="flex-shrink-0 border-t border-white/10" />
            </div>
          )}

          {/* Compact carousel header */}
          {showCompactCarousel && (
            <div className="w-full pt-16 bg-black/20 backdrop-blur-sm border-b border-white/10 flex flex-col">
              <VisionBoardCarousel 
                images={carouselImages}
                height={COMPACT_CAROUSEL_HEIGHT}
                autoAdvanceInterval={8000}
                showControls={true}
                showCounter={true}
              />
              <InspirationalQuotesStrip userId={userId} />
            </div>
          )}

          {/* Main Content Area - hidden in immersive fullscreen */}
          {!showImmersiveCarousel && (
            <main
              className={`flex-1 ${
                showNavigation && !showCompactCarousel ? 'pt-16' : ''
              }`}
            >
              {children}
            </main>
          )}

          {/* MBB Timer Footer - hidden in immersive fullscreen */}
          {showTimer && !showImmersiveCarousel && (
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
