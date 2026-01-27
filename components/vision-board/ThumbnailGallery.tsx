'use client'

import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { 
  DueDateInterval, 
  INTERVAL_OPTIONS, 
  getDateFromInterval, 
  getClosestInterval,
  getDateColorStyles,
  formatDueDateISO,
  formatDueDate
} from '@/lib/utils/due-date-intervals'
import { parseLocalDate } from '@/lib/utils/date-helpers'

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
  goal: string
  goal_id?: string | null
  due_date: string
  media_type: 'image' | 'video'
  generation_prompt?: string | null
  ai_provider?: string | null
}

interface ThumbnailGalleryProps {
  images: VisionBoardImage[]
  selectedImageIds?: string[]
  onImageSelect?: (imageId: string) => void
  onImageClick?: (imageId: string, index: number) => void
  onImageToggleActive?: (imageId: string) => void
  onImageReorder?: (imageIds: string[]) => void
  onImageDelete?: (imageId: string) => void
  onImageUpdate?: (imageId: string, updates: { goal?: string; due_date?: string }) => Promise<void>
  allowMultiSelect?: boolean
  allowReorder?: boolean
  showActiveStatus?: boolean
  className?: string
  maxColumns?: number
  userId?: string
}

const ThumbnailGallery: React.FC<ThumbnailGalleryProps> = ({
  images = [],
  selectedImageIds = [],
  onImageSelect,
  onImageClick,
  onImageToggleActive,
  onImageReorder,
  onImageDelete,
  onImageUpdate,
  allowMultiSelect = false,
  allowReorder = false,
  showActiveStatus = true,
  className = '',
  maxColumns = 4,
  userId
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [editGoal, setEditGoal] = useState('')
  const [editInterval, setEditInterval] = useState<DueDateInterval>('one_month')
  const [editCustomDate, setEditCustomDate] = useState<Date | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Handle image click - opens gallery modal if onImageClick provided, otherwise selects
  const handleImageClick = useCallback((imageId: string, index: number) => {
    if (onImageClick) {
      // Open gallery modal
      onImageClick(imageId, index)
    } else if (onImageSelect) {
      // Fallback to selection behavior
      onImageSelect(imageId)
    }
  }, [onImageClick, onImageSelect])

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

  // Handle edit modal open
  const handleEditClick = useCallback((e: React.MouseEvent, image: VisionBoardImage) => {
    e.stopPropagation()
    setEditingImageId(image.id)
    setEditGoal(image.goal)
    
    // Find closest interval for current due_date
    // Use parseLocalDate to avoid timezone shifts
    const currentDate = parseLocalDate(image.due_date)
    const closestInterval = getClosestInterval(currentDate)
    setEditInterval(closestInterval)
    
    // If closest interval is custom, set custom date
    if (closestInterval === 'custom') {
      setEditCustomDate(currentDate)
    } else {
      setEditCustomDate(null)
    }
  }, [])

  // Handle edit modal close
  const handleEditClose = useCallback(() => {
    setEditingImageId(null)
    setEditGoal('')
    setEditInterval('one_month')
    setEditCustomDate(null)
  }, [])

  // Handle edit save
  const handleEditSave = useCallback(async () => {
    if (!editingImageId || !onImageUpdate) return

    // Validate
    if (!editGoal.trim()) {
      alert('Goal is required')
      return
    }

    const calculatedDueDate = editInterval === 'custom' && editCustomDate
      ? editCustomDate
      : getDateFromInterval(editInterval)

    if (editInterval === 'custom' && !editCustomDate) {
      alert('Please select a custom date')
      return
    }

    setIsUpdating(true)
    try {
      const dueDateISO = formatDueDateISO(calculatedDueDate)
      await onImageUpdate(editingImageId, {
        goal: editGoal.trim(),
        due_date: dueDateISO
      })
      handleEditClose()
    } catch (error: any) {
      console.error('Error updating image:', error)
      alert(error.message || 'Failed to update image')
    } finally {
      setIsUpdating(false)
    }
  }, [editingImageId, editGoal, editInterval, editCustomDate, onImageUpdate, handleEditClose])

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
              onClick={() => {
                const imageIndex = images.findIndex(img => img.id === image.id)
                handleImageClick(image.id, imageIndex)
              }}
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
                  unoptimized={image.file_path?.startsWith('/api/placeholder')}
                  onError={(e) => {
                    // Prevent infinite retry loops - only set placeholder once
                    if (!e.currentTarget.src.includes('data:image')) {
                      // Use data URL placeholder instead of API call
                      const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(`
                        <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                            </linearGradient>
                          </defs>
                          <rect width="100%" height="100%" fill="url(%23grad)"/>
                          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" 
                                font-weight="bold" text-anchor="middle" dominant-baseline="middle" 
                                fill="white">Error</text>
                        </svg>
                      `)}`
                      e.currentTarget.src = placeholderSvg
                    }
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

                {/* Media Type Indicator */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {image.media_type === 'video' ? (
                    <div className="px-2 py-1 bg-purple-500/80 rounded text-white text-xs font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Video
                    </div>
                  ) : (
                    <div className="px-2 py-1 bg-blue-500/80 rounded text-white text-xs font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Image
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                  {/* Edit Button */}
                  {onImageUpdate && (
                    <button
                      onClick={(e) => handleEditClick(e, image)}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-colors"
                      title="Edit goal and due date"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}

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
                  <h4 className="text-sm font-medium text-white truncate">
                    {image.title}
                  </h4>
                )}
                
                {/* Goal Display */}
                {image.goal && (
                  <div className="flex items-center gap-1">
                    {image.goal_id ? (
                      <a
                        href={`/goals?goal=${image.goal_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="text-xs text-blue-300 hover:text-blue-200 truncate flex items-center gap-1"
                        title={`View goal: ${image.goal}`}
                      >
                        <span>🎯</span>
                        <span className="underline">{image.goal}</span>
                      </a>
                    ) : (
                      <p className="text-xs text-white/80 truncate" title={image.goal}>
                        {image.goal}
                      </p>
                    )}
                  </div>
                )}

                {/* Due Date Badge with Color Coding */}
                {image.due_date && (() => {
                  const dateStyles = getDateColorStyles(image.due_date)
                  return (
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${dateStyles.bgColor} ${dateStyles.borderColor} ${dateStyles.textColor}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Due: {formatDueDate(image.due_date)}
                    </div>
                  )
                })()}

                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Order: {image.display_order}</span>
                  {image.view_count !== undefined && (
                    <span>{image.view_count} views</span>
                  )}
                </div>
                {!image.is_active && (
                  <div className="text-xs text-red-400 font-medium">Inactive</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Drag and Drop Instructions */}
      {allowReorder && images.length > 1 && (
        <div className="mt-4 text-center text-sm text-white/60">
          Drag and drop images to reorder them in the carousel
        </div>
      )}

      {/* Edit Modal */}
      {editingImageId && (() => {
        const editingImage = images.find(img => img.id === editingImageId)
        if (!editingImage) return null

        const calculatedEditDueDate = editInterval === 'custom' && editCustomDate
          ? editCustomDate
          : getDateFromInterval(editInterval)
        const editDateStyles = getDateColorStyles(calculatedEditDueDate)

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-white/20 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Edit Goal & Due Date</h3>
                <button
                  onClick={handleEditClose}
                  className="text-white/70 hover:text-white"
                  disabled={isUpdating}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Goal Input */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Goal <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    maxLength={500}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your goal..."
                    required
                  />
                  <p className="mt-1 text-xs text-white/60">{editGoal.length}/500 characters</p>
                </div>

                {/* Due Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Due Date <span className="text-red-400">*</span>
                  </label>
                  
                  <select
                    value={editInterval}
                    onChange={(e) => {
                      setEditInterval(e.target.value as DueDateInterval)
                      if (e.target.value !== 'custom') {
                        setEditCustomDate(null)
                      }
                    }}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  >
                    {INTERVAL_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {editInterval === 'custom' && (
                    <div className="mb-3">
                      <DatePicker
                        selected={editCustomDate}
                        onChange={(date: Date | null) => setEditCustomDate(date)}
                        dateFormat="MMMM d, yyyy"
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholderText="Select a custom date"
                        required
                      />
                    </div>
                  )}

                  {/* Date Preview */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${editDateStyles.bgColor} ${editDateStyles.borderColor}`}>
                    <span className={`text-sm font-medium ${editDateStyles.textColor}`}>
                      Due: {calculatedEditDueDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleEditClose}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isUpdating || !editGoal.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default ThumbnailGallery