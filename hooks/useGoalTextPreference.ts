import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'mbb-goal-text-enabled'

export interface UseGoalTextPreferenceReturn {
  enabled: boolean
  toggle: () => void
  setEnabled: (value: boolean) => void
}

/**
 * Custom hook for managing goal text visibility preference
 * Stores user preference in localStorage with SSR-safe implementation
 * 
 * @returns {UseGoalTextPreferenceReturn} Goal text preference state and controls
 * 
 * @example
 * const { enabled, toggle, setEnabled } = useGoalTextPreference()
 * 
 * // Toggle goal text
 * <button onClick={toggle}>Toggle Goal Text</button>
 * 
 * // Set specific value
 * <button onClick={() => setEnabled(false)}>Hide Goal Text</button>
 * 
 * // Use in conditional rendering
 * {enabled && image.goal && <GoalTextOverlay goal={image.goal} />}
 */
export const useGoalTextPreference = (): UseGoalTextPreferenceReturn => {
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
      console.error('Error loading goal text preference from localStorage:', error)
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
        console.log('[useGoalTextPreference] Storage changed from another source:', newValue)
        setEnabledState(newValue)
      }
    }

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange)

    // CRITICAL FIX: Listen for custom events from THIS window/tab
    const handleCustomStorageChange = ((e: CustomEvent) => {
      console.log('[useGoalTextPreference] Custom storage event received:', e.detail)
      setEnabledState(e.detail.enabled)
    }) as EventListener

    window.addEventListener('goal-text-preference-changed', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('goal-text-preference-changed', handleCustomStorageChange)
    }
  }, [])

  // Save to localStorage whenever enabled changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
      
      // Dispatch custom event to notify other components in THIS tab
      const event = new CustomEvent('goal-text-preference-changed', {
        detail: { enabled }
      })
      window.dispatchEvent(event)
      console.log('[useGoalTextPreference] Dispatched storage change event:', enabled)
    } catch (error) {
      console.error('Error saving goal text preference to localStorage:', error)
    }
  }, [enabled])

  // Toggle function
  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const newValue = !prev
      console.log('[useGoalTextPreference] Toggling goal text:', { from: prev, to: newValue })
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

export default useGoalTextPreference
