'use client'

import React, { useState, useCallback } from 'react'
import Image from 'next/image'

interface VisionBoardImage {
  id: string
  file_path: string
  title?: string
  alt_text?: string
  description?: string
  display_order: number
  width_px?: number
  height_px?: number
  is_active: boolean
  view_count?: number
  created_at: string
}

interface ThumbnailGalleryProps {
  images: VisionBoardImage[]
  selectedImageIds?: string[]
  onImageSelect?: (imageId: string) => void
  onImageToggleActive?: (imageId: string) => void
  onImageReorder?: (imageIds: string[]) => void
  onImageDelete?: (imageId: string) => void
  allowMultiSelect?: boolean
  allowReorder?: boolean
  showActiveStatus?: boolean
  className?: string
  maxColumns?: number
}

const ThumbnailGallery: React.FC<ThumbnailGalleryProps> = ({
  images = [],
  selectedImageIds = [],
  onImageSelect,
  onImageToggleActive,
  onImageReorder,
  onImageDelete,
  allowMultiSelect = false,
  allowReorder = false,
  showActiveStatus = true,
  className = '',
  maxColumns = 4
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  // Handle image selection
  const handleImageClick = useCallback((imageId: string) => {
    if (onImageSelect) {
      onImageSelect(imageId)
    }
  }, [onImageSelect])

  // Handle active status toggle
  const handleToggleActive = useCallback((e: React.MouseEvent, imageId: string) => {
    e.stopPropagation()
    if (onImageToggleActive) {
      onImageToggleActive(imageId)
    }
  }, [onImageToggleActive])

  // Handle image deletion
  const handleDeleteImage = useCallback((e: React.MouseEvent, imageId: string) => {
    e.stopPropagation()
    if (onImageDelete && window.confirm('Are you sure you want to delete this image?')) {
      onImageDelete(imageId)
    }
  }, [onImageDelete])

  // Drag and drop handlers for reordering
  const handleDragStart = useCallback((e: React.DragEvent, imageId: string) => {
    if (!allowReorder) return
    setDraggedItem(imageId)
    e.dataTransfer.effectAllowed = 'move'
  }, [allowReorder])

  const handleDragOver = useCallback((e: React.DragEvent, imageId: string) => {
    if (!allowReorder || !draggedItem) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(imageId)
  }, [allowReorder, draggedItem])

  const handleDragLeave = useCallback(() => {
    if (!allowReorder) return
    setDragOverItem(null)
  }, [allowReorder])

  const handleDrop = useCallback((e: React.DragEvent, targetImageId: string) => {
    if (!allowReorder || !draggedItem || !onImageReorder) return
    e.preventDefault()

    const draggedIndex = images.findIndex(img => img.id === draggedItem)
    const targetIndex = images.findIndex(img => img.id === targetImageId)

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    // Reorder the images array
    const reorderedImages = [...images]
    const draggedImage = reorderedImages.splice(draggedIndex, 1)[0]
    reorderedImages.splice(targetIndex, 0, draggedImage)

    // Call the reorder callback with new order
    onImageReorder(reorderedImages.map(img => img.id))

    setDraggedItem(null)
    setDragOverItem(null)
  }, [allowReorder, draggedItem, images, onImageReorder])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverItem(null)
  }, [])

  // Generate grid columns class based on maxColumns
  const getGridCols = () => {
    switch (maxColumns) {
      case 2: return 'grid-cols-2'
      case 3: return 'grid-cols-2 md:grid-cols-3'
      case 4: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      case 5: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
      case 6: return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
      default: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    }
  }

  if (images.length === 0) {
    return (
      <div className={`${className} py-12`}>
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">No Images Yet</h3>
          <p className="text-sm">Upload your first vision board image to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className={`grid gap-4 ${getGridCols()}`}>
        {images.map((image) => {
          const isSelected = selectedImageIds.includes(image.id)
          const isDragging = draggedItem === image.id
          const isDragOver = dragOverItem === image.id

          return (
            <div
              key={image.id}
              className={`relative group cursor-pointer transition-all duration-200 ${
                isDragging ? 'opacity-50 scale-95' : ''
              } ${
                isDragOver ? 'scale-105 shadow-lg' : ''
              } ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleImageClick(image.id)}
              draggable={allowReorder}
              onDragStart={(e) => handleDragStart(e, image.id)}
              onDragOver={(e) => handleDragOver(e, image.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, image.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Image Container */}
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={image.file_path}
                  alt={image.alt_text || image.title || 'Vision board image'}
                  fill
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  onError={(e) => {
                    e.currentTarget.src = `/api/placeholder/300/300?text=Error`
                  }}
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

                {/* Active/Inactive Status Indicator */}
                {showActiveStatus && (
                  <div className={`absolute top-2 left-2 w-3 h-3 rounded-full border-2 border-white ${
                    image.is_active ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                  {/* Toggle Active Status */}
                  {onImageToggleActive && (
                    <button
                      onClick={(e) => handleToggleActive(e, image.id)}
                      className={`p-1.5 rounded-full text-white text-xs transition-colors ${
                        image.is_active 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-gray-500 hover:bg-gray-600'
                      }`}
                      title={image.is_active ? 'Deactivate from carousel' : 'Activate for carousel'}
                    >
                      {image.is_active ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Delete Button */}
                  {onImageDelete && (
                    <button
                      onClick={(e) => handleDeleteImage(e, image.id)}
                      className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                      title="Delete image"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Drag Handle */}
                {allowReorder && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-move">
                    <div className="p-1 bg-black/50 rounded text-white">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Info */}
              <div className="mt-2 space-y-1">
                {image.title && (
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {image.title}
                  </h4>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Order: {image.display_order}</span>
                  {image.view_count !== undefined && (
                    <span>{image.view_count} views</span>
                  )}
                </div>
                {!image.is_active && (
                  <div className="text-xs text-red-500 font-medium">Inactive</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Drag and Drop Instructions */}
      {allowReorder && images.length > 1 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Drag and drop images to reorder them in the carousel
        </div>
      )}
    </div>
  )
}

export default ThumbnailGallery