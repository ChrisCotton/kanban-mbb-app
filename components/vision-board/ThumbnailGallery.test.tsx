import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ThumbnailGallery from './ThumbnailGallery'

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onError }: any) {
    return (
      <img 
        src={src} 
        alt={alt} 
        onError={onError}
        data-testid="vision-board-image"
      />
    )
  }
})

const mockImages = [
  {
    id: '1',
    file_path: '/test-image-1.jpg',
    title: 'Test Image 1',
    alt_text: 'Alt text 1',
    description: 'Description 1',
    display_order: 0,
    width_px: 800,
    height_px: 600,
    is_active: true,
    view_count: 5,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    file_path: '/test-image-2.jpg',
    title: 'Test Image 2',
    alt_text: 'Alt text 2',
    description: 'Description 2',
    display_order: 1,
    width_px: 800,
    height_px: 600,
    is_active: false,
    view_count: 3,
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    file_path: '/test-image-3.jpg',
    title: 'Test Image 3',
    alt_text: 'Alt text 3',
    description: 'Description 3',
    display_order: 2,
    width_px: 800,
    height_px: 600,
    is_active: true,
    view_count: 8,
    created_at: '2024-01-03T00:00:00Z'
  }
]

describe('ThumbnailGallery', () => {
  it('renders empty state when no images provided', () => {
    render(<ThumbnailGallery images={[]} />)
    
    expect(screen.getByText('No Images Yet')).toBeInTheDocument()
    expect(screen.getByText('Upload your first vision board image to get started')).toBeInTheDocument()
  })

  it('renders images in grid layout', () => {
    render(<ThumbnailGallery images={mockImages} />)
    
    expect(screen.getAllByTestId('vision-board-image')).toHaveLength(3)
    expect(screen.getByText('Test Image 1')).toBeInTheDocument()
    expect(screen.getByText('Test Image 2')).toBeInTheDocument()
    expect(screen.getByText('Test Image 3')).toBeInTheDocument()
  })

  it('shows active/inactive status indicators', () => {
    render(<ThumbnailGallery images={mockImages} showActiveStatus={true} />)
    
    // Check for active status indicators (green dots)
    const statusIndicators = document.querySelectorAll('.bg-green-500')
    expect(statusIndicators).toHaveLength(2) // Two active images
    
    // Check for inactive status indicator (gray dot)
    const inactiveIndicators = document.querySelectorAll('.bg-gray-400')
    expect(inactiveIndicators).toHaveLength(1) // One inactive image
    
    // Check for inactive text label
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('handles image selection', () => {
    const mockOnImageSelect = jest.fn()
    render(
      <ThumbnailGallery 
        images={mockImages} 
        onImageSelect={mockOnImageSelect}
        selectedImageIds={['1']}
      />
    )
    
    // Check if first image is selected (has ring)
    const firstImageContainer = screen.getByText('Test Image 1').closest('[data-testid="image-container"]') || 
                              screen.getByText('Test Image 1').closest('div')
    
    // Click on second image
    const secondImageContainer = screen.getByText('Test Image 2').closest('div')
    fireEvent.click(secondImageContainer!)
    
    expect(mockOnImageSelect).toHaveBeenCalledWith('2')
  })

  it('handles active status toggle', async () => {
    const mockOnImageToggleActive = jest.fn()
    render(
      <ThumbnailGallery 
        images={mockImages} 
        onImageToggleActive={mockOnImageToggleActive}
      />
    )
    
    // Hover over first image to show action buttons
    const firstImageContainer = screen.getByText('Test Image 1').closest('div')
    fireEvent.mouseEnter(firstImageContainer!)
    
    // Find and click the toggle active button
    await waitFor(() => {
      const toggleButtons = document.querySelectorAll('[title*="Deactivate"]')
      if (toggleButtons.length > 0) {
        fireEvent.click(toggleButtons[0])
      }
    })
    
    expect(mockOnImageToggleActive).toHaveBeenCalledWith('1')
  })

  it('handles image deletion with confirmation', async () => {
    const mockOnImageDelete = jest.fn()
    
    // Mock window.confirm to return true
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(() => true)
    })
    
    render(
      <ThumbnailGallery 
        images={mockImages} 
        onImageDelete={mockOnImageDelete}
      />
    )
    
    // Hover over first image to show action buttons
    const firstImageContainer = screen.getByText('Test Image 1').closest('div')
    fireEvent.mouseEnter(firstImageContainer!)
    
    // Find and click the delete button
    await waitFor(() => {
      const deleteButtons = document.querySelectorAll('[title="Delete image"]')
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0])
      }
    })
    
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this image?')
    expect(mockOnImageDelete).toHaveBeenCalledWith('1')
  })

  it('handles image deletion cancellation', async () => {
    const mockOnImageDelete = jest.fn()
    
    // Mock window.confirm to return false
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(() => false)
    })
    
    render(
      <ThumbnailGallery 
        images={mockImages} 
        onImageDelete={mockOnImageDelete}
      />
    )
    
    // Hover over first image to show action buttons
    const firstImageContainer = screen.getByText('Test Image 1').closest('div')
    fireEvent.mouseEnter(firstImageContainer!)
    
    // Find and click the delete button
    await waitFor(() => {
      const deleteButtons = document.querySelectorAll('[title="Delete image"]')
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0])
      }
    })
    
    expect(window.confirm).toHaveBeenCalled()
    expect(mockOnImageDelete).not.toHaveBeenCalled()
  })

  it('supports drag and drop reordering when enabled', () => {
    const mockOnImageReorder = jest.fn()
    render(
      <ThumbnailGallery 
        images={mockImages} 
        onImageReorder={mockOnImageReorder}
        allowReorder={true}
      />
    )
    
    // Check for reorder instructions
    expect(screen.getByText('Drag and drop images to reorder them in the carousel')).toBeInTheDocument()
    
    // Find draggable elements
    const firstImageContainer = screen.getByText('Test Image 1').closest('div')
    const secondImageContainer = screen.getByText('Test Image 2').closest('div')
    
    // Simulate drag and drop
    fireEvent.dragStart(firstImageContainer!, { dataTransfer: { effectAllowed: 'move' } })
    fireEvent.dragOver(secondImageContainer!, { dataTransfer: { dropEffect: 'move' } })
    fireEvent.drop(secondImageContainer!, {})
    fireEvent.dragEnd(firstImageContainer!)
    
    expect(mockOnImageReorder).toHaveBeenCalledWith(['2', '1', '3'])
  })

  it('shows drag handles when reordering is enabled', () => {
    render(
      <ThumbnailGallery 
        images={mockImages} 
        allowReorder={true}
      />
    )
    
    // Hover over image to see drag handles
    const firstImageContainer = screen.getByText('Test Image 1').closest('div')
    fireEvent.mouseEnter(firstImageContainer!)
    
    // Check for drag handle icons
    const dragHandles = document.querySelectorAll('.cursor-move')
    expect(dragHandles.length).toBeGreaterThan(0)
  })

  it('applies different grid column classes based on maxColumns prop', () => {
    const { rerender } = render(
      <ThumbnailGallery images={mockImages} maxColumns={2} />
    )
    
    // Check for 2-column grid
    expect(document.querySelector('.grid-cols-2')).toBeInTheDocument()
    
    // Test with 6 columns
    rerender(<ThumbnailGallery images={mockImages} maxColumns={6} />)
    expect(document.querySelector('.lg\\:grid-cols-6')).toBeInTheDocument()
  })

  it('displays image metadata correctly', () => {
    render(<ThumbnailGallery images={mockImages} />)
    
    // Check display order
    expect(screen.getByText('Order: 0')).toBeInTheDocument()
    expect(screen.getByText('Order: 1')).toBeInTheDocument()
    expect(screen.getByText('Order: 2')).toBeInTheDocument()
    
    // Check view counts
    expect(screen.getByText('5 views')).toBeInTheDocument()
    expect(screen.getByText('3 views')).toBeInTheDocument()
    expect(screen.getByText('8 views')).toBeInTheDocument()
  })

  it('handles image loading errors', () => {
    render(<ThumbnailGallery images={mockImages} />)
    
    const images = screen.getAllByTestId('vision-board-image')
    
    // Simulate image load error
    fireEvent.error(images[0])
    
    expect(images[0]).toHaveAttribute('src', '/api/placeholder/300/300?text=Error')
  })

  it('does not show status indicators when showActiveStatus is false', () => {
    render(<ThumbnailGallery images={mockImages} showActiveStatus={false} />)
    
    // Status indicators should not be present
    const statusIndicators = document.querySelectorAll('.bg-green-500, .bg-gray-400')
    expect(statusIndicators).toHaveLength(0)
  })

  it('prevents drag operations when allowReorder is false', () => {
    const mockOnImageReorder = jest.fn()
    render(
      <ThumbnailGallery 
        images={mockImages} 
        onImageReorder={mockOnImageReorder}
        allowReorder={false}
      />
    )
    
    // Should not show reorder instructions
    expect(screen.queryByText('Drag and drop images to reorder them in the carousel')).not.toBeInTheDocument()
    
    // Simulate drag attempt - should not trigger reorder
    const firstImageContainer = screen.getByText('Test Image 1').closest('div')
    fireEvent.dragStart(firstImageContainer!)
    
    expect(mockOnImageReorder).not.toHaveBeenCalled()
  })

  it('applies custom className prop', () => {
    const { container } = render(
      <ThumbnailGallery images={mockImages} className="custom-gallery-class" />
    )
    
    expect(container.querySelector('.custom-gallery-class')).toBeInTheDocument()
  })

  it('handles selection state correctly with selectedImageIds', () => {
    render(
      <ThumbnailGallery 
        images={mockImages} 
        selectedImageIds={['1', '3']}
      />
    )
    
    // Should show selection indicators for images 1 and 3
    const checkmarks = screen.getAllByRole('img', { hidden: true })
    const selectionIndicators = document.querySelectorAll('.bg-blue-500')
    expect(selectionIndicators).toHaveLength(2)
  })
})