import { useState, useEffect, useCallback } from 'react'

export interface UseCarouselFullscreenPreferenceReturn {
  enabled: boolean
  toggle: () => Promise<void>
  setEnabled: (value: boolean) => Promise<void>
}

export const COMPACT_CAROUSEL_HEIGHT = 'h-[50vh] md:h-[60vh]'
/** Fills remaining space in the monitor-fullscreen flex column (below nav, above quotes). */
export const IMMERSIVE_CAROUSEL_HEIGHT = 'flex-1 min-h-0 w-full'

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>
}

export const getFullscreenElement = (): Element | null => {
  if (typeof document === 'undefined') return null
  const doc = document as FullscreenDocument
  return doc.fullscreenElement || doc.webkitFullscreenElement || null
}

export const requestMonitorFullscreen = async (element: HTMLElement = document.documentElement) => {
  const el = element as FullscreenElement
  if (el.requestFullscreen) {
    await el.requestFullscreen()
    return
  }
  if (el.webkitRequestFullscreen) {
    await el.webkitRequestFullscreen()
  }
}

export const exitMonitorFullscreen = async () => {
  if (typeof document === 'undefined') return
  const doc = document as FullscreenDocument
  if (doc.exitFullscreen && getFullscreenElement()) {
    await doc.exitFullscreen()
    return
  }
  if (doc.webkitExitFullscreen && getFullscreenElement()) {
    await doc.webkitExitFullscreen()
  }
}

/**
 * Monitor-level fullscreen via the browser Fullscreen API.
 * Must be invoked from a user gesture. Esc or the toggle exits.
 */
export const useCarouselFullscreenPreference = (): UseCarouselFullscreenPreferenceReturn => {
  const [enabled, setEnabledState] = useState<boolean>(() => !!getFullscreenElement())

  useEffect(() => {
    if (typeof document === 'undefined') return

    const sync = () => setEnabledState(!!getFullscreenElement())

    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)

    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  const setEnabled = useCallback(async (value: boolean) => {
    try {
      if (value && !getFullscreenElement()) {
        await requestMonitorFullscreen()
      } else if (!value && getFullscreenElement()) {
        await exitMonitorFullscreen()
      }
    } catch (error) {
      console.error('Error changing monitor fullscreen:', error)
    }
  }, [])

  const toggle = useCallback(async () => {
    await setEnabled(!getFullscreenElement())
  }, [setEnabled])

  return {
    enabled,
    toggle,
    setEnabled,
  }
}

export default useCarouselFullscreenPreference
