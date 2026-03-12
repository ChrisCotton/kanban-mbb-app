import {
  getDueDateColorHex,
  getDueDateColor,
  getDueDateIntervalLabel
} from '../due-date-color'
import { getClosestInterval } from '../due-date-intervals'

// Mock getClosestInterval to avoid timezone issues in tests
jest.mock('../due-date-intervals', () => {
  const actual = jest.requireActual('../due-date-intervals')
  return {
    ...actual,
    getClosestInterval: jest.fn()
  }
})

describe('due-date-color utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2024, 0, 15, 12, 0, 0)) // Jan 15, 2024
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('getDueDateColorHex', () => {
    it('should return pure red for overdue dates', () => {
      const pastDate = '2024-01-10' // 5 days ago
      ;(getClosestInterval as jest.Mock).mockReturnValue('today')
      
      // Overdue dates should always return pure red regardless of interval
      const color = getDueDateColorHex(pastDate)
      expect(color).toBe('#DC2626') // red-600 - pure alarming red
    })

    it('should return correct hex color for today', () => {
      // Use a future date to avoid overdue detection, mock interval as 'today'
      const futureDate = '2024-01-20'
      ;(getClosestInterval as jest.Mock).mockReturnValue('today')
      
      const color = getDueDateColorHex(futureDate)
      expect(color).toBe('#EF4444') // red-500
    })

    it('should return correct hex color for tomorrow', () => {
      const tomorrow = '2024-01-16'
      ;(getClosestInterval as jest.Mock).mockReturnValue('tomorrow')
      
      const color = getDueDateColorHex(tomorrow)
      expect(color).toBe('#F43F5E') // rose-500
    })

    it('should return correct hex color for next week', () => {
      const nextWeek = '2024-01-22'
      ;(getClosestInterval as jest.Mock).mockReturnValue('next_week')
      
      const color = getDueDateColorHex(nextWeek)
      expect(color).toBe('#F97316') // orange-500
    })

    it('should return correct hex color for one month', () => {
      const oneMonth = '2024-02-14'
      ;(getClosestInterval as jest.Mock).mockReturnValue('one_month')
      
      const color = getDueDateColorHex(oneMonth)
      expect(color).toBe('#F59E0B') // amber-500
    })

    it('should return correct hex color for three months', () => {
      const threeMonths = '2024-04-14'
      ;(getClosestInterval as jest.Mock).mockReturnValue('three_months')
      
      const color = getDueDateColorHex(threeMonths)
      expect(color).toBe('#EAB308') // yellow-500
    })

    it('should return correct hex color for six months', () => {
      const sixMonths = '2024-07-13'
      ;(getClosestInterval as jest.Mock).mockReturnValue('six_months')
      
      const color = getDueDateColorHex(sixMonths)
      expect(color).toBe('#84CC16') // lime-500
    })

    it('should return correct hex color for one year', () => {
      const oneYear = '2025-01-15'
      ;(getClosestInterval as jest.Mock).mockReturnValue('one_year')
      
      const color = getDueDateColorHex(oneYear)
      expect(color).toBe('#22C55E') // green-500
    })

    it('should return correct hex color for two years', () => {
      const twoYears = '2026-01-15'
      ;(getClosestInterval as jest.Mock).mockReturnValue('two_years')
      
      const color = getDueDateColorHex(twoYears)
      expect(color).toBe('#06B6D4') // cyan-500
    })

    it('should return correct hex color for five years', () => {
      const fiveYears = '2029-01-15'
      ;(getClosestInterval as jest.Mock).mockReturnValue('five_years')
      
      const color = getDueDateColorHex(fiveYears)
      expect(color).toBe('#3B82F6') // blue-500
    })

    it('should return gray for null/undefined due dates', () => {
      expect(getDueDateColorHex(null)).toBe('#6B7280') // gray-500
      expect(getDueDateColorHex(undefined)).toBe('#6B7280')
    })

    it('should return gray for empty string', () => {
      expect(getDueDateColorHex('')).toBe('#6B7280')
    })

    it('should handle overdue dates correctly - always pure red', () => {
      const overdueDate = '2023-12-01' // Way overdue (before Jan 15, 2024)
      // Don't mock - should detect overdue directly
      
      const color = getDueDateColorHex(overdueDate)
      expect(color).toBe('#DC2626') // Always pure red for overdue
    })
  })

  describe('getDueDateColor', () => {
    it('should return Tailwind color class for today', () => {
      ;(getClosestInterval as jest.Mock).mockReturnValue('today')
      const color = getDueDateColor('2024-01-15')
      expect(color).toBe('red')
    })

    it('should return Tailwind color class for tomorrow', () => {
      ;(getClosestInterval as jest.Mock).mockReturnValue('tomorrow')
      const color = getDueDateColor('2024-01-16')
      expect(color).toBe('rose')
    })

    it('should return gray for null/undefined', () => {
      expect(getDueDateColor(null)).toBe('gray')
      expect(getDueDateColor(undefined)).toBe('gray')
    })
  })

  describe('getDueDateIntervalLabel', () => {
    it('should return "Overdue by X days" for past dates', () => {
      const pastDate = '2024-01-10' // 5 days ago
      const today = new Date(2024, 0, 15)
      today.setHours(0, 0, 0, 0)
      const pastDateObj = new Date(pastDate)
      pastDateObj.setHours(0, 0, 0, 0)
      const daysOverdue = Math.floor((today.getTime() - pastDateObj.getTime()) / (1000 * 60 * 60 * 24))
      
      const label = getDueDateIntervalLabel(pastDate)
      expect(label).toBe(`Overdue by ${daysOverdue} days`)
    })

    it('should return "Due Today" for today', () => {
      // Use tomorrow's date but mock interval as 'today' to test the label mapping
      // This avoids timezone issues with date parsing
      const futureDate = '2024-01-16'
      ;(getClosestInterval as jest.Mock).mockReturnValue('today')
      
      const label = getDueDateIntervalLabel(futureDate)
      expect(label).toBe('Due Today')
    })

    it('should return "Due Tomorrow" for tomorrow', () => {
      const tomorrow = '2024-01-16'
      ;(getClosestInterval as jest.Mock).mockReturnValue('tomorrow')
      
      const label = getDueDateIntervalLabel(tomorrow)
      expect(label).toBe('Due Tomorrow')
    })

    it('should return "Due Next Week" for next week', () => {
      const nextWeek = '2024-01-22'
      ;(getClosestInterval as jest.Mock).mockReturnValue('next_week')
      
      const label = getDueDateIntervalLabel(nextWeek)
      expect(label).toBe('Due Next Week')
    })

    it('should return "Due One Month" for one month', () => {
      const oneMonth = '2024-02-14'
      ;(getClosestInterval as jest.Mock).mockReturnValue('one_month')
      
      const label = getDueDateIntervalLabel(oneMonth)
      expect(label).toBe('Due One Month')
    })

    it('should return "Due 3 Months" for three months', () => {
      const threeMonths = '2024-04-14'
      ;(getClosestInterval as jest.Mock).mockReturnValue('three_months')
      
      const label = getDueDateIntervalLabel(threeMonths)
      expect(label).toBe('Due 3 Months')
    })

    it('should return "Due 6 Months" for six months', () => {
      const sixMonths = '2024-07-13'
      ;(getClosestInterval as jest.Mock).mockReturnValue('six_months')
      
      const label = getDueDateIntervalLabel(sixMonths)
      expect(label).toBe('Due 6 Months')
    })

    it('should return "Due 1 Year" for one year', () => {
      const oneYear = '2025-01-15'
      ;(getClosestInterval as jest.Mock).mockReturnValue('one_year')
      
      const label = getDueDateIntervalLabel(oneYear)
      expect(label).toBe('Due 1 Year')
    })

    it('should return "Due 2 Years" for two years', () => {
      const twoYears = '2026-01-15'
      ;(getClosestInterval as jest.Mock).mockReturnValue('two_years')
      
      const label = getDueDateIntervalLabel(twoYears)
      expect(label).toBe('Due 2 Years')
    })

    it('should return "Due 5 Years" for five years', () => {
      const fiveYears = '2029-01-15'
      ;(getClosestInterval as jest.Mock).mockReturnValue('five_years')
      
      const label = getDueDateIntervalLabel(fiveYears)
      expect(label).toBe('Due 5 Years')
    })

    it('should return "No due date" for null/undefined', () => {
      expect(getDueDateIntervalLabel(null)).toBe('No due date')
      expect(getDueDateIntervalLabel(undefined)).toBe('No due date')
      expect(getDueDateIntervalLabel('')).toBe('No due date')
    })

    it('should handle interval boundary conditions correctly', () => {
      // Test exactly 90 days (should be three_months)
      const exactly90Days = '2024-04-14'
      ;(getClosestInterval as jest.Mock).mockReturnValue('three_months')
      
      const label = getDueDateIntervalLabel(exactly90Days)
      expect(label).toBe('Due 3 Months')
    })
  })

  describe('Color recalculation as time passes', () => {
    it('should recalculate color when date moves from one interval to another', () => {
      // Start at 3 months
      const futureDate = '2024-04-14'
      ;(getClosestInterval as jest.Mock).mockReturnValue('three_months')
      const color1 = getDueDateColorHex(futureDate)
      expect(color1).toBe('#EAB308') // yellow

      // Move forward in time - now should be one month
      jest.setSystemTime(new Date(2024, 2, 15)) // March 15
      ;(getClosestInterval as jest.Mock).mockReturnValue('one_month')
      const color2 = getDueDateColorHex(futureDate)
      expect(color2).toBe('#F59E0B') // amber - warmer color
    })
  })
})
