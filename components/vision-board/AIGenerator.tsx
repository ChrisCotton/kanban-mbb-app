import React, { useState, useEffect, useCallback } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { 
  DueDateInterval, 
  INTERVAL_OPTIONS, 
  getDateFromInterval, 
  getClosestInterval,
  getDateColorStyles,
  formatDueDateISO
} from '@/lib/utils/due-date-intervals'

interface AIGeneratorProps {
  userId: string
  aiProvider: string
  onGenerationComplete?: (imageId: string, imageUrl: string) => void
  onGenerationError?: (error: string) => void
}

export default function AIGenerator({
  userId,
  aiProvider,
  onGenerationComplete,
  onGenerationError
}: AIGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [goal, setGoal] = useState('')
  const [selectedInterval, setSelectedInterval] = useState<DueDateInterval>('one_month')
  const [customDate, setCustomDate] = useState<Date | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [isGenerating, setIsGenerating] = useState(false)
  const [errors, setErrors] = useState<{ prompt?: string; goal?: string; dueDate?: string }>({})

  // Calculate due date based on interval or custom date
  const calculatedDueDate = selectedInterval === 'custom' && customDate
    ? customDate
    : getDateFromInterval(selectedInterval)

  // Get color styles for the calculated due date
  const dateColorStyles = getDateColorStyles(calculatedDueDate)

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = {}

    if (!prompt.trim()) {
      newErrors.prompt = 'Prompt is required'
    }

    if (!goal.trim()) {
      newErrors.goal = 'Goal is required'
    } else if (goal.trim().length > 500) {
      newErrors.goal = 'Goal must be 500 characters or less'
    }

    if (selectedInterval === 'custom' && !customDate) {
      newErrors.dueDate = 'Please select a custom date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [prompt, goal, selectedInterval, customDate])

  // Handle form submission
  const handleGenerate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsGenerating(true)
    setErrors({})

    try {
      const dueDateISO = formatDueDateISO(calculatedDueDate)

      const response = await fetch('/api/vision-board/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          prompt: prompt.trim(),
          goal: goal.trim(),
          due_date: dueDateISO,
          media_type: mediaType
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate image')
      }

      if (result.success && result.data) {
        // Reset form
        setPrompt('')
        setGoal('')
        setSelectedInterval('one_month')
        setCustomDate(null)
        setMediaType('image')

        // Call success callback
        if (onGenerationComplete) {
          onGenerationComplete(result.data.id, result.data.file_path)
        }
      } else {
        throw new Error(result.error || 'Generation failed')
      }
    } catch (error: any) {
      console.error('Error generating image:', error)
      const errorMessage = error.message || 'Failed to generate image. Please try again.'
      setErrors({ prompt: errorMessage })
      if (onGenerationError) {
        onGenerationError(errorMessage)
      }
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, goal, selectedInterval, customDate, mediaType, calculatedDueDate, userId, validateForm, onGenerationComplete, onGenerationError])

  // Update custom date when interval changes
  useEffect(() => {
    if (selectedInterval !== 'custom') {
      setCustomDate(null)
    }
  }, [selectedInterval])

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-6 mb-8">
      <h2 className="text-xl font-semibold text-white mb-4">Generate AI Image/Video</h2>
      
      <form onSubmit={handleGenerate} className="space-y-4">
        {/* Prompt Input */}
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-white mb-2">
            Prompt <span className="text-red-400">*</span>
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              if (errors.prompt) {
                setErrors(prev => ({ ...prev, prompt: undefined }))
              }
            }}
            rows={4}
            className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.prompt ? 'border-red-500' : 'border-white/20'
            }`}
            placeholder="Describe the image or video you want to generate..."
            required
          />
          {errors.prompt && (
            <p className="mt-1 text-sm text-red-400">{errors.prompt}</p>
          )}
        </div>

        {/* Goal Input */}
        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-white mb-2">
            Goal <span className="text-red-400">*</span>
          </label>
          <input
            id="goal"
            type="text"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value)
              if (errors.goal) {
                setErrors(prev => ({ ...prev, goal: undefined }))
              }
            }}
            maxLength={500}
            className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.goal ? 'border-red-500' : 'border-white/20'
            }`}
            placeholder="Enter your goal for this vision..."
            required
          />
          {errors.goal && (
            <p className="mt-1 text-sm text-red-400">{errors.goal}</p>
          )}
          <p className="mt-1 text-xs text-white/60">{goal.length}/500 characters</p>
        </div>

        {/* Due Date Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Due Date <span className="text-red-400">*</span>
          </label>
          
          {/* Interval Dropdown */}
          <select
            value={selectedInterval}
            onChange={(e) => {
              setSelectedInterval(e.target.value as DueDateInterval)
              if (errors.dueDate) {
                setErrors(prev => ({ ...prev, dueDate: undefined }))
              }
            }}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          >
            {INTERVAL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom Date Picker */}
          {selectedInterval === 'custom' && (
            <div className="mb-3">
              <DatePicker
                selected={customDate}
                onChange={(date: Date | null) => {
                  setCustomDate(date)
                  if (errors.dueDate) {
                    setErrors(prev => ({ ...prev, dueDate: undefined }))
                  }
                }}
                dateFormat="MMMM d, yyyy"
                className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.dueDate ? 'border-red-500' : 'border-white/20'
                }`}
                placeholderText="Select a custom date"
                required={selectedInterval === 'custom'}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-400">{errors.dueDate}</p>
              )}
            </div>
          )}

          {/* Date Preview with Color */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${dateColorStyles.bgColor} ${dateColorStyles.borderColor}`}>
            <span className={`text-sm font-medium ${dateColorStyles.textColor}`}>
              Due: {calculatedDueDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: dateColorStyles.bgColor.includes('red') ? '#ef4444' : 
                                  dateColorStyles.bgColor.includes('orange') ? '#f97316' :
                                  dateColorStyles.bgColor.includes('amber') ? '#f59e0b' :
                                  dateColorStyles.bgColor.includes('yellow') ? '#eab308' :
                                  dateColorStyles.bgColor.includes('lime') ? '#84cc16' :
                                  dateColorStyles.bgColor.includes('green') ? '#22c55e' :
                                  dateColorStyles.bgColor.includes('cyan') ? '#06b6d4' :
                                  dateColorStyles.bgColor.includes('blue') ? '#3b82f6' : '#6b7280' 
              }} 
            />
          </div>
        </div>

        {/* Media Type Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Media Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="image"
                checked={mediaType === 'image'}
                onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-white">Image</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="video"
                checked={mediaType === 'video'}
                onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-white">Video</span>
            </label>
          </div>
          <p className="mt-1 text-xs text-white/60">
            Using: {aiProvider === 'nano_banana' ? 'Nano Banana' : aiProvider === 'veo_3' ? 'Google Veo 3' : aiProvider}
          </p>
        </div>

        {/* Generate Button */}
        <button
          type="submit"
          disabled={isGenerating}
          className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
            isGenerating
              ? 'bg-gray-500 cursor-not-allowed opacity-50'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {isGenerating ? 'Generating...' : `Generate ${mediaType === 'video' ? 'Video' : 'Image'}`}
        </button>
      </form>
    </div>
  )
}
