'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { getActiveCarouselImages, recordImageView } from '../../lib/database/vision-board-queries'
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
  is_active?: boolean // Support for active/inactive status
  view_count?: number
  media_type?: 'image' | 'video' // Add media type support
  goal?: string
  due_date?: string
}

interface VisionBoardCarouselProps {
  images?: VisionBoardImage[]
  userId?: string // For loading active images from database
  autoAdvanceInterval?: number // milliseconds
  height?: string
  showControls?: boolean
  showCounter?: boolean
  className?: string
  onImageView?: (imageId: string) => void // Callback when image is viewed
}

// Helper function to check if an image has a goal
const hasGoal = (image: VisionBoardImage): boolean => {
  return !!(image.goal && image.goal.trim().length > 0)
}

const VisionBoardCarousel: React.FC<VisionBoardCarouselProps> = ({
  images = [],
  userId,
  autoAdvanceInterval = 8000, // 8 seconds default
  height = 'h-[50vh] md:h-[60vh]',
  showControls = true,
  showCounter = true,
  className = '',
  onImageView
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [loadedImages, setLoadedImages] = useState<VisionBoardImage[]>([])
  const [loadingFromDB, setLoadingFromDB] = useState(false)
  const { enabled: goalTextEnabled } = useGoalTextPreference()
  const { enabled: fileNameEnabled } = useFileNamePreference()
  
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

  // Load active images from database if userId is provided and no images prop
  useEffect(() => {
    if (userId && images.length === 0) {
      setLoadingFromDB(true)
      getActiveCarouselImages(userId)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error loading carousel images:', error)
          } else {
            setLoadedImages(data || [])
          }
        })
        .finally(() => setLoadingFromDB(false))
    }
  }, [userId, images.length])

  // Record image view when current image changes (with debounce)
  useEffect(() => {
    if (!userId) return
    
    const activeImages = images.length > 0 ? images : loadedImages
    const currentImage = activeImages[currentIndex]
    
    if (currentImage && !currentImage.id.startsWith('placeholder-')) {
      const timeoutId = setTimeout(async () => {
        try {
          await recordImageView(currentImage.id, userId)
          if (onImageView) {
            onImageView(currentImage.id)
          }
        } catch (error) {
          console.error('Error recording image view:', error)
        }
      }, 2000) // Record view after 2 seconds of viewing

      return () => clearTimeout(timeoutId)
    }
  }, [currentIndex, images, loadedImages, userId, onImageView])
  
  // Helper to create data URL placeholder (no API calls needed)
  const createPlaceholderDataUrl = (text: string, width: number = 800, height: number = 400): string => {
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(%23grad)"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" 
            font-weight="bold" text-anchor="middle" dominant-baseline="middle" 
            fill="white" text-shadow="2px 2px 4px rgba(0,0,0,0.8)">${text}</text>
      <text x="50%" y="70%" font-family="Arial, sans-serif" font-size="14" 
            text-anchor="middle" dominant-baseline="middle" 
            fill="rgba(255,255,255,0.8)">${width} × ${height}</text>
    </svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }

  // If no images provided, use placeholder data
  const placeholderImages: VisionBoardImage[] = [
    {
      id: 'placeholder-1',
      file_path: createPlaceholderDataUrl('Your Vision Board 1'),
      title: 'Upload Your Vision',
      alt_text: 'Placeholder vision board image 1',
      description: 'Add inspiring images to motivate your journey',
      display_order: 0,
      width_px: 800,
      height_px: 400
    },
    {
      id: 'placeholder-2', 
      file_path: createPlaceholderDataUrl('Dreams & Goals'),
      title: 'Visualize Success',
      alt_text: 'Placeholder vision board image 2',
      description: 'Let your goals inspire daily productivity',
      display_order: 1,
      width_px: 800,
      height_px: 400
    },
    {
      id: 'placeholder-3',
      file_path: createPlaceholderDataUrl('Achievement Unlocked'),
      title: 'Track Progress',
      alt_text: 'Placeholder vision board image 3', 
      description: 'Watch your mental bank balance grow',
      display_order: 2,
      width_px: 800,
      height_px: 400
    }
  ]
  
  // Determine which images to display
  const getDisplayImages = () => {
    if (images.length > 0) {
      // Filter to only active images if is_active property exists
      return images.filter(img => img.is_active !== false)
    } else if (loadedImages.length > 0) {
      // Loaded images from DB are already filtered to active only
      return loadedImages
    } else if (loadingFromDB) {
      // Show empty array while loading
      return []
    } else {
      // Show placeholders
      return placeholderImages
    }
  }

  const displayImages = getDisplayImages()
  const totalImages = displayImages.length

  // Auto-advance functionality
  const goToNext = useCallback(() => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev + 1) % totalImages)
    
    setTimeout(() => {
      setIsTransitioning(false)
    }, 500) // Match CSS transition duration
  }, [totalImages, isTransitioning])

  const goToPrevious = useCallback(() => {
    if (isTransitioning) return
    
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages)
    
    setTimeout(() => {
      setIsTransitioning(false)
    }, 500)
  }, [totalImages, isTransitioning])

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex) return
    
    setIsTransitioning(true)
    setCurrentIndex(index)
    
    setTimeout(() => {
      setIsTransitioning(false)
    }, 500)
  }, [currentIndex, isTransitioning])

  // Auto-advance timer
  useEffect(() => {
    if (totalImages <= 1 || isPaused) return

    const interval = setInterval(() => {
      goToNext()
    }, autoAdvanceInterval)

    return () => clearInterval(interval)
  }, [goToNext, autoAdvanceInterval, totalImages, isPaused])

  // Pause on hover
  const handleMouseEnter = () => setIsPaused(true)
  const handleMouseLeave = () => setIsPaused(false)

  // Loading state
  if (loadingFromDB) {
    return (
      <div className={`${height} ${className} flex items-center justify-center bg-black/20 backdrop-blur-sm`}>
        <div className="text-center text-white/60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60 mx-auto mb-3"></div>
          <div className="text-lg font-medium mb-2">Loading Vision Board</div>
          <div className="text-sm">Fetching your inspirational images...</div>
        </div>
      </div>
    )
  }

  // Empty state
  if (totalImages === 0) {
    return (
      <div className={`${height} ${className} flex items-center justify-center bg-black/20 backdrop-blur-sm`}>
        <div className="text-center text-white/60">
          <div className="text-lg font-medium mb-2">
            {userId ? 'No Active Vision Board Images' : 'No Vision Board Images'}
          </div>
          <div className="text-sm">
            {userId 
              ? 'Activate some images in your vision board manager to see them here'
              : 'Upload images to inspire your productivity journey'
            }
          </div>
        </div>
      </div>
    )
  }

  const currentImage = displayImages[currentIndex]

  return (
    <div 
      className={`${height} ${className} relative overflow-hidden bg-black/20 backdrop-blur-sm`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image Display */}
      <div className="relative w-full h-full">
        {displayImages.map((image, index) => (
          <div
            key={image.id}
            className={`absolute inset-0 transition-all duration-500 ease-in-out ${
              index === currentIndex 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-105'
            }`}
          >
            {/* Background Media with Overlay */}
            <div className="absolute inset-0">
              {/* Render video or image based on media_type */}
              {image.media_type === 'video' || image.file_path?.toLowerCase().endsWith('.mp4') || image.file_path?.toLowerCase().endsWith('.mov') || image.file_path?.toLowerCase().endsWith('.webm') ? (
                <video
                  src={image.file_path}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={(e) => {
                    console.error('Video failed to load:', image.file_path)
                  }}
                />
              ) : (
                <Image
                  src={image.file_path}
                  alt={image.alt_text || image.title || 'Vision board image'}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  priority={index === 0}
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    e.currentTarget.src = `/api/placeholder/800/400?text=Image+Error`
                  }}
                />
              )}
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
            </div>

            {/* Image Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="max-w-2xl">
                {/* Goal Text with Due Date - Prominent if enabled */}
                {goalTextEnabled && hasGoal(image) && (
                  <div className="mb-4 bg-black/25 backdrop-blur-lg rounded-xl px-6 py-4 border border-white/20">
                    <p className="text-2xl md:text-3xl font-bold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {image.goal}
                      {image.due_date && (() => {
                        const interval = getClosestInterval(image.due_date)
                        const option = INTERVAL_OPTIONS.find(opt => opt.value === interval)
                        return (
                          <span className="ml-3 text-lg md:text-xl font-normal text-white/90">
                            {'=> '}
                            {formatDueDate(image.due_date)}
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
                )}
                {/* Title/Filename display */}
                {/* Show title only if: 
                    1. fileNameEnabled is true (show all titles including filename-like ones), OR
                    2. The title does NOT look like a filename (always show human-friendly titles)
                    When fileNameEnabled is false and title looks like a filename, hide it.
                */}
                {image.title && (fileNameEnabled || !titleLooksLikeFileName(image.title)) && (
                  <h3 className="text-xl md:text-2xl font-bold mb-2 drop-shadow-lg">
                    {image.title}
                  </h3>
                )}
                {image.description && (
                  <p className="text-sm md:text-base text-white/90 drop-shadow">
                    {image.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      {showControls && totalImages > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={goToPrevious}
            disabled={isTransitioning}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={goToNext}
            disabled={isTransitioning}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Image Counter */}
      {showCounter && totalImages > 1 && (
        <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
          {currentIndex + 1} of {totalImages}
        </div>
      )}

      {/* Dot Indicators */}
      {totalImages > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Loading State */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      )}
    </div>
  )
}

export default VisionBoardCarousel 