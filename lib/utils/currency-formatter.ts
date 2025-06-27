/**
 * Currency formatting utilities for USD amounts
 * Task 4.6: Build currency formatter utility for USD hourly rate display
 */

export interface CurrencyFormatOptions {
  style?: 'currency' | 'decimal'
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  showCurrencySymbol?: boolean
  showPerHour?: boolean
}

/**
 * Format a number as USD currency
 */
export function formatCurrency(
  amount: number | string, 
  options: CurrencyFormatOptions = {}
): string {
  const {
    style = 'currency',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrencySymbol = true,
    showPerHour = false
  } = options

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount

  if (isNaN(numericAmount)) {
    return showCurrencySymbol ? '$0.00' : '0.00'
  }

  let formatted: string

  if (style === 'currency' && showCurrencySymbol) {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(numericAmount)
  } else {
    formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(numericAmount)
    
    if (showCurrencySymbol) {
      formatted = `$${formatted}`
    }
  }

  if (showPerHour) {
    formatted += '/hr'
  }

  return formatted
}

/**
 * Format a number as USD hourly rate
 */
export function formatHourlyRate(amount: number | string): string {
  return formatCurrency(amount, { showPerHour: true })
}

/**
 * Format a number as compact currency (e.g., $1.5K, $2.3M)
 */
export function formatCompactCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount

  if (isNaN(numericAmount)) {
    return '$0'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(numericAmount)
}

/**
 * Parse a currency string to number
 */
export function parseCurrency(currencyString: string): number {
  if (!currencyString || typeof currencyString !== 'string') {
    return 0
  }

  // Remove currency symbols, commas, and spaces
  const cleaned = currencyString
    .replace(/[$,\s]/g, '')
    .replace(/\/hr?$/i, '') // Remove /hr or /h suffix
    .trim()

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Validate if a string is a valid currency amount
 */
export function isValidCurrencyAmount(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }

  const cleaned = value.replace(/[$,\s]/g, '').replace(/\/hr?$/i, '').trim()
  const parsed = parseFloat(cleaned)
  
  return !isNaN(parsed) && parsed >= 0 && isFinite(parsed)
}

/**
 * Calculate earnings based on hours and hourly rate
 */
export function calculateEarnings(hours: number, hourlyRate: number): number {
  if (isNaN(hours) || isNaN(hourlyRate) || hours < 0 || hourlyRate < 0) {
    return 0
  }
  
  return hours * hourlyRate
}

/**
 * Calculate hours needed to reach a target amount at given hourly rate
 */
export function calculateHoursNeeded(targetAmount: number, hourlyRate: number): number {
  if (isNaN(targetAmount) || isNaN(hourlyRate) || hourlyRate <= 0) {
    return 0
  }
  
  return targetAmount / hourlyRate
}

/**
 * Format a duration in hours as a readable string
 */
export function formatDuration(hours: number): string {
  if (isNaN(hours) || hours < 0) {
    return '0h'
  }

  if (hours === 0) {
    return '0h'
  }

  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}m`
  }

  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  if (minutes === 0) {
    return `${wholeHours}h`
  }

  return `${wholeHours}h ${minutes}m`
}

/**
 * Get currency validation error message
 */
export function getCurrencyValidationError(value: string): string | null {
  if (!value || value.trim() === '') {
    return 'Amount is required'
  }

  const cleaned = value.replace(/[$,\s]/g, '').replace(/\/hr?$/i, '').trim()
  const parsed = parseFloat(cleaned)
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return 'Please enter a valid amount (e.g., 50.00)'
  }

  if (parsed < 0) {
    return 'Amount must be positive'
  }

  if (parsed > 999999) {
    return 'Amount must be less than $1,000,000'
  }

  return null
}

// Export commonly used formatters as default configurations
export const currencyFormatter = {
  // Standard currency formatting
  format: (amount: number | string) => formatCurrency(amount),
  
  // Hourly rate formatting
  hourly: (amount: number | string) => formatHourlyRate(amount),
  
  // Compact formatting for large amounts
  compact: (amount: number | string) => formatCompactCurrency(amount),
  
  // Decimal only (no currency symbol)
  decimal: (amount: number | string) => formatCurrency(amount, { 
    style: 'decimal', 
    showCurrencySymbol: false 
  }),
  
  // Parse currency strings
  parse: (currencyString: string) => parseCurrency(currencyString),
  
  // Validate currency inputs
  validate: (value: string) => getCurrencyValidationError(value),
  
  // Check if valid
  isValid: (value: string) => isValidCurrencyAmount(value)
}

export default currencyFormatter 