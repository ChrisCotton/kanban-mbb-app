import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import VisionBoardManager from './VisionBoardManager'

// Mock the vision board queries
jest.mock('@/lib/database/vision-board-queries', () => ({
  getVisionBoardImages: jest.fn(),
  toggleImageActiveStatus: jest.fn(),
  reorderVisionBoardImages: jest.fn(),
  deleteVisionBoardImage: jest.fn(),
  bulkUpdateImageActiveStatus: jest.fn(),
  getVisionBoardStats: jest.fn(),
  searchVisionBoardImages: jest.fn(),
  getRecentlyViewedImages: jest.fn(),
  getMostViewedImages: jest.fn()
}))

// Mock the ThumbnailGallery component
jest.mock('./ThumbnailGallery', () => {
  return function MockThumbnailGallery({ 
    images, 
    onImageSelect, 
    onImageToggleActive, 
    onImageDelete,
    onImageReorder 
  }: any) {
    return (
      <div data-testid="thumbnail-gallery">
        <div>Gallery with {images.length} images</div>
        {images.map((image: any) => (
          <div key={image.id} data-testid={`image-${image.id}`}>
            <span>{image.title}</span>
            <button onClick={() => onImageSelect?.(image.id)}>Select</button>
            <button onClick={() => onImageToggleActive?.(image.id)}>Toggle Active</button>
            <button onClick={() => onImageDelete?.(image.id)}>Delete</button>
            {onImageReorder && (
              <button onClick={() => onImageReorder?.(['reordered'])}>Reorder</button>
            )}
          </div>
        ))}
      </div>
    )
  }
})

const {
  getVisionBoardImages,
  toggleImageActiveStatus,
  reorderVisionBoardImages,
  deleteVisionBoardImage,
  bulkUpdateImageActiveStatus,
  getVisionBoardStats,
  searchVisionBoardImages,
  getRecentlyViewedImages,
  getMostViewedImages
} = require('@/lib/database/vision-board-queries')

const mockUserId = 'test-user-123'

const mockImages = [
  {
    id: '1',
    user_id: mockUserId,
    file_name: 'image1.jpg',
    file_path: '/path/to/image1.jpg',
    title: 'Test Image 1',
    description: 'First test image',
    is_active: true,
    display_order: 0,
    view_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    user_id: mockUserId,
    file_name: 'image2.jpg',
    file_path: '/path/to/image2.jpg',
    title: 'Test Image 2',
    description: 'Second test image',
    is_active: false,
    display_order: 1,
    view_count: 3,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    user_id: mockUserId,
    file_name: 'image3.jpg',
    file_path: '/path/to/image3.jpg',
    title: 'Test Image 3',
    description: 'Third test image',
    is_active: true,
    display_order: 2,
    view_count: 8,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z'
  }
]

const mockStats = {
  totalImages: 3,
  activeImages: 2,
  totalViews: 16,
  averageViews: 5.33
}

