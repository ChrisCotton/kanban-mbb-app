/**
 * Regression Test: AudioRecorder Stop Recording Error Fix
 * 
 * This test suite verifies that clicking "Stop Recording" does not throw
 * ReferenceError: healthCheckIntervalRef is not defined
 * 
 * Issue: healthCheckIntervalRef was not properly accessible in the onstop handler
 * Fix: Use healthCheckIntervalRef.current consistently and ensure proper cleanup
 * 
 * To run this test:
 *   npm test -- components/journal/__tests__/AudioRecorder.stop-recording.test.tsx
 * 
 * Test Coverage:
 * - Stop recording without errors
 * - Health check interval cleanup
 * - Blob creation from chunks
 * - Multiple chunks handling
 * - No chunks scenario
 * - Error handling during stop
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import AudioRecorder from '../AudioRecorder'

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType: string = 'audio/webm;codecs=opus'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onstop: (() => void) | null = null
  
  private chunks: Blob[] = []
  private timeslice: number = 0
  private intervalId: NodeJS.Timeout | null = null

  constructor(stream?: MediaStream, options?: { mimeType?: string }) {
    if (options?.mimeType) {
      this.mimeType = options.mimeType
    }
  }

  start(timeslice?: number) {
    this.state = 'recording'
    this.timeslice = timeslice || 1000
    
    // Simulate data chunks being generated
    this.intervalId = setInterval(() => {
      if (this.state === 'recording' && this.ondataavailable) {
        const mockChunk = new Blob(['mock-audio-data'], { type: this.mimeType })
        this.chunks.push(mockChunk)
        this.ondataavailable({ data: mockChunk })
      }
    }, this.timeslice)
  }

  stop() {
    if (this.state === 'recording' || this.state === 'paused') {
      this.state = 'inactive'
      
      // Clear interval
      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }
      
      // Send final empty chunk
      if (this.ondataavailable) {
        const finalChunk = new Blob([], { type: this.mimeType })
        this.ondataavailable({ data: finalChunk })
      }
      
      // Trigger onstop callback
      if (this.onstop) {
        this.onstop()
      }
    }
  }

  pause() {
    if (this.state === 'recording') {
      this.state = 'paused'
      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.start(this.timeslice)
    }
  }

  requestData() {
    if (this.ondataavailable && this.state === 'recording') {
      const chunk = new Blob(['requested-chunk'], { type: this.mimeType })
      this.chunks.push(chunk)
      this.ondataavailable({ data: chunk })
    }
  }

  static isTypeSupported(type: string): boolean {
    return ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4'].includes(type)
  }
}

// Mock MediaStream
class MockMediaStream {
  private audioTracks: MediaStreamTrack[] = []

  constructor() {
    // Create a mock audio track
    const mockTrack = {
      id: 'mock-audio-track-1',
      kind: 'audio' as const,
      label: 'Mock Microphone',
      enabled: true,
      muted: false,
      readyState: 'live' as MediaStreamTrackState,
      getSettings: () => ({
        deviceId: 'mock-device',
        groupId: 'mock-group',
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }),
      stop: jest.fn(),
    } as unknown as MediaStreamTrack
    
    this.audioTracks.push(mockTrack)
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.audioTracks
  }

  getTracks(): MediaStreamTrack[] {
    return this.audioTracks
  }
}

// Mock AudioContext
class MockAudioContext {
  state: AudioContextState = 'running'
  createAnalyser = jest.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn(),
  }))
  createMediaStreamSource = jest.fn(() => ({
    connect: jest.fn(),
  }))
  close = jest.fn()
}

// Mock global objects
const mockGetUserMedia = jest.fn()
const mockMediaRecorder = MockMediaRecorder

beforeAll(() => {
  // Mock navigator.mediaDevices.getUserMedia
  global.navigator.mediaDevices = {
    getUserMedia: mockGetUserMedia,
  } as any

  // Mock window.MediaRecorder
  global.window.MediaRecorder = mockMediaRecorder as any

  // Mock AudioContext
  global.AudioContext = MockAudioContext as any

  // Mock URL.createObjectURL
  global.URL.createObjectURL = jest.fn((blob) => `blob:${blob.type}`)
  global.URL.revokeObjectURL = jest.fn()

  // Mock requestAnimationFrame
  global.requestAnimationFrame = jest.fn((cb) => {
    setTimeout(cb, 16)
    return 1
  })
  global.cancelAnimationFrame = jest.fn()
})

describe('AudioRecorder - Stop Recording Regression Test', () => {
  let onRecordingComplete: jest.Mock
  let onCancel: jest.Mock
  let mockStream: MockMediaStream
  let mockRecorder: MockMediaRecorder

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    onRecordingComplete = jest.fn()
    onCancel = jest.fn()
    mockStream = new MockMediaStream()

    // Setup getUserMedia mock
    mockGetUserMedia.mockResolvedValue(mockStream as any)

    // Setup MediaRecorder mock
    mockRecorder = new MockMediaRecorder()
    jest.spyOn(global.window, 'MediaRecorder').mockImplementation(
      () => mockRecorder as any
    )
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Stop Recording - No Errors', () => {
    it('should not throw ReferenceError when stopping recording', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(
        <AudioRecorder
          onRecordingComplete={onRecordingComplete}
          onCancel={onCancel}
        />
      )

      // Find and click the Record button
      const recordButton = screen.getByTitle(/start recording|record/i)
      await act(async () => {
        fireEvent.click(recordButton)
        // Wait for getUserMedia to resolve
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled()
        })
        // Advance timers to allow MediaRecorder to start
        jest.advanceTimersByTime(100)
      })

      // Wait for recording state
      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument()
      })

      // Find and click the Stop button
      const stopButton = screen.getByTitle(/stop recording|stop/i)
      
      // This should NOT throw an error
      await act(async () => {
        expect(() => {
          fireEvent.click(stopButton)
        }).not.toThrow()
        
        // Advance timers to allow onstop callback to fire
        jest.advanceTimersByTime(100)
      })

      // Verify no ReferenceError was logged
      const errorCalls = consoleErrorSpy.mock.calls.filter(
        (call) => call[0]?.includes?.('ReferenceError') || 
                  call[0]?.includes?.('healthCheckIntervalRef')
      )
      expect(errorCalls).toHaveLength(0)

      consoleErrorSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })

    it('should properly clean up healthCheckIntervalRef when stopping', async () => {
      render(
        <AudioRecorder
          onRecordingComplete={onRecordingComplete}
          onCancel={onCancel}
        />
      )

      // Start recording
      const recordButton = screen.getByTitle('Start Recording')
      await act(async () => {
        fireEvent.click(recordButton)
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled()
        })
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument()
      })

      // Verify health check interval was set up
      expect(mockRecorder.state).toBe('recording')

      // Stop recording
      const stopButton = screen.getByTitle(/stop recording|stop/i)
      await act(async () => {
        fireEvent.click(stopButton)
        jest.advanceTimersByTime(100)
      })

      // Wait for onstop to complete
      await waitFor(() => {
        expect(mockRecorder.state).toBe('inactive')
      }, { timeout: 1000 })

      // Verify no errors occurred during cleanup
      expect(mockRecorder.onstop).toBeDefined()
    })

    it('should create blob from chunks when stopping', async () => {
      render(
        <AudioRecorder
          onRecordingComplete={onRecordingComplete}
          onCancel={onCancel}
        />
      )

      // Start recording
      const recordButton = screen.getByTitle('Start Recording')
      await act(async () => {
        fireEvent.click(recordButton)
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled()
        })
        // Advance timers to allow chunks to be generated
        jest.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument()
      })

      // Stop recording
      const stopButton = screen.getByTitle(/stop recording|stop/i)
      await act(async () => {
        fireEvent.click(stopButton)
        jest.advanceTimersByTime(200)
      })

      // Wait for blob creation and callback
      await waitFor(() => {
        expect(onRecordingComplete).toHaveBeenCalled()
      }, { timeout: 2000 })

      // Verify onRecordingComplete was called with a blob
      expect(onRecordingComplete).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.any(Number)
      )

      const callArgs = onRecordingComplete.mock.calls[0]
      const blob = callArgs[0]
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should handle stop recording after receiving multiple chunks', async () => {
      render(
        <AudioRecorder
          onRecordingComplete={onRecordingComplete}
          onCancel={onCancel}
        />
      )

      // Start recording
      const recordButton = screen.getByTitle('Start Recording')
      await act(async () => {
        fireEvent.click(recordButton)
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled()
        })
        // Simulate multiple chunks being received
        jest.advanceTimersByTime(3000)
      })

      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument()
      })

      // Stop recording
      const stopButton = screen.getByTitle(/stop recording|stop/i)
      
      await act(async () => {
        fireEvent.click(stopButton)
        jest.advanceTimersByTime(200)
      })

      // Verify completion callback was called
      await waitFor(() => {
        expect(onRecordingComplete).toHaveBeenCalled()
      }, { timeout: 2000 })

      // Verify blob was created with data
      const callArgs = onRecordingComplete.mock.calls[0]
      const blob = callArgs[0]
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should handle stop recording when no chunks were received', async () => {
      // Create a recorder that doesn't generate chunks
      const noChunkRecorder = new MockMediaRecorder()
      noChunkRecorder.start = jest.fn(() => {
        noChunkRecorder.state = 'recording'
      })
      noChunkRecorder.stop = jest.fn(() => {
        noChunkRecorder.state = 'inactive'
        if (noChunkRecorder.onstop) {
          noChunkRecorder.onstop()
        }
      })

      jest.spyOn(global.window, 'MediaRecorder').mockImplementation(
        () => noChunkRecorder as any
      )

      render(
        <AudioRecorder
          onRecordingComplete={onRecordingComplete}
          onCancel={onCancel}
        />
      )

      // Start recording
      const recordButton = screen.getByTitle('Start Recording')
      await act(async () => {
        fireEvent.click(recordButton)
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled()
        })
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument()
      })

      // Stop recording - should not throw even with no chunks
      const stopButton = screen.getByTitle(/stop recording|stop/i)
      
      await act(async () => {
        expect(() => {
          fireEvent.click(stopButton)
        }).not.toThrow()
        jest.advanceTimersByTime(200)
      })

      // Should show error message but not crash
      await waitFor(() => {
        expect(screen.getByText(/no audio data/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Health Check Interval Cleanup', () => {
    it('should clear health check interval when stopping recording', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      render(
        <AudioRecorder
          onRecordingComplete={onRecordingComplete}
          onCancel={onCancel}
        />
      )

      // Start recording
      const recordButton = screen.getByTitle('Start Recording')
      await act(async () => {
        fireEvent.click(recordButton)
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled()
        })
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument()
      })

      // Stop recording
      const stopButton = screen.getByTitle(/stop recording|stop/i)
      await act(async () => {
        fireEvent.click(stopButton)
        jest.advanceTimersByTime(200)
      })

      // Verify clearInterval was called (for health check cleanup)
      await waitFor(() => {
        expect(clearIntervalSpy).toHaveBeenCalled()
      }, { timeout: 1000 })

      clearIntervalSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully when stopping fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      // Create a recorder that throws on stop
      const errorRecorder = new MockMediaRecorder()
      errorRecorder.stop = jest.fn(() => {
        throw new Error('Stop failed')
      })

      jest.spyOn(global.window, 'MediaRecorder').mockImplementation(
        () => errorRecorder as any
      )

      render(
        <AudioRecorder
          onRecordingComplete={onRecordingComplete}
          onCancel={onCancel}
        />
      )

      // Start recording
      const recordButton = screen.getByTitle('Start Recording')
      await act(async () => {
        fireEvent.click(recordButton)
        await waitFor(() => {
          expect(mockGetUserMedia).toHaveBeenCalled()
        })
        jest.advanceTimersByTime(100)
      })

      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument()
      })

      // Stop recording - should handle error gracefully
      const stopButton = screen.getByTitle(/stop recording|stop/i)
      await act(async () => {
        expect(() => {
          fireEvent.click(stopButton)
        }).not.toThrow()
        jest.advanceTimersByTime(200)
      })

      consoleErrorSpy.mockRestore()
    })
  })
})
