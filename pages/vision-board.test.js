import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import VisionBoardPage from './vision-board'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
    pathname: '/vision-board'
  })
}))

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
    }
  }
}))

// Mock components
jest.mock('../components/vision-board/AIGenerator', () => {
  return function MockAIGenerator({ userId, aiProvider }) {
    return <div data-testid="ai-generator">AIGenerator - Provider: {aiProvider}</div>
  }
})

jest.mock('../components/vision-board/ImageUploader', () => ({
  ImageUploader: function MockImageUploader({ userId }) {
    return <div data-testid="image-uploader">ImageUploader - User: {userId}</div>
  }
}))

jest.mock('../components/vision-board/ThumbnailGallery', () => {
  return function MockThumbnailGallery({ images, userId, onImageUpdate }) {
    return (
      <div data-testid="thumbnail-gallery">
        Gallery - {images.length} images - User: {userId}
      </div>
    )
  }
})

// Mock fetch
global.fetch = jest.fn()

describe('VisionBoardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock profile fetch
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/profile')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { ai_image_provider: 'nano_banana' }
          })
        })
      }
      if (url.includes('/api/vision-board') && !url.includes('/generate')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: []
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
    })
  })

  it('renders AIGenerator component', async () => {
    render(<VisionBoardPage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('ai-generator')).toBeInTheDocument()
    })
  })

  it('fetches user profile and passes AI provider to AIGenerator', async () => {
    render(<VisionBoardPage />)
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/profile')
      )
    })
    
    await waitFor(() => {
      expect(screen.getByText(/provider: nano_banana/i)).toBeInTheDocument()
    })
  })

  it('renders ImageUploader with userId', async () => {
    render(<VisionBoardPage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('image-uploader')).toBeInTheDocument()
      expect(screen.getByText(/user: user-123/i)).toBeInTheDocument()
    })
  })

  it('renders ThumbnailGallery with images', async () => {
    // Mock images response
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/profile')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { ai_image_provider: 'nano_banana' }
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: '1',
              goal: 'Test goal',
              due_date: '2024-12-31',
              media_type: 'image'
            }
          ]
        })
      })
    })

    render(<VisionBoardPage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('thumbnail-gallery')).toBeInTheDocument()
      expect(screen.getByText(/1 images/i)).toBeInTheDocument()
    })
  })

  it('redirects to login if user is not authenticated', async () => {
    const { supabase } = require('../lib/supabase')
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null
    })

    render(<VisionBoardPage />)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('displays page title and description', async () => {
    render(<VisionBoardPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/vision board manager/i)).toBeInTheDocument()
    })
  })
})
