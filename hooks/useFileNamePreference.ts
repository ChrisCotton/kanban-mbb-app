import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'mbb-file-name-enabled'

export interface UseFileNamePreferenceReturn {
  enabled: boolean
  toggle: () => void
  setEnabled: (value: boolean) => void
}

/**
 * Custom hook for managing file name visibility preference
 * Stores user preference in localStorage with SSR-safe implementation
 * 
 * @returns {UseFileNamePreferenceReturn} File name preference state and controls
 * 
 * @example
 * const { enabled, toggle, setEnabled } = useFileNamePreference()
 * 
 * // Toggle file name
 * <button onClick={toggle}>Toggle File Name</button>
 * 
 * // Set specific value
 * <button onClick={() => setEnabled(false)}>Hide File Name</button>
 * 
 * // Use in conditional rendering
 * {enabled && <FileNameDisplay fileName={image.file_name} />}
 */
export const useFileNamePreference = (): UseFileNamePreferenceReturn => {
  // Initialize from localStorage or default to true (ON by default)
  const getInitialValue = (): boolean => {
    // SSR-safe: return default if window is undefined
    if (typeof window === 'undefined') {
      return true
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === null) {
        return true // Default: ON
      }
      return stored === 'true'
    } catch (error) {
      console.error('Error loading file name preference from localStorage:', error)
      return true
    }
  }

  const [enabled, setEnabledState] = useState<boolean>(getInitialValue)

  // Listen for storage changes from other components/tabs
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        const newValue = e.newValue === 'true'
        console.log('[useFileNamePreference] Storage changed from another source:', newValue)
        setEnabledState(newValue)
      }
    }

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange)

    // Listen for custom events from THIS window/tab
    const handleCustomStorageChange = ((e: CustomEvent) => {
      console.log('[useFileNamePreference] Custom storage event received:', e.detail)
      setEnabledState(e.detail.enabled)
    }) as EventListener

    window.addEventListener('file-name-preference-changed', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('file-name-preference-changed', handleCustomStorageChange)
    }
  }, [])

  // Save to localStorage whenever enabled changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
      
      // Dispatch custom event to notify other components in THIS tab
      const event = new CustomEvent('file-name-preference-changed', {
        detail: { enabled }
      })
      window.dispatchEvent(event)
      console.log('[useFileNamePreference] Dispatched storage change event:', enabled)
    } catch (error) {
      console.error('Error saving file name preference to localStorage:', error)
    }
  }, [enabled])

  // Toggle function
  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const newValue = !prev
      console.log('[useFileNamePreference] Toggling file name:', { from: prev, to: newValue })
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

export default useFileNamePreference
