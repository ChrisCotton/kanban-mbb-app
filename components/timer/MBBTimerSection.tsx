import React, { useState, useEffect } from 'react'
import { useTimer } from '../../hooks/useTimer'
import { saveTimerSession, startTimerSession, timerService } from '../../lib/timer-integration'
import TimerControls from './TimerControls'

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
              {activeTask?.category ? (
                <div className="text-sm text-white/70">
                  {activeTask.category.name}
                </div>
              ) : (
                <div className="text-sm text-blue-300">
                  👆 Click a task and select "Start Timing" to begin
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

          {/* Right Side - Timer Controls (Using TimerControls Component) */}
          <TimerControls
            isRunning={isRunning}
            isPaused={isPaused}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
            onReset={handleReset}
            size="md"
            variant="default"
            showLabels={true}
            disabled={!activeTask} // Disable when no task is selected
          />
        </div>
      </div>
    </div>
  )
}

export default MBBTimerSection