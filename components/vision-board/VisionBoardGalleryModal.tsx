'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useGoalTextPreference } from '../../hooks/useGoalTextPreference'
import { useFileNamePreference } from '../../hooks/useFileNamePreference'
import { getClosestInterval, formatDueDate, INTERVAL_OPTIONS } from '../../lib/utils/due-date-intervals'

interface VisionBoardImage {
  id: string
  file_path: string
  title?: string
  alt_text?: string
  description?: string
  display_order: number
  width_px?: number
  height_px?: number
  is_active?: boolean
  view_count?: number
  media_type?: 'image' | 'video'
  goal?: string
  due_date?: string
}

interface VisionBoardGalleryModalProps {
  images: VisionBoardImage[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
  selectedImageIds?: string[]
}

// Helper function to check if an image has a goal
const hasGoal = (image: VisionBoardImage): boolean => {
  return !!(image.goal && image.goal.trim().length > 0)
}

const VisionBoardGalleryModal: React.FC<VisionBoardGalleryModalProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showMetadata, setShowMetadata] = useState(true)
  const [showGoalText, setShowGoalText] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.9)
  const [isPlaying, setIsPlaying] = useState(false)
  const [slideInterval, setSlideInterval] = useState(10) // in seconds, minimum 10
  const { enabled: goalTextPreferenceEnabled } = useGoalTextPreference()
  const { enabled: fileNameEnabled } = useFileNamePreference()
  
  // Combine local toggle with global preference
  const shouldShowGoalText = showGoalText && goalTextPreferenceEnabled
  
  // Helper function to extract file name from file_path
  const getFileName = (filePath: string): string => {
    if (!filePath) return ''
    // Extract filename from path (handle both / and \ separators)
    const parts = filePath.split(/[/\\]/)
    const fileName = parts[parts.length - 1]
    // Remove extension and replace underscores/hyphens with spaces
    return fileName.split('.')[0].replace(/[_-]/g, ' ')
  }

  // Helper function to check if title looks like a filename
  // This detects patterns like "MBB_LAUNCH", "Rocket-Launch-Video", etc.
  const titleLooksLikeFileName = (title: string): boolean => {
    if (!title) return false
    const trimmed = title.trim()
    
    // Check for common filename patterns:
    // 1. Contains underscores or hyphens (common in filenames but not human-friendly titles)
    const hasFilenameSeparators = /[_-]/.test(trimmed)
    
    // 2. Is all uppercase with separators (like "MBB_LAUNCH")
    const isUppercaseWithSeparators = /^[A-Z0-9_-]+$/.test(trimmed)
    
    // 3. Matches typical file naming patterns (CamelCase with numbers, etc.)
    const looksLikeGeneratedName = /^\d+-[a-z0-9]+$/.test(trimmed) // e.g., "1705924532123-abc123"
    
    // 4. No spaces but has multiple words indicated by case changes or separators
    const noSpaces = !/\s/.test(trimmed)
    const hasMultipleWords = /[_-]/.test(trimmed) || /[a-z][A-Z]/.test(trimmed)
    
    // Consider it a filename if it has separators and no spaces, or matches generated patterns
    return (hasFilenameSeparators && noSpaces) || isUppercaseWithSeparators || looksLikeGeneratedName
  }

  // Update current index when initialIndex changes
  useEffect(() => {
    if (isOpen && initialIndex >= 0 && initialIndex < images.length) {
      setCurrentIndex(initialIndex)
    }
  }, [isOpen, initialIndex, images.length])

  // Reset goal text visibility when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowGoalText(true)
    }
  }, [isOpen])

  // Fullscreen API handlers
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // Navigation functions - defined before useEffect hooks that use them
  const goToNext = useCallback(() => {
    if (isTransitioning || images.length === 0) return
    setIsTransitioning(true)
    setIsPlaying(false) // Pause slideshow on manual navigation
    setCurrentIndex((prev) => (prev + 1) % images.length)
    setTimeout(() => setIsTransitioning(false), 300)
  }, [images.length, isTransitioning])

  const goToPrevious = useCallback(() => {
    if (isTransitioning || images.length === 0) return
    setIsTransitioning(true)
    setIsPlaying(false) // Pause slideshow on manual navigation
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    setTimeout(() => setIsTransitioning(false), 300)
  }, [images.length, isTransitioning])

  const goToImage = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex || index < 0 || index >= images.length) return
    setIsTransitioning(true)
    setIsPlaying(false) // Pause slideshow on manual navigation
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 300)
  }, [currentIndex, images.length, isTransitioning])

  // Auto-advance slideshow when playing
  useEffect(() => {
    if (!isOpen || !isPlaying || images.length <= 1) return

    const intervalId = setInterval(() => {
      goToNext()
    }, slideInterval * 1000)

    return () => clearInterval(intervalId)
  }, [isOpen, isPlaying, slideInterval, images.length, goToNext])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          onClose()
        }
      } else if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      } else if (e.key === 'm' || e.key === 'M') {
        setShowMetadata(prev => !prev)
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGoalText(prev => !prev)
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        setIsPlaying(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, images.length, onClose, toggleFullscreen, goToNext, goToPrevious])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Touch/swipe handlers for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }
  }

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentIndex]
  const isVideo = currentImage.media_type === 'video' || 
    currentImage.file_path?.toLowerCase().endsWith('.mp4') || 
    currentImage.file_path?.toLowerCase().endsWith('.mov') || 
    currentImage.file_path?.toLowerCase().endsWith('.webm')

  const backgroundOpacityPercent = Math.round(backgroundOpacity * 100)

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})` }}
      onClick={(e) => {
        // Close on backdrop click (but not on content click)
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Control Buttons Row */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          {/* Goal Text Toggle */}
          <button
            onClick={() => setShowGoalText(prev => !prev)}
            className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200"
            aria-label={`${showGoalText ? 'Hide' : 'Show'} goal text`}
            title={`Goal Text: ${showGoalText ? 'On' : 'Off'} (Press G)`}
          >
            {showGoalText ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
          </button>

          {/* Metadata Toggle */}
          <button
            onClick={() => setShowMetadata(prev => !prev)}
            className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200"
            aria-label="Toggle metadata"
            title="Toggle Metadata (Press M)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Play/Pause Button */}
          {images.length > 1 && (
            <button
              onClick={() => setIsPlaying(prev => !prev)}
              className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200"
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              title={`${isPlaying ? 'Pause' : 'Play'} Slideshow (Press Space)`}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          )}

          {/* Background Opacity Slider */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white text-xs whitespace-nowrap">Opacity:</span>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={backgroundOpacity}
              onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
              className="w-20 accent-white/80"
              aria-label="Background opacity"
            />
            <span className="text-white text-xs w-10 text-right">{backgroundOpacityPercent}%</span>
          </div>

          {/* Slide Interval Control */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="text-white text-xs whitespace-nowrap">Interval:</span>
              <input
                type="number"
                min="10"
                step="1"
                value={slideInterval}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (!isNaN(value) && value >= 10) {
                    setSlideInterval(value)
                  }
                }}
                className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Slide interval in seconds"
              />
              <span className="text-white text-xs whitespace-nowrap">sec</span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200"
            aria-label={`${isFullscreen ? 'Exit' : 'Enter'} fullscreen`}
            title={`${isFullscreen ? 'Exit' : 'Enter'} Fullscreen (Press F)`}
          >
            {isFullscreen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-3 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200"
            aria-label="Close gallery"
            title="Close (Press Esc)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={goToPrevious}
            disabled={isTransitioning}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-4 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous image"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Media Display */}
        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
          <div className={`relative w-full max-w-7xl h-full max-h-[90vh] transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}>
            {isVideo ? (
              <video
                src={currentImage.file_path}
                className="w-full h-full object-contain rounded-lg"
                autoPlay
                loop
                muted
                playsInline
                controls
                onError={(e) => {
                  console.error('Video failed to load:', currentImage.file_path)
                }}
              />
            ) : (
              <Image
                src={currentImage.file_path}
                alt={currentImage.alt_text || currentImage.title || 'Vision board image'}
                fill
                className="object-contain rounded-lg"
                sizes="100vw"
                priority
                unoptimized={currentImage.file_path?.startsWith('/api/placeholder')}
                onError={(e) => {
                  // Prevent infinite retry loops - only set placeholder once
                  if (!e.currentTarget.src.includes('data:image')) {
                    // Use data URL placeholder instead of API call
                    const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(`
                      <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                          </linearGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="url(%23grad)"/>
                        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" 
                              font-weight="bold" text-anchor="middle" dominant-baseline="middle" 
                              fill="white">Image Error</text>
                      </svg>
                    `)}`
                    e.currentTarget.src = placeholderSvg
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={goToNext}
            disabled={isTransitioning}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-4 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next image"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
            {currentIndex + 1} of {images.length}
          </div>
        )}

        {/* Goal Text Overlay with Due Date - Prominent if enabled */}
        {shouldShowGoalText && currentImage && hasGoal(currentImage) && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10 max-w-4xl w-full mx-4">
            <div className="bg-black/25 backdrop-blur-lg rounded-xl px-6 py-4 border border-white/20">
              <p className="text-2xl md:text-3xl font-bold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center">
                {currentImage.goal}
                {currentImage.due_date && (() => {
                  const interval = getClosestInterval(currentImage.due_date)
                  const option = INTERVAL_OPTIONS.find(opt => opt.value === interval)
                  return (
                    <span className="ml-3 text-lg md:text-xl font-normal text-white/90">
                      {'=> '}
                      {formatDueDate(currentImage.due_date)}
                      <span 
                        className="inline-block w-3 h-3 rounded-full ml-2"
                        style={{ 
                          backgroundColor: option?.color === 'red' ? '#ef4444' :
                                           option?.color === 'rose' ? '#f43f5e' :
                                           option?.color === 'orange' ? '#f97316' :
                                           option?.color === 'amber' ? '#f59e0b' :
                                           option?.color === 'yellow' ? '#eab308' :
                                           option?.color === 'lime' ? '#84cc16' :
                                           option?.color === 'green' ? '#22c55e' :
                                           option?.color === 'cyan' ? '#06b6d4' :
                                           option?.color === 'blue' ? '#3b82f6' :
                                           '#6b7280'
                        }}
                      />
                    </span>
                  )
                })()}
              </p>
            </div>
          </div>
        )}
        
        {/* File Name Display - shows the title (which contains original filename) when it looks like a filename */}
        {fileNameEnabled && currentImage && currentImage.title && titleLooksLikeFileName(currentImage.title) && (
          <div className="absolute top-48 left-1/2 -translate-x-1/2 z-10 max-w-4xl w-full mx-4">
            <p className="text-sm md:text-base text-white/90 drop-shadow-lg text-center">
              {currentImage.title.replace(/[_-]/g, ' ')}
            </p>
          </div>
        )}

        {/* Metadata Overlay */}
        {showMetadata && currentImage && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-black/70 backdrop-blur-md text-white rounded-lg p-6 max-w-2xl w-full mx-4">
            {/* Show title only if file name preference is enabled, or if title doesn't look like a filename */}
            {currentImage.title && (fileNameEnabled || !titleLooksLikeFileName(currentImage.title)) && (
              <h3 className="text-2xl font-bold mb-2">{currentImage.title}</h3>
            )}
            {currentImage.description && (
              <p className="text-white/90 mb-4">{currentImage.description}</p>
            )}
            {/* Only show goal in metadata if not showing prominent goal text overlay */}
            {currentImage.goal && !shouldShowGoalText && (
              <div className="mb-2">
                <span className="text-white/70 text-sm">Goal: </span>
                <span className="text-white font-medium">{currentImage.goal}</span>
              </div>
            )}
            {currentImage.due_date && (
              <div className="mb-2">
                <span className="text-white/70 text-sm">Due Date: </span>
                <span className="text-white font-medium">
                  {new Date(currentImage.due_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
            {currentImage.view_count !== undefined && (
              <div className="text-white/60 text-sm mt-4">
                {currentImage.view_count} view{currentImage.view_count !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="h-32 bg-black/50 backdrop-blur-sm border-t border-white/10 overflow-x-auto">
          <div className="flex items-center justify-center h-full gap-2 px-4 py-2">
            {images.map((image, index) => {
              const isThumbnailVideo = image.media_type === 'video' || 
                image.file_path?.toLowerCase().endsWith('.mp4') || 
                image.file_path?.toLowerCase().endsWith('.mov') || 
                image.file_path?.toLowerCase().endsWith('.webm')

              return (
                <button
                  key={image.id}
                  onClick={() => goToImage(index)}
                  className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden transition-all duration-200 ${
                    index === currentIndex
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                >
                  {isThumbnailVideo ? (
                    <video
                      src={image.file_path}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <Image
                      src={image.file_path}
                      alt={image.alt_text || image.title || `Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  )}
                  {index === currentIndex && (
                    <div className="absolute inset-0 bg-white/20" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default VisionBoardGalleryModal
