'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { getActiveCarouselImages, recordImageView } from '../../lib/database/vision-board-queries'

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

const VisionBoardCarousel: React.FC<VisionBoardCarouselProps> = ({
  images = [],
  userId,
  autoAdvanceInterval = 8000, // 8 seconds default
  height = 'h-48 md:h-64',
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
  
  // If no images provided, use placeholder data
  const placeholderImages: VisionBoardImage[] = [
    {
      id: 'placeholder-1',
      file_path: '/api/placeholder/800/400?text=Your+Vision+Board+1',
      title: 'Upload Your Vision',
      alt_text: 'Placeholder vision board image 1',
      description: 'Add inspiring images to motivate your journey',
      display_order: 0,
      width_px: 800,
      height_px: 400
    },
    {
      id: 'placeholder-2', 
      file_path: '/api/placeholder/800/400?text=Dreams+%26+Goals',
      title: 'Visualize Success',
      alt_text: 'Placeholder vision board image 2',
      description: 'Let your goals inspire daily productivity',
      display_order: 1,
      width_px: 800,
      height_px: 400
    },
    {
      id: 'placeholder-3',
      file_path: '/api/placeholder/800/400?text=Achievement+Unlocked',
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
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
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
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
            </div>

            {/* Image Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="max-w-2xl">
                {image.title && (
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