describe('VisionBoardManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
    getVisionBoardImages.mockResolvedValue({ data: mockImages, error: null })
    getVisionBoardStats.mockResolvedValue({ data: mockStats, error: null })
    toggleImageActiveStatus.mockResolvedValue({ error: null })
    reorderVisionBoardImages.mockResolvedValue({ error: null })
    deleteVisionBoardImage.mockResolvedValue({ error: null })
    bulkUpdateImageActiveStatus.mockResolvedValue({ error: null })
    searchVisionBoardImages.mockResolvedValue({ data: [], error: null })
    getRecentlyViewedImages.mockResolvedValue({ data: mockImages, error: null })
    getMostViewedImages.mockResolvedValue({ data: mockImages, error: null })
  })

  it('renders loading state initially', () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    expect(screen.getByText('Loading vision board images...')).toBeInTheDocument()
  })

  it('renders manager with stats and images after loading', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // Check stats display
    expect(screen.getByText('3 total images')).toBeInTheDocument()
    expect(screen.getByText('2 active')).toBeInTheDocument()
    expect(screen.getByText('16 total views')).toBeInTheDocument()
    expect(screen.getByText('5.33 avg views')).toBeInTheDocument()

    // Check thumbnail gallery is rendered
    expect(screen.getByTestId('thumbnail-gallery')).toBeInTheDocument()
    expect(screen.getByText('Gallery with 3 images')).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    searchVisionBoardImages.mockResolvedValue({ 
      data: [mockImages[0]], 
      error: null 
    })

    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search images by title or description...')
    fireEvent.change(searchInput, { target: { value: 'test query' } })

    await waitFor(() => {
      expect(searchVisionBoardImages).toHaveBeenCalledWith(
        mockUserId,
        'test query',
        expect.objectContaining({
          orderBy: 'display_order',
          orderDirection: 'asc'
        })
      )
    })

    expect(screen.getByText('Found 1 image(s) matching "test query"')).toBeInTheDocument()
  })

  it('filters images by view mode', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // Change to active only view
    const viewSelect = screen.getByDisplayValue('All Images')
    fireEvent.change(viewSelect, { target: { value: 'active' } })

    await waitFor(() => {
      expect(getVisionBoardImages).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          activeOnly: true
        })
      )
    })
  })

  it('handles view mode changes correctly', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    const viewSelect = screen.getByDisplayValue('All Images')

    // Test recent view
    fireEvent.change(viewSelect, { target: { value: 'recent' } })
    await waitFor(() => {
      expect(getRecentlyViewedImages).toHaveBeenCalledWith(mockUserId, 20)
    })

    // Test popular view
    fireEvent.change(viewSelect, { target: { value: 'popular' } })
    await waitFor(() => {
      expect(getMostViewedImages).toHaveBeenCalledWith(mockUserId, 20)
    })
  })

  it('handles sort mode changes', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    const sortSelect = screen.getByDisplayValue('Display Order')
    fireEvent.change(sortSelect, { target: { value: 'view_count' } })

    await waitFor(() => {
      expect(getVisionBoardImages).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          orderBy: 'view_count'
        })
      )
    })
  })

  it('handles image selection and shows bulk actions', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // Select an image
    const selectButton = screen.getAllByText('Select')[0]
    fireEvent.click(selectButton)

    // Check if bulk actions appear
    await waitFor(() => {
      expect(screen.getByText('1 image(s) selected')).toBeInTheDocument()
      expect(screen.getByText('Activate')).toBeInTheDocument()
      expect(screen.getByText('Deactivate')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('handles bulk activate operation', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // Select an image
    const selectButton = screen.getAllByText('Select')[0]
    fireEvent.click(selectButton)

    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument()
    })

    // Click bulk activate
    fireEvent.click(screen.getByText('Activate'))

    await waitFor(() => {
      expect(bulkUpdateImageActiveStatus).toHaveBeenCalledWith(['1'], mockUserId, true)
    })
  })

  it('handles bulk delete with confirmation', async () => {
    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(() => true)
    })

    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // Select an image
    const selectButton = screen.getAllByText('Select')[0]
    fireEvent.click(selectButton)

    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    // Click bulk delete
    fireEvent.click(screen.getByText('Delete'))

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1 image(s)?')
    
    await waitFor(() => {
      expect(deleteVisionBoardImage).toHaveBeenCalledWith('1', mockUserId)
    })
  })

  it('handles individual image operations', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // Test toggle active
    const toggleButton = screen.getAllByText('Toggle Active')[0]
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(toggleImageActiveStatus).toHaveBeenCalledWith('1', mockUserId)
    })

    // Test delete
    const deleteButton = screen.getAllByText('Delete')[0]
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(deleteVisionBoardImage).toHaveBeenCalledWith('1', mockUserId)
    })
  })

  it('handles reordering when allowed', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // Should show reorder button when in 'all' view and 'display_order' sort
    const reorderButton = screen.getAllByText('Reorder')[0]
    fireEvent.click(reorderButton)

    await waitFor(() => {
      expect(reorderVisionBoardImages).toHaveBeenCalledWith(['reordered'], mockUserId)
    })
  })

  it('shows upload dialog when upload button is clicked', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('Upload Images')
    fireEvent.click(uploadButton)

    expect(screen.getByText('Upload Images')).toBeInTheDocument()
    expect(screen.getByText('Image upload functionality will be implemented in the next phase.')).toBeInTheDocument()
  })

  it('handles refresh functionality', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    // Should trigger another call to load images
    await waitFor(() => {
      expect(getVisionBoardImages).toHaveBeenCalledTimes(2) // Initial load + refresh
    })
  })

  it('displays and handles errors properly', async () => {
    const errorMessage = 'Failed to load images'
    getVisionBoardImages.mockResolvedValueOnce({ data: null, error: new Error(errorMessage) })

    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load images')).toBeInTheDocument()
    })

    // Test error dismissal
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(screen.queryByText('Failed to load images')).not.toBeInTheDocument()
  })

  it('calls onImageUpdate callback when images are updated', async () => {
    const mockOnImageUpdate = jest.fn()
    
    render(<VisionBoardManager userId={mockUserId} onImageUpdate={mockOnImageUpdate} />)
    
    await waitFor(() => {
      expect(mockOnImageUpdate).toHaveBeenCalledWith(mockImages)
    })
  })

  it('clears selection when view mode changes', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // Select an image
    const selectButton = screen.getAllByText('Select')[0]
    fireEvent.click(selectButton)

    await waitFor(() => {
      expect(screen.getByText('1 image(s) selected')).toBeInTheDocument()
    })

    // Change view mode
    const viewSelect = screen.getByDisplayValue('All Images')
    fireEvent.change(viewSelect, { target: { value: 'active' } })

    // Selection should be cleared
    await waitFor(() => {
      expect(screen.queryByText('1 image(s) selected')).not.toBeInTheDocument()
    })
  })

  it('handles search with empty query correctly', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search images by title or description...')
    
    // Search with non-empty query first
    fireEvent.change(searchInput, { target: { value: 'test' } })
    
    // Then clear the search
    fireEvent.change(searchInput, { target: { value: '' } })

    // Should not call search API for empty query
    expect(searchVisionBoardImages).toHaveBeenCalledTimes(1) // Only for 'test'
  })

  it('applies custom className prop', () => {
    render(<VisionBoardManager userId={mockUserId} className="custom-manager-class" />)
    
    const container = document.querySelector('.custom-manager-class')
    expect(container).toBeInTheDocument()
  })

  it('handles bulk operations with no selection gracefully', async () => {
    render(<VisionBoardManager userId={mockUserId} />)
    
    await waitFor(() => {
      expect(screen.getByText('Vision Board Manager')).toBeInTheDocument()
    })

    // No selection, bulk actions should not be visible
    expect(screen.queryByText('Activate')).not.toBeInTheDocument()
    expect(screen.queryByText('Deactivate')).not.toBeInTheDocument()
  })
})