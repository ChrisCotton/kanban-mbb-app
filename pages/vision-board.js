import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import ThumbnailGallery from '../components/vision-board/ThumbnailGallery'
import VisionBoardGalleryModal from '../components/vision-board/VisionBoardGalleryModal'
import { ImageUploader } from '../components/vision-board/ImageUploader'
import AIGenerator from '../components/vision-board/AIGenerator'

const VisionBoardPage = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visionBoardImages, setVisionBoardImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImageIds, setSelectedImageIds] = useState([])
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [aiProvider, setAiProvider] = useState('nano_banana')
  const [galleryModalOpen, setGalleryModalOpen] = useState(false)
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)

  // Load vision board images
  const loadVisionBoardImages = useCallback(async (userId) => {
    if (!userId) return

    try {
      const { data: images, error } = await supabase
        .from('vision_board_images')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true })
        
      if (error) throw error
      setVisionBoardImages(images || [])
    } catch (error) {
      console.error('Error loading vision board images:', error)
    }
  }, [])

  // Load user profile to get AI provider
  const loadUserProfile = useCallback(async (userId) => {
    try {
      const response = await fetch(`/api/profile?user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to load profile')
      
      const result = await response.json()
      if (result.success && result.data?.ai_image_provider) {
        setAiProvider(result.data.ai_image_provider)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      // Use default provider
      setAiProvider('nano_banana')
    }
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      await Promise.all([
        loadVisionBoardImages(user.id),
        loadUserProfile(user.id)
      ])
      setLoading(false)
    }

    getUser()
  }, [router, loadVisionBoardImages, loadUserProfile])

  // Handle image selection in gallery
  const handleImageSelect = useCallback((imageId) => {
    setSelectedImageIds(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId)
      } else {
        return [...prev, imageId]
      }
    })
  }, [])

  // Handle image click to open gallery modal
  const handleImageClick = useCallback((imageId, index) => {
    setCurrentGalleryIndex(index)
    setGalleryModalOpen(true)
  }, [])

  // Handle viewing slideshow with selected images
  const handleViewSlideshow = useCallback(() => {
    if (selectedImageIds.length > 0) {
      // Filter to selected images and find first selected index
      const selectedImages = visionBoardImages.filter(img => 
        selectedImageIds.includes(img.id)
      )
      if (selectedImages.length > 0) {
        const firstSelectedIndex = visionBoardImages.findIndex(img => 
          img.id === selectedImages[0].id
        )
        setCurrentGalleryIndex(firstSelectedIndex >= 0 ? firstSelectedIndex : 0)
        setGalleryModalOpen(true)
      }
    } else {
      // No selection, show all images
      setCurrentGalleryIndex(0)
      setGalleryModalOpen(true)
    }
  }, [selectedImageIds, visionBoardImages])

  // Handle toggling active status of images
  const handleImageToggleActive = useCallback(async (imageId) => {
    if (!user) return

    try {
      const image = visionBoardImages.find(img => img.id === imageId)
      if (!image) return

      const { error } = await supabase
        .from('vision_board_images')
        .update({ is_active: !image.is_active })
        .eq('id', imageId)
        .eq('user_id', user.id)

      if (error) throw error

      // Reload images to reflect changes
      await loadVisionBoardImages(user.id)
    } catch (error) {
      console.error('Error toggling image active status:', error)
      alert('Failed to update image status')
    }
  }, [user, visionBoardImages, loadVisionBoardImages])

  // Handle image deletion
  const handleImageDelete = useCallback(async (imageId) => {
    if (!user) return

    try {
      // Get image details for storage cleanup
      const image = visionBoardImages.find(img => img.id === imageId)
      if (!image) return

      // Delete from database
      const { error: dbError } = await supabase
        .from('vision_board_images')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      // Try to delete from storage (optional - may fail if file doesn't exist)
      try {
        const fileName = image.file_path?.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from('vision-board')
            .remove([fileName])
        }
      } catch (storageError) {
        console.warn('Storage cleanup failed:', storageError)
      }

      // Reload images to reflect changes
      await loadVisionBoardImages(user.id)
      setSelectedImageIds(prev => prev.filter(id => id !== imageId))
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete image')
    }
  }, [user, visionBoardImages, loadVisionBoardImages])

  // Handle successful upload
  const handleUploadComplete = useCallback(async (imageId, imageUrl) => {
    setUploadSuccess(true)
    setTimeout(() => setUploadSuccess(false), 3000)
    
    // Reload images to include the new upload
    if (user) {
      await loadVisionBoardImages(user.id)
    }
  }, [user, loadVisionBoardImages])

  // Handle AI generation complete
  const handleAIGenerationComplete = useCallback(async (imageId, imageUrl) => {
    setUploadSuccess(true)
    setTimeout(() => setUploadSuccess(false), 3000)
    
    // Reload images to include the new generated image
    if (user) {
      await loadVisionBoardImages(user.id)
    }
  }, [user, loadVisionBoardImages])

  // Handle image update (goal/due_date)
  const handleImageUpdate = useCallback(async (imageId, updates) => {
    if (!user) return

    try {
      const response = await fetch(`/api/vision-board/${imageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          ...updates
        })
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update image')
      }

      // Reload images to reflect changes
      await loadVisionBoardImages(user.id)
    } catch (error) {
      console.error('Error updating image:', error)
      throw error
    }
  }, [user, loadVisionBoardImages])

  // Handle upload error
  const handleUploadError = useCallback((error) => {
    console.error('Upload error:', error)
    alert(`Upload failed: ${error}`)
  }, [])

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

  // Get active images for carousel
  const activeImages = visionBoardImages.filter(img => img.is_active)

  return (
    <Layout carouselImages={activeImages} userId={user?.id}>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Vision Board Manager</h1>
            <p className="text-white/70">
              Upload and manage your vision board images. Toggle images active/inactive to control which ones appear in the carousel header.
            </p>
          </div>
          
          {/* Upload Success Message */}
          {uploadSuccess && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-400/30 rounded-lg">
              <p className="text-green-300">✓ Image uploaded successfully!</p>
            </div>
          )}

          {/* AI Generator */}
          {user && (
            <AIGenerator
              userId={user.id}
              aiProvider={aiProvider}
              onGenerationComplete={handleAIGenerationComplete}
              onGenerationError={handleUploadError}
            />
          )}

          {/* Image Uploader */}
          <div className="mb-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Upload New Images</h2>
            {user && (
              <ImageUploader
                userId={user.id}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={10}
                maxFileSize={5}
                className="w-full"
              />
            )}
          </div>

          {/* Image Gallery */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Your Vision Board Images</h2>
              <div className="text-sm text-white/70">
                {visionBoardImages.length} total images, {activeImages.length} active in carousel
              </div>
            </div>
            
            <ThumbnailGallery
              images={visionBoardImages}
              selectedImageIds={selectedImageIds}
              onImageSelect={handleImageSelect}
              onImageToggleActive={handleImageToggleActive}
              onImageDelete={handleImageDelete}
              onImageUpdate={handleImageUpdate}
              allowMultiSelect={true}
              allowReorder={false}
              showActiveStatus={true}
              maxColumns={4}
              className="w-full"
              userId={user?.id}
            />
          </div>

          {/* Gallery Modal */}
          <VisionBoardGalleryModal
            images={visionBoardImages}
            initialIndex={currentGalleryIndex}
            isOpen={galleryModalOpen}
            onClose={() => setGalleryModalOpen(false)}
          />

          {/* Selected Images Actions */}
          {selectedImageIds.length > 0 && (
            <div className="mt-6 bg-blue-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 shadow-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {selectedImageIds.length} image{selectedImageIds.length > 1 ? 's' : ''} selected
              </h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleViewSlideshow}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  View Slideshow
                </button>
                <button
                  onClick={() => {
                    selectedImageIds.forEach(id => handleImageToggleActive(id))
                    setSelectedImageIds([])
                  }}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                >
                  Toggle Active Status
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete ${selectedImageIds.length} selected image${selectedImageIds.length > 1 ? 's' : ''}?`)) {
                      selectedImageIds.forEach(id => handleImageDelete(id))
                      setSelectedImageIds([])
                    }
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedImageIds([])}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </Layout>
  )
}

export default VisionBoardPage