import { renderHook, act } from '@testing-library/react'
import { useCarouselFullscreenPreference } from '../useCarouselFullscreenPreference'

describe('useCarouselFullscreenPreference', () => {
  const originalFullscreenElement = Object.getOwnPropertyDescriptor(Document.prototype, 'fullscreenElement')
  let requestFullscreen: jest.Mock
  let exitFullscreen: jest.Mock

  beforeEach(() => {
    requestFullscreen = jest.fn().mockResolvedValue(undefined)
    exitFullscreen = jest.fn().mockResolvedValue(undefined)

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      writable: true,
      value: null,
    })
    document.documentElement.requestFullscreen = requestFullscreen
    document.exitFullscreen = exitFullscreen
  })

  afterEach(() => {
    if (originalFullscreenElement) {
      Object.defineProperty(Document.prototype, 'fullscreenElement', originalFullscreenElement)
    }
  })

  it('starts off when the browser is not in fullscreen', () => {
    const { result } = renderHook(() => useCarouselFullscreenPreference())
    expect(result.current.enabled).toBe(false)
  })

  it('requests monitor fullscreen on toggle', async () => {
    const { result } = renderHook(() => useCarouselFullscreenPreference())

    await act(async () => {
      await result.current.toggle()
    })

    expect(requestFullscreen).toHaveBeenCalled()
  })

  it('exits monitor fullscreen when already fullscreen', async () => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    })

    const { result } = renderHook(() => useCarouselFullscreenPreference())

    await act(async () => {
      await result.current.toggle()
    })

    expect(exitFullscreen).toHaveBeenCalled()
  })

  it('syncs enabled from fullscreenchange', () => {
    const { result } = renderHook(() => useCarouselFullscreenPreference())

    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.documentElement,
      })
      document.dispatchEvent(new Event('fullscreenchange'))
    })

    expect(result.current.enabled).toBe(true)
  })
})
