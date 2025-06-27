import React, { useState, useEffect } from 'react'
import { useTimer } from '../../hooks/useTimer'
import { saveTimerSession, startTimerSession, timerService } from '../../lib/timer-integration'

interface ActiveTask {
  id: string
  title: string
  category?: {
    id: string
    name: string
    hourly_rate: number
    color?: string
  }
}

interface MBBTimerSectionProps {
  activeTask?: ActiveTask | null
  onTaskSelect?: () => void
  className?: string
  userId?: string // Add userId prop for database operations
}

export const MBBTimerSection: React.FC<MBBTimerSectionProps> = ({
  activeTask,
  onTaskSelect,
  className = '',
  userId = 'demo-user' // Default user ID for demo purposes
}) => {
  // Use the useTimer hook instead of local state
  const timer = useTimer({
    activeTask,
    onTaskSelect,
    onSessionSave: async (session) => {
      if (userId) {
        await saveTimerSession(session, userId)
      }
    },
    autoSave: true
  })

  // Timer state from hook
  const { 
    currentTime, 
    isRunning, 
    isPaused, 
    sessionEarnings,
    start: handleStart,
    pause: handlePause,
    resume: handleResume,
    stop: handleStop,
    reset: handleReset
  } = timer

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Timer controls are now provided by the useTimer hook
  // All timer logic including database integration is handled in the hook

  return (
    <div className={`w-full bg-black/30 backdrop-blur-sm border-t border-white/10 ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Left Side - Session Earnings & Rate */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-sm font-medium text-white">Session:</div>
              <div className="text-xl font-bold text-green-400">
                {formatCurrency(sessionEarnings)}
              </div>
            </div>
            
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-sm font-medium text-white">Rate:</div>
              <div className="text-lg text-blue-400">
                {activeTask?.category?.hourly_rate 
                  ? `${formatCurrency(activeTask.category.hourly_rate)}/hr`
                  : '--'
                }
              </div>
            </div>
          </div>

          {/* Center - Active Task & Timer */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <div className="text-center sm:text-left">
              <div className="text-white font-medium">
                {activeTask ? activeTask.title : 'No task selected'}
              </div>
              {activeTask?.category && (
                <div className="text-sm text-white/70">
                  {activeTask.category.name}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-mono text-white bg-black/40 px-4 py-2 rounded-lg min-w-[120px] text-center">
                {formatTime(currentTime)}
              </div>
              
              {/* Timer Status Indicator */}
              <div className={`w-3 h-3 rounded-full ${
                isRunning && !isPaused 
                  ? 'bg-green-500 animate-pulse' 
                  : isPaused 
                    ? 'bg-yellow-500' 
                    : 'bg-gray-500'
              }`} />
            </div>
          </div>

          {/* Right Side - Timer Controls */}
          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Start</span>
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    onClick={handleResume}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">Pause</span>
                  </button>
                )}
                
                <button
                  onClick={handleStop}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">Stop</span>
                </button>
              </>
            )}
            
            <button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-lg text-white transition-colors"
              title="Reset Timer"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MBBTimerSection