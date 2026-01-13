import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'mbb-carousel-enabled'

export interface UseCarouselPreferenceReturn {
  enabled: boolean
  toggle: () => void
  setEnabled: (value: boolean) => void
}

/**
 * Custom hook for managing carousel visibility preference
 * Stores user preference in localStorage with SSR-safe implementation
 * 
 * @returns {UseCarouselPreferenceReturn} Carousel preference state and controls
 * 
 * @example
 * const { enabled, toggle, setEnabled } = useCarouselPreference()
 * 
 * // Toggle carousel
 * <button onClick={toggle}>Toggle Carousel</button>
 * 
 * // Set specific value
 * <button onClick={() => setEnabled(false)}>Hide Carousel</button>
 * 
 * // Use in conditional rendering
 * {enabled && <VisionBoardCarousel />}
 */
export const useCarouselPreference = (): UseCarouselPreferenceReturn => {
  // Initialize from localStorage or default to false (OFF by default for performance)
  const getInitialValue = (): boolean => {
    // SSR-safe: return default if window is undefined
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === null) {
        return false // Default: OFF
      }
      return stored === 'true'
    } catch (error) {
      console.error('Error loading carousel preference from localStorage:', error)
      return false
    }
  }

  const [enabled, setEnabledState] = useState<boolean>(getInitialValue)

  // Listen for storage changes from other components/tabs
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        const newValue = e.newValue === 'true'
        console.log('[useCarouselPreference] Storage changed from another source:', newValue)
        setEnabledState(newValue)
      }
    }

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange)

    // CRITICAL FIX: Listen for custom events from THIS window/tab
    const handleCustomStorageChange = ((e: CustomEvent) => {
      console.log('[useCarouselPreference] Custom storage event received:', e.detail)
      setEnabledState(e.detail.enabled)
    }) as EventListener

    window.addEventListener('carousel-preference-changed', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('carousel-preference-changed', handleCustomStorageChange)
    }
  }, [])

  // Save to localStorage whenever enabled changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
      
      // Dispatch custom event to notify other components in THIS tab
      const event = new CustomEvent('carousel-preference-changed', {
        detail: { enabled }
      })
      window.dispatchEvent(event)
      console.log('[useCarouselPreference] Dispatched storage change event:', enabled)
    } catch (error) {
      console.error('Error saving carousel preference to localStorage:', error)
    }
  }, [enabled])

  // Toggle function
  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const newValue = !prev
      console.log('[useCarouselPreference] Toggling carousel:', { from: prev, to: newValue })
      return newValue
    })
  }, [])

  // Set enabled to specific value
  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
  }, [])

  return {
    enabled,
    toggle,
    setEnabled
  }
}

export default useCarouselPreference
