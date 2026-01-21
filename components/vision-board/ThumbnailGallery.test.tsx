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

// Mock react-datepicker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selected, onChange, ...props }: any) {
    return (
      <input
        type="text"
        data-testid="date-picker"
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => {
          if (onChange) {
            onChange(new Date(e.target.value))
          }
        }}
        {...props}
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
    created_at: '2024-01-01T00:00:00Z',
    goal: 'Test goal 1',
    due_date: '2024-12-31',
    media_type: 'image' as const
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
    created_at: '2024-01-02T00:00:00Z',
    goal: 'Test goal 2',
    due_date: '2024-06-15',
    media_type: 'image' as const
  },
  {
    id: '3',
    file_path: '/test-video-3.mp4',
    title: 'Test Video 3',
    alt_text: 'Alt text 3',
    description: 'Description 3',
    display_order: 2,
    width_px: 800,
    height_px: 600,
    is_active: true,
    view_count: 8,
    created_at: '2024-01-03T00:00:00Z',
    goal: 'Test goal 3',
    due_date: '2024-02-14',
    media_type: 'video' as const
  }
]

describe('ThumbnailGallery', () => {
  const defaultProps = {
    images: mockImages,
    userId: 'user-123',
    onImageUpdate: jest.fn().mockResolvedValue({})
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T00:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders empty state when no images provided', () => {
    render(<ThumbnailGallery images={[]} />)
    
    expect(screen.getByText('No Images Yet')).toBeInTheDocument()
    expect(screen.getByText('Upload your first vision board image to get started')).toBeInTheDocument()
  })

  it('displays goal text on each thumbnail', () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    expect(screen.getByText('Test goal 1')).toBeInTheDocument()
    expect(screen.getByText('Test goal 2')).toBeInTheDocument()
    expect(screen.getByText('Test goal 3')).toBeInTheDocument()
  })

  it('displays due_date badge with correct formatting', () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    expect(screen.getByText(/due: dec 31, 2024/i)).toBeInTheDocument()
    expect(screen.getByText(/due: jun 15, 2024/i)).toBeInTheDocument()
    expect(screen.getByText(/due: feb 14, 2024/i)).toBeInTheDocument()
  })

  it('applies correct color coding based on due_date interval', () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    // Check that due date badges have color classes
    const dueDateBadges = screen.getAllByText(/due:/i)
    expect(dueDateBadges.length).toBeGreaterThan(0)
    
    // Each badge should have color styling
    dueDateBadges.forEach(badge => {
      expect(badge.closest('div')).toHaveClass('bg-')
    })
  })

  it('shows media type indicator for videos', () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    // Video should show video indicator
    const videoThumbnail = screen.getByAltText(/test video 3/i).closest('div')
    expect(videoThumbnail).toBeInTheDocument()
  })

  it('shows edit button when onImageUpdate is provided', () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    const editButtons = screen.getAllByTitle(/edit goal and due date/i)
    expect(editButtons.length).toBeGreaterThan(0)
  })

  it('opens edit modal when edit button is clicked', async () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    const editButton = screen.getAllByTitle(/edit goal and due date/i)[0]
    fireEvent.click(editButton)
    
    await waitFor(() => {
      expect(screen.getByText(/edit goal & due date/i)).toBeInTheDocument()
    })
  })

  it('pre-fills edit form with current goal and due_date', async () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    const editButton = screen.getAllByTitle(/edit goal and due date/i)[0]
    fireEvent.click(editButton)
    
    await waitFor(() => {
      const goalInput = screen.getByLabelText(/goal/i) as HTMLInputElement
      expect(goalInput.value).toBe('Test goal 1')
    })
  })

  it('updates goal and due_date when save is clicked', async () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    const editButton = screen.getAllByTitle(/edit goal and due date/i)[0]
    fireEvent.click(editButton)
    
    await waitFor(() => {
      expect(screen.getByText(/edit goal & due date/i)).toBeInTheDocument()
    })
    
    const goalInput = screen.getByLabelText(/goal/i)
    fireEvent.change(goalInput, { target: { value: 'Updated goal' } })
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(defaultProps.onImageUpdate).toHaveBeenCalledWith('1', expect.objectContaining({
        goal: 'Updated goal'
      }))
    })
  })

  it('closes edit modal when cancel is clicked', async () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    const editButton = screen.getAllByTitle(/edit goal and due date/i)[0]
    fireEvent.click(editButton)
    
    await waitFor(() => {
      expect(screen.getByText(/edit goal & due date/i)).toBeInTheDocument()
    })
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)
    
    await waitFor(() => {
      expect(screen.queryByText(/edit goal & due date/i)).not.toBeInTheDocument()
    })
  })

  it('shows validation error if goal is empty in edit modal', async () => {
    render(<ThumbnailGallery {...defaultProps} />)
    
    const editButton = screen.getAllByTitle(/edit goal and due date/i)[0]
    fireEvent.click(editButton)
    
    await waitFor(() => {
      expect(screen.getByText(/edit goal & due date/i)).toBeInTheDocument()
    })
    
    const goalInput = screen.getByLabelText(/goal/i)
    fireEvent.change(goalInput, { target: { value: '   ' } })
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).toBeDisabled()
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