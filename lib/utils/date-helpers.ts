/**
 * Date helper utilities to handle timezone issues with YYYY-MM-DD date strings.
 * 
 * JavaScript's `new Date('YYYY-MM-DD')` interprets date strings as UTC midnight,
 * which when converted to local timezones behind UTC (like PST/PDT) becomes the previous day.
 * 
 * These helpers parse YYYY-MM-DD dates as local dates to avoid timezone shifts.
 */

/**
 * Parse a date string as a local date (not UTC) to avoid timezone shifts.
 * 
 * @param dateString - Date string in YYYY-MM-DD format or other ISO formats
 * @returns Date object parsed as local date
 * 
 * @example
 * // Input: "2026-01-28"
 * // UTC parse: new Date("2026-01-28") → Jan 27 in PST ❌
 * // Local parse: parseLocalDate("2026-01-28") → Jan 28 in PST ✅
 */
export function parseLocalDate(dateString: string): Date {
  // If date is in YYYY-MM-DD format, parse as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day) // month is 0-indexed
  }
  // For other formats (with time, ISO strings, etc.), parse normally
  return new Date(dateString)
}

/**
 * Format a date as a local date string (YYYY-MM-DD) without UTC conversion.
 * 
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if a date string represents today (in local timezone).
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns true if the date is today
 */
export function isToday(dateString: string): boolean {
  const date = parseLocalDate(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date.getTime() === today.getTime()
}

/**
 * Check if a date string represents a past date (in local timezone).
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns true if the date is before today
 */
export function isPastDate(dateString: string): boolean {
  const date = parseLocalDate(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

/**
 * Compare two date strings (in local timezone).
 * 
 * @param dateString1 - First date string in YYYY-MM-DD format
 * @param dateString2 - Second date string in YYYY-MM-DD format
 * @returns Negative if date1 < date2, positive if date1 > date2, 0 if equal
 */
export function compareDates(dateString1: string, dateString2: string): number {
  const date1 = parseLocalDate(dateString1)
  const date2 = parseLocalDate(dateString2)
  date1.setHours(0, 0, 0, 0)
  date2.setHours(0, 0, 0, 0)
  return date1.getTime() - date2.getTime()
}
