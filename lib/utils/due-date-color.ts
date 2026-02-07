import { getClosestInterval, DueDateInterval } from './due-date-intervals'

/**
 * Color mapping from intervals to hex colors
 * Colors get warmer (more red/orange) as deadlines approach
 */
const INTERVAL_COLOR_MAP: Record<DueDateInterval, string> = {
  today: '#EF4444',        // red-500
  tomorrow: '#F43F5E',     // rose-500
  next_week: '#F97316',   // orange-500
  one_month: '#F59E0B',   // amber-500
  three_months: '#EAB308', // yellow-500
  six_months: '#84CC16',   // lime-500
  one_year: '#22C55E',     // green-500
  two_years: '#06B6D4',    // cyan-500
  five_years: '#3B82F6',   // blue-500
  custom: '#6B7280'        // gray-500 (no date)
}

/**
 * Tailwind color class mapping
 */
const INTERVAL_COLOR_CLASS_MAP: Record<DueDateInterval, string> = {
  today: 'red',
  tomorrow: 'rose',
  next_week: 'orange',
  one_month: 'amber',
  three_months: 'yellow',
  six_months: 'lime',
  one_year: 'green',
  two_years: 'cyan',
  five_years: 'blue',
  custom: 'gray'
}

/**
 * Interval label mapping for tooltips
 */
const INTERVAL_LABEL_MAP: Record<DueDateInterval, string> = {
  today: 'Due Today',
  tomorrow: 'Due Tomorrow',
  next_week: 'Due Next Week',
  one_month: 'Due One Month',
  three_months: 'Due 3 Months',
  six_months: 'Due 6 Months',
  one_year: 'Due 1 Year',
  two_years: 'Due 2 Years',
  five_years: 'Due 5 Years',
  custom: 'No due date'
}

/**
 * Check if a date is overdue
 */
function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(dueDate)
  targetDate.setHours(0, 0, 0, 0)
  
  return targetDate.getTime() < today.getTime()
}

/**
 * Calculate days overdue for a past date
 */
function getDaysOverdue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(dueDate)
  targetDate.setHours(0, 0, 0, 0)
  
  return Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get hex color for a due date based on interval
 * Returns pure alarming red (#DC2626) for overdue dates
 * Returns gray (#6B7280) for null/undefined/empty dates
 */
export function getDueDateColorHex(dueDate: string | null | undefined): string {
  // Handle null/undefined/empty
  if (!dueDate || dueDate.trim() === '') {
    return INTERVAL_COLOR_MAP.custom // gray
  }

  // Check if overdue - always return pure red
  if (isOverdue(dueDate)) {
    return '#DC2626' // red-600 - pure alarming red
  }

  // Get the closest interval for the due date
  const interval = getClosestInterval(dueDate)
  
  // Return the hex color for that interval
  return INTERVAL_COLOR_MAP[interval] || INTERVAL_COLOR_MAP.custom
}

/**
 * Get Tailwind color class for a due date
 */
export function getDueDateColor(dueDate: string | null | undefined): string {
  if (!dueDate || dueDate.trim() === '') {
    return INTERVAL_COLOR_CLASS_MAP.custom
  }

  if (isOverdue(dueDate)) {
    return 'red' // Overdue uses red
  }

  const interval = getClosestInterval(dueDate)
  return INTERVAL_COLOR_CLASS_MAP[interval] || INTERVAL_COLOR_CLASS_MAP.custom
}

/**
 * Get human-readable label for a due date interval
 * Returns "Overdue by X days" for past dates
 * Returns "Due [interval]" for future dates
 * Returns "No due date" for null/undefined
 */
export function getDueDateIntervalLabel(dueDate: string | null | undefined): string {
  // Handle null/undefined/empty
  if (!dueDate || dueDate.trim() === '') {
    return INTERVAL_LABEL_MAP.custom
  }

  // Check if overdue
  if (isOverdue(dueDate)) {
    const daysOverdue = getDaysOverdue(dueDate)
    return `Overdue by ${daysOverdue} days`
  }

  // Get the closest interval and return its label
  const interval = getClosestInterval(dueDate)
  return INTERVAL_LABEL_MAP[interval] || INTERVAL_LABEL_MAP.custom
}
