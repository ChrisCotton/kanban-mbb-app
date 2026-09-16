import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'mbb-carousel-fullscreen'
const CHANGE_EVENT = 'carousel-fullscreen-preference-changed'

export interface UseCarouselFullscreenPreferenceReturn {
  enabled: boolean
  toggle: () => void
  setEnabled: (value: boolean) => void
}

export const COMPACT_CAROUSEL_HEIGHT = 'h-[50vh] md:h-[60vh]'
/** Viewport minus fixed nav (~4rem) and quotes strip (h-14 / 3.5rem). */
export const FULLSCREEN_CAROUSEL_HEIGHT = 'h-[calc(100vh-4rem-3.5rem)]'

export const useCarouselFullscreenPreference = (): UseCarouselFullscreenPreferenceReturn => {
  const getInitialValue = (): boolean => {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === null) {
        return false
      }
      return stored === 'true'
    } catch (error) {
      console.error('Error loading carousel fullscreen preference from localStorage:', error)
      return false
    }
  }

  const [enabled, setEnabledState] = useState<boolean>(getInitialValue)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setEnabledState(e.newValue === 'true')
      }
    }

    const handleCustomStorageChange = ((e: CustomEvent) => {
      setEnabledState(e.detail.enabled)
    }) as EventListener

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(CHANGE_EVENT, handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(CHANGE_EVENT, handleCustomStorageChange)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, {
          detail: { enabled },
        })
      )
    } catch (error) {
      console.error('Error saving carousel fullscreen preference to localStorage:', error)
    }
  }, [enabled])

  const toggle = useCallback(() => {
    setEnabledState((prev) => !prev)
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
  }, [])

  return {
    enabled,
    toggle,
    setEnabled,
  }
}

export default useCarouselFullscreenPreference
