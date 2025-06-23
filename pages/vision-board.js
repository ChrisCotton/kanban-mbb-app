import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import ThumbnailGallery from '@/components/vision-board/ThumbnailGallery';
import ImageUploader from '@/components/vision-board/ImageUploader';
import VisionBoardManager from '@/components/vision-board/VisionBoardManager';

export default function VisionBoard() {
  const [activeTab, setActiveTab] = useState('gallery');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = (imageId, imageUrl) => {
    // Trigger refresh of gallery components
    setRefreshTrigger(prev => prev + 1);
    console.log('Upload completed:', { imageId, imageUrl });
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    // Could add toast notification here
  };

  const handleImageUpdate = () => {
    // Trigger refresh when images are updated from manager
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Vision Board Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your vision board images that appear in the carousel across all pages
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'gallery'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Image Gallery
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Upload Images
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Manage & Organize
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Vision Board Images
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select and reorder your vision board images. Active images appear in the carousel rotation.
                </p>
                <ThumbnailGallery
                  key={`gallery-${refreshTrigger}`}
                  enableReorder={true}
                  showActivationControls={true}
                  columns={{ base: 2, sm: 3, md: 4, lg: 6 }}
                  onSelectionChange={(selectedIds) => {
                    console.log('Selection changed:', selectedIds);
                  }}
                  onReorder={(newOrder) => {
                    console.log('Images reordered:', newOrder);
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Upload New Images
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Add new images to your vision board. Uploaded images will be automatically set as active.
                </p>
                <ImageUploader
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  maxFiles={20}
                  maxFileSize={10}
                />
              </div>

              {/* Quick Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
                  💡 Upload Tips
                </h3>
                <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-2">
                  <li>• Use high-quality images for the best carousel display</li>
                  <li>• Landscape orientation (16:9 or 4:3) works best for the carousel</li>
                  <li>• Images are automatically resized and optimized</li>
                  <li>• You can upload multiple images at once by drag and drop</li>
                  <li>• Newly uploaded images are active by default</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Vision Board Manager
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Comprehensive management interface for all your vision board images.
                </p>
                <VisionBoardManager
                  key={`manager-${refreshTrigger}`}
                  onImageUpdate={handleImageUpdate}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Images</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <div className="text-blue-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active Images</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <div className="text-green-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Most Viewed</p>
                <p className="text-lg font-semibold">--</p>
              </div>
              <div className="text-purple-200">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}