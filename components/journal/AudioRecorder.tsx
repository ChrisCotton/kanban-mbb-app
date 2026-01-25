'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void
  onCancel: () => void
  className?: string
  maxDuration?: number // in seconds
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'playing'

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  className = '',
  maxDuration = 1800 // 30 minutes default
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(0)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const blobCreatedRef = useRef<boolean>(false)

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false)
        setError('Audio recording is not supported in this browser')
        return
      }
      if (!window.MediaRecorder) {
        setIsSupported(false)
        setError('MediaRecorder is not supported in this browser')
        return
      }
    }
    
    checkSupport()
  }, [])

  // Get supported mime type
  const getSupportedMimeType = useCallback(() => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    
    // Fallback to default
    return ''
  }, [])

  // Timer for recording duration
  const startTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      setDuration(prev => {
        const newDuration = prev + 1
        if (newDuration >= maxDuration) {
          // Use the ref to call stopRecording to avoid closure issues
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
          }
        }
        return newDuration
      })
    }, 1000)
  }, [maxDuration])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Audio visualization
  const visualizeAudio = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    // Calculate volume level
    const sum = dataArray.reduce((acc, value) => acc + value, 0)
    const average = sum / dataArray.length
    setVolume(average / 255)

    if (recordingState === 'recording') {
      animationFrameRef.current = requestAnimationFrame(visualizeAudio)
    }
  }, [recordingState])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setRecordingState('recording') // Set state immediately for visual feedback
      console.log('🎤 Starting recording...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      console.log('✅ Got media stream')
      streamRef.current = stream
      
      // Set up audio context for visualization
      try {
        audioContextRef.current = new AudioContext()
        analyserRef.current = audioContextRef.current.createAnalyser()
        const source = audioContextRef.current.createMediaStreamSource(stream)
        source.connect(analyserRef.current)
        analyserRef.current.fftSize = 256
        console.log('✅ Audio context created')
      } catch (audioErr) {
        console.warn('⚠️ Audio context creation failed (visualization disabled):', audioErr)
        // Continue without visualization
      }

      // Get supported mime type
      const mimeType = getSupportedMimeType()
      console.log('📝 Using mime type:', mimeType || 'default')

      // Set up MediaRecorder
      const options = mimeType ? { mimeType } : undefined
      const mediaRecorder = new MediaRecorder(stream, options)
      
      console.log('✅ MediaRecorder created, state:', mediaRecorder.state)
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      blobCreatedRef.current = false

      // Track if we're intentionally stopping (vs canceling)
      let isIntentionalStop = false

      mediaRecorder.ondataavailable = (event) => {
        // CRITICAL FIX: Always capture chunks if they have data
        // The state check was preventing final chunks from being captured when stopping
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('📦 Data chunk received, size:', event.data.size, 'Total chunks:', chunksRef.current.length, 'MediaRecorder state:', mediaRecorderRef.current?.state)
        } else if (event.data) {
          // Even empty chunks might be important (final chunk can be empty but still needed)
          console.log('📦 Empty data chunk received (size: 0), but adding it anyway for completeness')
          chunksRef.current.push(event.data)
        } else {
          console.warn('⚠️ No data in event:', event)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event)
        setError('Recording error occurred. Please try again.')
      }

      mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder onstop fired, chunks:', chunksRef.current.length, 'chunk sizes:', chunksRef.current.map(c => c.size))
        
        // CRITICAL: Always try to create blob in onstop, even if chunks seem empty
        // Sometimes chunks are captured but not yet in the array when checked earlier
        if (!blobCreatedRef.current) {
          if (chunksRef.current.length > 0) {
            const blobType = mimeType || 'audio/webm'
            const blob = new Blob(chunksRef.current, { type: blobType })
            console.log('✅ Blob created in onstop, size:', blob.size, 'from', chunksRef.current.length, 'chunks')
            setAudioBlob(blob)
            setAudioUrl(URL.createObjectURL(blob))
            blobCreatedRef.current = true
          } else {
            console.error('❌ onstop fired but no chunks available - recording may have failed')
            setError('Recording failed: No audio data was captured. Please try recording again.')
          }
        } else {
          console.log('ℹ️ Blob already created, skipping')
        }
        
        setRecordingState('stopped')
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        
        // Clean up audio context
        if (audioContextRef.current) {
          try {
            if (audioContextRef.current.state !== 'closed') {
              audioContextRef.current.close()
            }
          } catch (err) {
            console.warn('Error closing audio context:', err)
          }
          audioContextRef.current = null
        }
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      console.log('🎬 MediaRecorder started, state:', mediaRecorder.state)
      
      // State already set above for immediate feedback
      setDuration(0)
      startTimer()
      visualizeAudio()

    } catch (err: any) {
      console.error('❌ Error starting recording:', err)
      let errorMessage = 'Failed to start recording. '
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access and try again.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.'
      } else {
        errorMessage += 'Please check microphone permissions and try again.'
      }
      setError(errorMessage)
      setRecordingState('idle')
      
      // Clean up any partial setup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close()
          }
        } catch (closeErr) {
          console.warn('Error closing audio context on error:', closeErr)
        }
        audioContextRef.current = null
      }
    }
  }, [startTimer, visualizeAudio, getSupportedMimeType])

  // Helper function to create blob from chunks
  const createBlobFromChunks = useCallback(() => {
    if (chunksRef.current.length > 0 && !blobCreatedRef.current) {
      try {
        const mimeType = getSupportedMimeType() || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        console.log('✅ Blob created from chunks, size:', blob.size, 'chunks:', chunksRef.current.length)
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setRecordingState('stopped')
        blobCreatedRef.current = true
        return true
      } catch (err) {
        console.error('❌ Error creating blob from chunks:', err)
        return false
      }
    }
    return false
  }, [getSupportedMimeType])

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('🛑 stopRecording called, state:', recordingState, 'mediaRecorder state:', mediaRecorderRef.current?.state, 'chunks:', chunksRef.current.length)
    
    // Prevent multiple calls
    if (recordingState === 'stopped' || recordingState === 'idle') {
      console.log('⚠️ Already stopped, ignoring stopRecording call')
      return
    }
    
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      try {
        // Stop the media recorder
        const currentState = mediaRecorderRef.current.state
        if (currentState !== 'inactive') {
          console.log('🛑 Stopping MediaRecorder, current state:', currentState)
          
          // CRITICAL: Request final data chunk before stopping
          // This ensures we get all recorded data
          if (currentState === 'recording' || currentState === 'paused') {
            try {
              // Request the final data chunk
              mediaRecorderRef.current.requestData()
              console.log('📤 Requested final data chunk')
            } catch (reqErr: any) {
              console.warn('⚠️ Could not request final data chunk:', reqErr?.message || reqErr)
              // Continue anyway - stop() will still trigger final chunk
            }
          }
          
          // Now stop the recorder (this will trigger onstop callback)
          try {
            mediaRecorderRef.current.stop()
            console.log('✅ MediaRecorder.stop() called successfully')
          } catch (stopErr: any) {
            console.error('❌ Error calling MediaRecorder.stop():', stopErr?.message || stopErr)
            // Try to recover by creating blob from existing chunks
            if (chunksRef.current.length > 0) {
              console.log('🔄 Attempting recovery: creating blob from existing chunks')
              createBlobFromChunks()
            }
            throw stopErr
          }
          
          // Immediately try to create blob if chunks exist (don't wait for onstop)
          // This handles cases where onstop doesn't fire properly
          if (chunksRef.current.length > 0) {
            console.log('📦 Chunks available, creating blob immediately...')
            createBlobFromChunks()
          } else {
            console.warn('⚠️ No chunks available yet, will wait for onstop callback')
          }
        } else {
          console.log('⚠️ MediaRecorder already inactive, creating blob from existing chunks')
          createBlobFromChunks()
        }
        
        // Fallback: if onstop doesn't fire and blob wasn't created, try again
        setTimeout(() => {
          if (chunksRef.current.length > 0 && !blobCreatedRef.current) {
            console.log('⚠️ onstop callback didn\'t fire after timeout, creating blob manually')
            createBlobFromChunks()
          } else if (chunksRef.current.length === 0) {
            console.error('❌ Still no chunks after timeout - recording may have failed')
            setError('Recording failed: No audio data captured. Please try again.')
          }
        }, 500)
      } catch (err: any) {
        console.error('❌ Error stopping media recorder:', err?.message || err)
        // Try to create blob from existing chunks as fallback
        if (chunksRef.current.length > 0) {
          console.log('🔄 Fallback: creating blob from existing chunks')
          createBlobFromChunks()
        } else {
          setError('Error stopping recording: ' + (err?.message || 'Unknown error'))
        }
      }
      
      stopTimer()
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      setVolume(0)
      
      // Don't clean up audio context and stream here - let onstop callback handle it
      // This ensures the MediaRecorder can properly finalize the recording
    } else {
      console.warn('⚠️ stopRecording called but conditions not met:', {
        hasMediaRecorder: !!mediaRecorderRef.current,
        recordingState,
        mediaRecorderState: mediaRecorderRef.current?.state,
        chunks: chunksRef.current.length
      })
      // Even if conditions aren't met, try to create blob if chunks exist
      if (chunksRef.current.length > 0) {
        console.log('📦 Creating blob from chunks despite conditions not being met')
        createBlobFromChunks()
      }
    }
  }, [recordingState, stopTimer, createBlobFromChunks])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
      stopTimer()
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      setVolume(0)
    }
  }, [recordingState, stopTimer])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
      startTimer()
      visualizeAudio()
    }
  }, [recordingState, startTimer, visualizeAudio])

  // Play recorded audio
  const playRecording = useCallback(() => {
    if (audioUrl) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl
        audioPlayerRef.current.play()
        setRecordingState('playing')
      }
    }
  }, [audioUrl])

  // Handle audio playback events
  const handleAudioEnded = useCallback(() => {
    setRecordingState('stopped')
  }, [])

  // Reset recording
  const resetRecording = useCallback(() => {
    console.log('🔄 Resetting recording, stopping MediaRecorder...')
    
    // CRITICAL: Stop the MediaRecorder FIRST before cleaning up
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
          console.log('🛑 Stopping MediaRecorder in reset, state:', mediaRecorderRef.current.state)
          mediaRecorderRef.current.stop()
        }
      } catch (err) {
        console.error('❌ Error stopping MediaRecorder in reset:', err)
      }
      // Clear the ref AFTER stopping
      mediaRecorderRef.current = null
    }
    
    stopTimer()
    setRecordingState('idle')
    setDuration(0)
    setAudioBlob(null)
    setVolume(0)
    blobCreatedRef.current = false
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    
    // Stop stream tracks (this stops the actual recording)
    if (streamRef.current) {
      try {
        console.log('🛑 Stopping stream tracks...')
        streamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('✅ Track stopped:', track.kind, track.readyState)
        })
      } catch (err) {
        console.warn('Error stopping stream tracks in reset:', err)
      }
      streamRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close()
        }
      } catch (err) {
        console.warn('Error closing audio context in reset:', err)
      }
      audioContextRef.current = null
    }
    
    // Clear chunks
    chunksRef.current = []
    console.log('✅ Recording reset complete')
  }, [stopTimer, audioUrl])

  // Handle save
  const handleSave = useCallback(() => {
    console.log('💾 Save clicked, audioBlob:', !!audioBlob, 'size:', audioBlob?.size, 'type:', audioBlob?.type, 'duration:', duration, 'chunks:', chunksRef.current.length)
    
    let blobToSave = audioBlob
    
    // If no blob but we have chunks, create one
    if (!blobToSave && chunksRef.current.length > 0) {
      console.log('🔄 No blob but chunks exist, creating blob from chunks...')
      const mimeType = getSupportedMimeType() || 'audio/webm'
      try {
        blobToSave = new Blob(chunksRef.current, { type: mimeType })
        console.log('✅ Blob created from chunks, size:', blobToSave.size, 'type:', blobToSave.type)
        // Update state so UI reflects the blob
        setAudioBlob(blobToSave)
        if (!audioUrl) {
          setAudioUrl(URL.createObjectURL(blobToSave))
        }
      } catch (err) {
        console.error('❌ Failed to create blob from chunks:', err)
        setError('Cannot save: Failed to create audio file')
        return
      }
    }
    
    if (blobToSave && blobToSave.size > 0) {
      console.log('✅ Calling onRecordingComplete with blob size:', blobToSave.size, 'type:', blobToSave.type)
      onRecordingComplete(blobToSave, duration)
    } else {
      console.error('❌ Cannot save - no valid audio data')
      setError('Cannot save: No audio data recorded. Please record audio before saving.')
    }
  }, [audioBlob, audioUrl, duration, onRecordingComplete, getSupportedMimeType])

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔄 Recording state changed to:', recordingState, 'MediaRecorder state:', mediaRecorderRef.current?.state)
  }, [recordingState])

  // Debug: Log audioBlob changes
  useEffect(() => {
    console.log('📦 audioBlob state changed:', !!audioBlob, 'size:', audioBlob?.size, 'chunks:', chunksRef.current.length, 'blobCreated:', blobCreatedRef.current)
  }, [audioBlob])

  // Safety net: Ensure blob is created when recording stops and chunks exist
  useEffect(() => {
    if ((recordingState === 'stopped' || recordingState === 'idle') && chunksRef.current.length > 0 && !blobCreatedRef.current && !audioBlob) {
      console.log('🛡️ Safety net: Creating blob from chunks after recording stopped')
      const mimeType = getSupportedMimeType() || 'audio/webm'
      try {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        console.log('✅ Safety net blob created, size:', blob.size)
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        blobCreatedRef.current = true
        if (recordingState === 'stopped') {
          // State already set, don't change it
        }
      } catch (err) {
        console.error('❌ Safety net blob creation failed:', err)
      }
    }
  }, [recordingState, audioBlob, getSupportedMimeType])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resetRecording()
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close()
          }
        } catch (err) {
          console.warn('Error closing audio context on unmount:', err)
        }
        audioContextRef.current = null
      }
    }
  }, [resetRecording])

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isSupported) {
    return (
      <div className={`${className} text-center py-12`}>
        <svg className="w-12 h-12 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">Recording Not Supported</h3>
        <p className="text-white/70 mb-4">{error}</p>
        <button
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-6`}>
      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Recording Interface */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
        {/* Visual Indicator */}
        <div className="mb-6">
          <div className="relative w-32 h-32 mx-auto">
            <div className={`absolute inset-0 rounded-full border-4 ${
              recordingState === 'recording' ? 'border-red-500 animate-pulse' :
              recordingState === 'paused' ? 'border-yellow-500' :
              recordingState === 'stopped' ? 'border-green-500' :
              'border-gray-300'
            }`}></div>
            
            {/* Volume visualization */}
            <div 
              className="absolute inset-2 rounded-full bg-blue-500 transition-all duration-100"
              style={{ 
                transform: `scale(${0.3 + volume * 0.7})`,
                opacity: recordingState === 'recording' ? 0.6 + volume * 0.4 : 0.3
              }}
            ></div>
            
            {/* Microphone icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Duration Display */}
        <div className="mb-6">
          <div className="text-3xl font-mono font-bold text-white mb-2">
            {formatDuration(duration)}
          </div>
          <div className="text-sm text-white/70">
            {recordingState === 'recording' && 'Recording...'}
            {recordingState === 'paused' && 'Paused'}
            {recordingState === 'stopped' && 'Recording complete'}
            {recordingState === 'playing' && 'Playing...'}
            {recordingState === 'idle' && 'Press record to start'}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {recordingState === 'idle' && (
            <div className="flex flex-col items-center">
              <button
                onClick={startRecording}
                className="bg-red-500 hover:bg-red-600 text-white p-5 rounded-full transition-all transform hover:scale-105 shadow-lg"
                title="Start Recording"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="6" />
                </svg>
              </button>
              <span className="text-white/70 text-sm mt-2">Record</span>
            </div>
          )}

          {recordingState === 'recording' && (
            <>
              <div className="flex flex-col items-center">
                <button
                  onClick={pauseRecording}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white p-5 rounded-full transition-all transform hover:scale-105 shadow-lg"
                  title="Pause Recording"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                </button>
                <span className="text-white/70 text-sm mt-2">Pause</span>
              </div>
              <div className="flex flex-col items-center">
                <button
                  onClick={stopRecording}
                  className="bg-gray-600 hover:bg-gray-700 text-white p-5 rounded-full transition-all transform hover:scale-105 shadow-lg"
                  title="Stop Recording"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
                <span className="text-white/70 text-sm mt-2">Stop</span>
              </div>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <div className="flex flex-col items-center">
                <button
                  onClick={resumeRecording}
                  className="bg-green-500 hover:bg-green-600 text-white p-5 rounded-full transition-all transform hover:scale-105 shadow-lg animate-pulse"
                  title="Resume Recording"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <span className="text-white/70 text-sm mt-2">Resume</span>
              </div>
              <div className="flex flex-col items-center">
                <button
                  onClick={stopRecording}
                  className="bg-gray-600 hover:bg-gray-700 text-white p-5 rounded-full transition-all transform hover:scale-105 shadow-lg"
                  title="Stop Recording"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
                <span className="text-white/70 text-sm mt-2">Stop</span>
              </div>
            </>
          )}

          {recordingState === 'stopped' && (
            <>
              <div className="flex flex-col items-center">
                <button
                  onClick={playRecording}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-5 rounded-full transition-all transform hover:scale-105 shadow-lg"
                  title="Play Recording"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <span className="text-white/70 text-sm mt-2">Play</span>
              </div>
              <div className="flex flex-col items-center">
                <button
                  onClick={resetRecording}
                  className="bg-orange-500 hover:bg-orange-600 text-white p-5 rounded-full transition-all transform hover:scale-105 shadow-lg"
                  title="Record Again"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <span className="text-white/70 text-sm mt-2">Re-record</span>
              </div>
            </>
          )}
        </div>

        {/* Duration Limit Warning */}
        {duration > maxDuration * 0.8 && recordingState === 'recording' && (
          <div className="text-sm text-orange-400 mb-4">
            Recording will automatically stop in {formatDuration(maxDuration - duration)}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            console.log('🚫 Cancel clicked, resetting recording...')
            resetRecording()
            onCancel()
          }}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-medium transition-colors border border-white/20"
        >
          Cancel
        </button>
        
        <button
          onClick={handleSave}
          disabled={!audioBlob && chunksRef.current.length === 0}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            (audioBlob || chunksRef.current.length > 0)
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={audioBlob ? 'Save recording' : chunksRef.current.length > 0 ? 'Save recording (will create from chunks)' : 'No recording available'}
        >
          Save Recording
        </button>
      </div>

      {/* Hidden audio player for playback */}
      <audio
        ref={audioPlayerRef}
        onEnded={handleAudioEnded}
        className="hidden"
      />
    </div>
  )
}

export default AudioRecorder 