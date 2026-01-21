export type DueDateInterval = 
  | 'today' 
  | 'tomorrow'
  | 'next_week' 
  | 'one_month' 
  | 'three_months' 
  | 'six_months' 
  | 'one_year' 
  | 'two_years' 
  | 'five_years'
  | 'custom'

export interface IntervalOption {
  value: DueDateInterval
  label: string
  days: number
  color: string // Tailwind CSS color classes
  bgColor: string
  textColor: string
  borderColor: string
}

export const INTERVAL_OPTIONS: IntervalOption[] = [
  { 
    value: 'today', 
    label: 'Today', 
    days: 0,
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-300 dark:border-red-700'
  },
  { 
    value: 'tomorrow', 
    label: 'Tomorrow', 
    days: 1,
    color: 'rose',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-300 dark:border-rose-700'
  },
  { 
    value: 'next_week', 
    label: 'Next Week', 
    days: 7,
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-300',
    borderColor: 'border-orange-300 dark:border-orange-700'
  },
  { 
    value: 'one_month', 
    label: 'One Month', 
    days: 30,
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700'
  },
  { 
    value: 'three_months', 
    label: '3 Months', 
    days: 90,
    color: 'yellow',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    borderColor: 'border-yellow-300 dark:border-yellow-700'
  },
  { 
    value: 'six_months', 
    label: '6 Months', 
    days: 180,
    color: 'lime',
    bgColor: 'bg-lime-100 dark:bg-lime-900/30',
    textColor: 'text-lime-700 dark:text-lime-300',
    borderColor: 'border-lime-300 dark:border-lime-700'
  },
  { 
    value: 'one_year', 
    label: '1 Year', 
    days: 365,
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-300',
    borderColor: 'border-green-300 dark:border-green-700'
  },
  { 
    value: 'two_years', 
    label: '2 Years', 
    days: 730,
    color: 'cyan',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-300 dark:border-cyan-700'
  },
  { 
    value: 'five_years', 
    label: '5 Years', 
    days: 1825,
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-700'
  },
  { 
    value: 'custom', 
    label: 'Custom Date', 
    days: -1, // Special marker
    color: 'gray',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-300 dark:border-gray-700'
  }
]

/**
 * Calculate date from interval selection
 */
export function getDateFromInterval(interval: DueDateInterval): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const option = INTERVAL_OPTIONS.find(opt => opt.value === interval)
  if (!option || option.days === -1) {
    return today // Return today for custom (will be overridden by calendar)
  }
  
  const result = new Date(today)
  result.setDate(result.getDate() + option.days)
  return result
}

/**
 * Find closest interval for a given date
 */
export function getClosestInterval(date: Date | string): DueDateInterval {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const daysDiff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff < 0) {
    return 'today' // Past dates use today's color
  }
  
  // Find the interval with the closest days value
  let closestInterval: DueDateInterval = 'today'
  let minDiff = Infinity
  
  for (const option of INTERVAL_OPTIONS) {
    if (option.days === -1) continue // Skip custom
    
    const diff = Math.abs(option.days - daysDiff)
    if (diff < minDiff) {
      minDiff = diff
      closestInterval = option.value
    }
  }
  
  return closestInterval
}

/**
 * Get color styling for a given date
 */
export function getDateColorStyles(date: Date | string): {
  bgColor: string
  textColor: string
  borderColor: string
  interval: DueDateInterval
} {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const interval = getClosestInterval(dateObj)
  const option = INTERVAL_OPTIONS.find(opt => opt.value === interval) || INTERVAL_OPTIONS[0]
  
  return {
    bgColor: option.bgColor,
    textColor: option.textColor,
    borderColor: option.borderColor,
    interval: option.value
  }
}

/**
 * Format date for display
 */
export function formatDueDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
export function formatDueDateISO(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
