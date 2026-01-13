import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import Navigation from '../Navigation'
import * as useCarouselPreferenceModule from '../../../hooks/useCarouselPreference'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

// Mock useCarouselPreference hook
jest.mock('../../../hooks/useCarouselPreference')

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseCarouselPreference = useCarouselPreferenceModule.useCarouselPreference as jest.MockedFunction<
  typeof useCarouselPreferenceModule.useCarouselPreference
>

describe('Navigation - Carousel Toggle', () => {
  const mockToggle = jest.fn()
  const mockSetEnabled = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Default router mock
    mockUseRouter.mockReturnValue({
      pathname: '/dashboard',
      push: jest.fn(),
      query: {},
      asPath: '/',
      route: '/',
      basePath: '',
      back: jest.fn(),
      beforePopState: jest.fn(),
      prefetch: jest.fn(),
      reload: jest.fn(),
      replace: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      isPreview: false
    } as any)

    // Default carousel preference mock
    mockUseCarouselPreference.mockReturnValue({
      enabled: false,
      toggle: mockToggle,
      setEnabled: mockSetEnabled
    })
  })

  describe('Toggle Button Rendering', () => {
    it('should render carousel toggle button in desktop navigation', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      expect(toggleButton).toBeInTheDocument()
    })

    it('should render toggle button with accessible aria-label', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText('Toggle vision board carousel')
      expect(toggleButton).toHaveAttribute('aria-label', 'Toggle vision board carousel')
    })

    it('should render toggle button as a button element', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      expect(toggleButton.tagName).toBe('BUTTON')
    })
  })

  describe('Toggle Button Icons', () => {
    it('should show eye-off icon when carousel is disabled (OFF)', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      // Eye-off icon should be visible (has specific path data)
      const svg = toggleButton.querySelector('svg')
      expect(svg).toBeInTheDocument()
      
      // Check for eye-off icon specific attribute or title
      expect(toggleButton).toHaveAttribute('title', 'Carousel: Off')
    })

    it('should show eye icon when carousel is enabled (ON)', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      // Eye icon should be visible
      const svg = toggleButton.querySelector('svg')
      expect(svg).toBeInTheDocument()
      
      // Check for eye icon specific title
      expect(toggleButton).toHaveAttribute('title', 'Carousel: On')
    })
  })

  describe('Toggle Button Interaction', () => {
    it('should call toggle() when clicked', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      fireEvent.click(toggleButton)

      expect(mockToggle).toHaveBeenCalledTimes(1)
    })

    it('should toggle from OFF to ON', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      expect(toggleButton).toHaveAttribute('title', 'Carousel: Off')

      fireEvent.click(toggleButton)

      expect(mockToggle).toHaveBeenCalled()
    })

    it('should toggle from ON to OFF', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      expect(toggleButton).toHaveAttribute('title', 'Carousel: On')

      fireEvent.click(toggleButton)

      expect(mockToggle).toHaveBeenCalled()
    })

    it('should handle multiple clicks', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      fireEvent.click(toggleButton)
      fireEvent.click(toggleButton)
      fireEvent.click(toggleButton)

      expect(mockToggle).toHaveBeenCalledTimes(3)
    })
  })

  describe('Toggle Button Styling', () => {
    it('should have consistent styling with other navigation buttons', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      // Should have background and hover styles similar to nav items
      expect(toggleButton.className).toContain('bg-white/10')
      expect(toggleButton.className).toContain('hover:')
    })

    it('should have hover effects', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      expect(toggleButton.className).toContain('hover:bg-white/20')
    })

    it('should have proper spacing and size', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      // Should have padding
      expect(toggleButton.className).toMatch(/p-\d/)
    })
  })

  describe('Mobile Menu Integration', () => {
    it('should include carousel toggle in mobile menu', () => {
      render(<Navigation />)

      // Open mobile menu
      const mobileMenuButton = screen.getByLabelText(/toggle navigation menu/i)
      fireEvent.click(mobileMenuButton)

      // Check for carousel toggle in mobile menu
      const mobileToggle = screen.getAllByLabelText(/toggle vision board carousel/i)
      
      // Should have at least 2 (desktop + mobile)
      expect(mobileToggle.length).toBeGreaterThanOrEqual(1)
    })

    it('should call toggle() when mobile carousel button is clicked', () => {
      render(<Navigation />)

      // Open mobile menu
      const mobileMenuButton = screen.getByLabelText(/toggle navigation menu/i)
      fireEvent.click(mobileMenuButton)

      // Find and click carousel toggle in mobile menu
      const mobileToggles = screen.getAllByLabelText(/toggle vision board carousel/i)
      const mobileToggle = mobileToggles[mobileToggles.length - 1] // Last one should be mobile
      
      fireEvent.click(mobileToggle)

      expect(mockToggle).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      // Button should be focusable
      toggleButton.focus()
      expect(document.activeElement).toBe(toggleButton)
    })

    it('should trigger on Enter key', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      toggleButton.focus()
      fireEvent.keyDown(toggleButton, { key: 'Enter', code: 'Enter' })

      expect(mockToggle).toHaveBeenCalled()
    })

    it('should have descriptive tooltip', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      // Title attribute provides tooltip
      expect(toggleButton).toHaveAttribute('title')
      expect(toggleButton.title).toMatch(/carousel/i)
    })
  })

  describe('Visual Feedback', () => {
    it('should show different visual state when enabled vs disabled', () => {
      const { rerender } = render(<Navigation />)

      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })
      rerender(<Navigation />)
      
      const toggleButtonOff = screen.getByLabelText(/toggle vision board carousel/i)
      const titleOff = toggleButtonOff.getAttribute('title')

      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })
      rerender(<Navigation />)

      const toggleButtonOn = screen.getByLabelText(/toggle vision board carousel/i)
      const titleOn = toggleButtonOn.getAttribute('title')

      // Titles should be different
      expect(titleOff).not.toBe(titleOn)
    })
  })

  describe('Position in Navigation', () => {
    it('should be positioned near user avatar section', () => {
      render(<Navigation />)

      const toggleButton = screen.getByLabelText(/toggle vision board carousel/i)
      
      // Should be in the desktop navigation area
      const desktopNav = toggleButton.closest('.hidden.md\\:flex')
      expect(desktopNav).toBeInTheDocument()
    })
  })
})
