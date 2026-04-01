'use client'

import Image from 'next/image'
import { useState, type SyntheticEvent } from 'react'
import {
  isVisionBoardVideo,
  visionBoardVideoThumbnailSrc,
} from '@/lib/utils/vision-board-media'

export type VisionBoardMediaThumbProps = {
  src: string
  mediaType?: 'image' | 'video' | null
  alt: string
  /** When true, parent must be `position: relative` and the thumb fills the box. */
  fill?: boolean
  className?: string
  sizes?: string
  unoptimized?: boolean
  onImageError?: (e: SyntheticEvent<HTMLImageElement, Event>) => void
}

export default function VisionBoardMediaThumb({
  src,
  mediaType,
  alt,
  fill = false,
  className,
  sizes,
  unoptimized,
  onImageError,
}: VisionBoardMediaThumbProps) {
  const [videoFailed, setVideoFailed] = useState(false)
  const isVideo = isVisionBoardVideo(mediaType, src)

  const videoClass = fill
    ? `absolute inset-0 h-full w-full ${className || 'object-cover'}`.trim()
    : (className || 'w-full h-full object-cover').trim()

  const imageFillClass = className || 'object-cover'
  const imgNativeClass = className || 'w-full h-full object-cover'

  if (isVideo && !videoFailed) {
    return (
      <video
        src={visionBoardVideoThumbnailSrc(src)}
        className={videoClass}
        muted
        playsInline
        preload="metadata"
        aria-label={alt}
        onLoadedMetadata={(e) => {
          try {
            const v = e.currentTarget
            if (v.duration && !Number.isNaN(v.duration)) {
              v.currentTime = Math.min(0.05, v.duration * 0.01)
            } else {
              v.currentTime = 0.001
            }
          } catch {
            /* decode/seek may fail on some sources */
          }
        }}
        onError={() => setVideoFailed(true)}
      />
    )
  }

  if (isVideo && videoFailed) {
    return (
      <div
        className={`${videoClass} flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-800 text-white text-2xl`}
        aria-label={alt}
        role="img"
      >
        🎬
      </div>
    )
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={imageFillClass}
        sizes={sizes}
        unoptimized={unoptimized ?? src.startsWith('/api/placeholder')}
        onError={onImageError}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={imgNativeClass}
      loading="lazy"
      onError={onImageError}
    />
  )
}
