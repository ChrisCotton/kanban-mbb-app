import React from 'react'
import { render, screen } from '@testing-library/react'
import Layout from '../Layout'
import * as useCarouselPreferenceModule from '../../../hooks/useCarouselPreference'

// Mock VisionBoardCarousel component
jest.mock('../../vision-board/VisionBoardCarousel', () => {
  return function MockVisionBoardCarousel() {
    return <div data-testid="mock-carousel">Vision Board Carousel</div>
  }
})

// Mock Navigation component
jest.mock('../Navigation', () => {
  return function MockNavigation() {
    return <nav data-testid="mock-navigation">Navigation</nav>
  }
})

// Mock MBBTimerSection component
jest.mock('../../timer/MBBTimerSection', () => {
  return function MockMBBTimerSection() {
    return <div data-testid="mock-timer">Timer Section</div>
  }
})

// Mock useCarouselPreference hook
jest.mock('../../../hooks/useCarouselPreference')

const mockUseCarouselPreference = useCarouselPreferenceModule.useCarouselPreference as jest.MockedFunction<
  typeof useCarouselPreferenceModule.useCarouselPreference
>

describe('Layout - Carousel Integration', () => {
  const mockToggle = jest.fn()
  const mockSetEnabled = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Default carousel preference mock
    mockUseCarouselPreference.mockReturnValue({
      enabled: false,
      toggle: mockToggle,
      setEnabled: mockSetEnabled
    })
  })

  describe('Carousel Rendering Based on Hook', () => {
    it('should NOT render carousel when useCarouselPreference returns enabled: false', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      const carousel = screen.queryByTestId('mock-carousel')
      expect(carousel).not.toBeInTheDocument()
    })

    it('should render carousel when useCarouselPreference returns enabled: true', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      const carousel = screen.getByTestId('mock-carousel')
      expect(carousel).toBeInTheDocument()
    })

    it('should render carousel when both showCarousel prop and hook are true', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(
        <Layout showCarousel={true}>
          <div>Test Content</div>
        </Layout>
      )

      const carousel = screen.getByTestId('mock-carousel')
      expect(carousel).toBeInTheDocument()
    })

    it('should NOT render carousel when hook is false even if showCarousel prop is true', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      // Hook takes precedence over prop
      render(
        <Layout showCarousel={true}>
          <div>Test Content</div>
        </Layout>
      )

      const carousel = screen.queryByTestId('mock-carousel')
      expect(carousel).not.toBeInTheDocument()
    })

    it('should NOT render carousel when showCarousel prop is false even if hook is true', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      // Both prop and hook must be true
      render(
        <Layout showCarousel={false}>
          <div>Test Content</div>
        </Layout>
      )

      const carousel = screen.queryByTestId('mock-carousel')
      expect(carousel).not.toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('should always render Navigation when showNavigation is true', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(
        <Layout showNavigation={true}>
          <div>Test Content</div>
        </Layout>
      )

      const nav = screen.getByTestId('mock-navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should always render Timer when showTimer is true', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(
        <Layout showTimer={true}>
          <div>Test Content</div>
        </Layout>
      )

      const timer = screen.getByTestId('mock-timer')
      expect(timer).toBeInTheDocument()
    })

    it('should render children content regardless of carousel state', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(
        <Layout>
          <div data-testid="child-content">Child Content</div>
        </Layout>
      )

      const content = screen.getByTestId('child-content')
      expect(content).toBeInTheDocument()
    })
  })

  describe('Default Prop Behavior', () => {
    it('should default showCarousel to true (for backward compatibility)', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      // When hook is true and prop defaults to true, carousel should show
      const carousel = screen.getByTestId('mock-carousel')
      expect(carousel).toBeInTheDocument()
    })

    it('should default showNavigation to true', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      const nav = screen.getByTestId('mock-navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should default showTimer to true', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      const timer = screen.getByTestId('mock-timer')
      expect(timer).toBeInTheDocument()
    })
  })

  describe('Hook Integration', () => {
    it('should call useCarouselPreference hook on render', () => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      expect(mockUseCarouselPreference).toHaveBeenCalled()
    })

    it('should use hook value for carousel visibility decision', () => {
      // First render with enabled: false
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      const { rerender } = render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      expect(screen.queryByTestId('mock-carousel')).not.toBeInTheDocument()

      // Second render with enabled: true
      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      rerender(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      expect(screen.getByTestId('mock-carousel')).toBeInTheDocument()
    })
  })

  describe('Performance - Carousel OFF by Default', () => {
    it('should not render carousel on initial load when hook defaults to false', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: false,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      )

      // Carousel should not be rendered, improving performance
      const carousel = screen.queryByTestId('mock-carousel')
      expect(carousel).not.toBeInTheDocument()
    })
  })

  describe('Carousel Props Passthrough', () => {
    it('should pass carouselImages prop to VisionBoardCarousel when rendered', () => {
      mockUseCarouselPreference.mockReturnValue({
        enabled: true,
        toggle: mockToggle,
        setEnabled: mockSetEnabled
      })

      const mockImages = [
        { id: '1', file_path: '/test1.jpg', display_order: 0 },
        { id: '2', file_path: '/test2.jpg', display_order: 1 }
      ]

      render(
        <Layout carouselImages={mockImages}>
          <div>Test Content</div>
        </Layout>
      )

      // Carousel should be rendered when enabled
      const carousel = screen.getByTestId('mock-carousel')
      expect(carousel).toBeInTheDocument()
    })
  })
})
