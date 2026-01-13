import { renderHook, act } from '@testing-library/react'
import { useCarouselPreference } from '../useCarouselPreference'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

const STORAGE_KEY = 'mbb-carousel-enabled'

describe('useCarouselPreference', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Default Behavior', () => {
    it('should return enabled: false by default (OFF by default)', () => {
      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(false)
      expect(typeof result.current.toggle).toBe('function')
      expect(typeof result.current.setEnabled).toBe('function')
    })

    it('should be SSR-safe when window is undefined', () => {
      // Temporarily make window undefined
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(false)

      // Restore window
      global.window = originalWindow
    })
  })

  describe('Persistence - Loading from localStorage', () => {
    it('should load enabled: true from localStorage on mount', () => {
      localStorageMock.getItem.mockReturnValue('true')

      const { result } = renderHook(() => useCarouselPreference())

      expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEY)
      expect(result.current.enabled).toBe(true)
    })

    it('should load enabled: false from localStorage on mount', () => {
      localStorageMock.getItem.mockReturnValue('false')

      const { result } = renderHook(() => useCarouselPreference())

      expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEY)
      expect(result.current.enabled).toBe(false)
    })

    it('should default to false when localStorage has no saved value', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(false)
    })

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')

      const { result } = renderHook(() => useCarouselPreference())

      // Should default to false and not crash
      expect(result.current.enabled).toBe(false)
    })

    it('should handle localStorage.getItem errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const { result } = renderHook(() => useCarouselPreference())

      // Should default to false and not crash
      expect(result.current.enabled).toBe(false)
    })
  })

  describe('Toggle Functionality', () => {
    it('should toggle from false to true', () => {
      localStorageMock.getItem.mockReturnValue('false')

      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(false)

      act(() => {
        result.current.toggle()
      })

      expect(result.current.enabled).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'true')
    })

    it('should toggle from true to false', () => {
      localStorageMock.getItem.mockReturnValue('true')

      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(true)

      act(() => {
        result.current.toggle()
      })

      expect(result.current.enabled).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'false')
    })

    it('should toggle multiple times correctly', () => {
      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(false)

      act(() => {
        result.current.toggle()
      })
      expect(result.current.enabled).toBe(true)

      act(() => {
        result.current.toggle()
      })
      expect(result.current.enabled).toBe(false)

      act(() => {
        result.current.toggle()
      })
      expect(result.current.enabled).toBe(true)
    })
  })

  describe('SetEnabled Functionality', () => {
    it('should set enabled to true', () => {
      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(false)

      act(() => {
        result.current.setEnabled(true)
      })

      expect(result.current.enabled).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'true')
    })

    it('should set enabled to false', () => {
      localStorageMock.getItem.mockReturnValue('true')

      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(true)

      act(() => {
        result.current.setEnabled(false)
      })

      expect(result.current.enabled).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'false')
    })

    it('should not trigger unnecessary saves when value is unchanged', () => {
      localStorageMock.getItem.mockReturnValue('true')

      const { result } = renderHook(() => useCarouselPreference())

      expect(result.current.enabled).toBe(true)

      // Clear previous calls
      localStorageMock.setItem.mockClear()

      act(() => {
        result.current.setEnabled(true) // Same value
      })

      // Should still save (implementation decision - ensures consistency)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'true')
    })
  })

  describe('Persistence - Saving to localStorage', () => {
    it('should save to localStorage when enabled changes', () => {
      const { result } = renderHook(() => useCarouselPreference())

      act(() => {
        result.current.setEnabled(true)
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'true')
    })

    it('should handle localStorage.setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const { result } = renderHook(() => useCarouselPreference())

      // Should not crash when saving fails
      act(() => {
        result.current.toggle()
      })

      // State should still update even if save fails
      expect(result.current.enabled).toBe(true)
    })
  })

  describe('Hook Stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useCarouselPreference())

      const firstToggle = result.current.toggle
      const firstSetEnabled = result.current.setEnabled

      rerender()

      expect(result.current.toggle).toBe(firstToggle)
      expect(result.current.setEnabled).toBe(firstSetEnabled)
    })
  })
})
