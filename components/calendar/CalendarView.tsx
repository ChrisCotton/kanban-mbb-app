'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface Task {
  id: string
  title: string
  description?: string
  due_date?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'backlog' | 'todo' | 'doing' | 'done'
  category_id?: string
  category?: {
    name: string
    hourly_rate_usd: number
  }
}

interface CalendarViewProps {
  userId?: string
  className?: string
  onTaskSelect?: (task: Task) => void
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  tasks: Task[]
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200'
}

const STATUS_COLORS = {
  backlog: 'border-l-gray-400',
  todo: 'border-l-blue-400',
  doing: 'border-l-yellow-400',
  done: 'border-l-green-400'
}

const CalendarView: React.FC<CalendarViewProps> = ({
  userId,
  className = '',
  onTaskSelect
}) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)

  // Get calendar days for current month
  const getCalendarDays = useCallback((): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    
    // Generate 42 days (6 weeks) to fill the calendar grid
    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      const isCurrentMonth = date.getMonth() === month
      const isToday = date.getTime() === today.getTime()
      
      // Find tasks for this date
      const dayTasks = tasks.filter(task => {
        if (!task.due_date) return false
        const taskDate = new Date(task.due_date)
        taskDate.setHours(0, 0, 0, 0)
        return taskDate.getTime() === date.getTime()
      })
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        tasks: dayTasks
      })
    }
    
    return days
  }, [currentDate, tasks])

  // Load tasks from API endpoint
  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Loading tasks from API...')
      
      const response = await fetch('/api/kanban/tasks')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load tasks')
      }
      
      // Filter tasks that have due dates
      const tasksWithDueDates = (result.data || []).filter((task: Task) => 
        task.due_date != null
      )
      
      console.log('Loaded tasks with due dates:', tasksWithDueDates)
      setTasks(tasksWithDueDates)
    } catch (err) {
      console.error('Error loading tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Task interaction
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowTaskModal(true)
    if (onTaskSelect) {
      onTaskSelect(task)
    }
  }

  // Effects
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const calendarDays = getCalendarDays()

  if (loading) {
    return (
      <div className={`${className} py-12`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Today
            </button>
            
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-red-50 border-b border-red-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-7 gap-px mb-2">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {calendarDays.map((day, index) => {
            const dayClassName = `min-h-32 bg-white p-2 ${
              day.isCurrentMonth ? '' : 'bg-gray-50'
            } ${day.isToday ? 'bg-blue-50' : ''}`
            
            const dateClassName = `text-sm font-medium mb-1 ${
              day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            } ${day.isToday ? 'text-blue-600' : ''}`
            
            return (
              <div key={index} className={dayClassName}>
                <div className={dateClassName}>
                  {day.date.getDate()}
                </div>

                <div className="space-y-1">
                  {day.tasks.slice(0, 3).map(task => {
                    const taskClassName = `text-xs p-1 rounded border-l-2 cursor-pointer hover:shadow-sm transition-shadow ${
                      PRIORITY_COLORS[task.priority]
                    } ${STATUS_COLORS[task.status]}`
                    
                    const taskTitle = `${task.title}${task.category ? ` (${task.category.name})` : ''}`
                    
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={taskClassName}
                        title={taskTitle}
                      >
                        <div className="truncate font-medium">{task.title}</div>
                        {task.category && (
                          <div className="truncate text-gray-600">
                            {task.category.name}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {day.tasks.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{day.tasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{selectedTask.title}</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedTask.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-600">{selectedTask.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                    PRIORITY_COLORS[selectedTask.priority]
                  }`}>
                    {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className="text-sm text-gray-600">
                    {selectedTask.status.charAt(0).toUpperCase() + selectedTask.status.slice(1)}
                  </span>
                </div>
              </div>
              
              {selectedTask.due_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedTask.due_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              
              {selectedTask.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-sm text-gray-600">
                    {selectedTask.category.name} (${selectedTask.category.hourly_rate_usd}/hr)
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarView
