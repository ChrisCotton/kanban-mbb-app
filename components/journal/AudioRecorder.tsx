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
  maxDuration = 600 // 10 minutes default
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

  // Timer for recording duration
  const startTimer = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setDuration(prev => {
        const newDuration = prev + 1
        if (newDuration >= maxDuration) {
          stopRecording()
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
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      streamRef.current = stream
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setRecordingState('stopped')
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      setRecordingState('recording')
      setDuration(0)
      startTimer()
      visualizeAudio()

    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to start recording. Please check microphone permissions.')
    }
  }, [startTimer, visualizeAudio])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop()
      stopTimer()
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      setVolume(0)
    }
  }, [recordingState, stopTimer])

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
    stopTimer()
    setRecordingState('idle')
    setDuration(0)
    setAudioBlob(null)
    setVolume(0)
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [stopTimer, audioUrl])

  // Handle save
  const handleSave = useCallback(() => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, duration)
    }
  }, [audioBlob, duration, onRecordingComplete])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resetRecording()
      if (audioContextRef.current) {
        audioContextRef.current.close()
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
        <div className="flex items-center justify-center space-x-4 mb-6">
          {recordingState === 'idle' && (
            <button
              onClick={startRecording}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors"
              title="Start Recording"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          {recordingState === 'recording' && (
            <>
              <button
                onClick={pauseRecording}
                className="bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-full transition-colors"
                title="Pause Recording"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              </button>
              <button
                onClick={stopRecording}
                className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-full transition-colors"
                title="Stop Recording"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <button
                onClick={resumeRecording}
                className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full transition-colors"
                title="Resume Recording"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={stopRecording}
                className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-full transition-colors"
                title="Stop Recording"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </>
          )}

          {recordingState === 'stopped' && (
            <>
              <button
                onClick={playRecording}
                className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full transition-colors"
                title="Play Recording"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={resetRecording}
                className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-full transition-colors"
                title="Record Again"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
          onClick={onCancel}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-medium transition-colors border border-white/20"
        >
          Cancel
        </button>
        
        <button
          onClick={handleSave}
          disabled={!audioBlob}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            audioBlob
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
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