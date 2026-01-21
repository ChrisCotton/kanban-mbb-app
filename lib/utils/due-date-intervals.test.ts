import {
  DueDateInterval,
  INTERVAL_OPTIONS,
  getDateFromInterval,
  getClosestInterval,
  getDateColorStyles,
  formatDueDateISO
} from './due-date-intervals'

describe('due-date-intervals utilities', () => {
  describe('INTERVAL_OPTIONS', () => {
    it('should have all required interval options', () => {
      const expectedIntervals: DueDateInterval[] = [
        'today',
        'tomorrow',
        'next_week',
        'one_month',
        'three_months',
        'six_months',
        'one_year',
        'two_years',
        'five_years',
        'custom'
      ]

      const actualIntervals = INTERVAL_OPTIONS.map(opt => opt.value)
      expectedIntervals.forEach(interval => {
        expect(actualIntervals).toContain(interval)
      })
    })

    it('should have correct days values for each interval', () => {
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'today')?.days).toBe(0)
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'next_week')?.days).toBe(7)
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'one_month')?.days).toBe(30)
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'three_months')?.days).toBe(90)
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'six_months')?.days).toBe(180)
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'one_year')?.days).toBe(365)
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'two_years')?.days).toBe(730)
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'five_years')?.days).toBe(1825)
      expect(INTERVAL_OPTIONS.find(opt => opt.value === 'custom')?.days).toBe(-1)
    })

    it('should have color styling for each interval', () => {
      INTERVAL_OPTIONS.forEach(option => {
        expect(option.bgColor).toBeDefined()
        expect(option.textColor).toBeDefined()
        expect(option.borderColor).toBeDefined()
        expect(option.color).toBeDefined()
      })
    })
  })

  describe('getDateFromInterval', () => {
    beforeEach(() => {
      // Mock current date to a fixed date for consistent testing
      jest.useFakeTimers()
      // Use local time to avoid timezone issues
      jest.setSystemTime(new Date(2024, 0, 15, 12, 0, 0)) // Jan 15, 2024 at noon local time
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return today for "today" interval', () => {
      const result = getDateFromInterval('today')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      expect(result.getTime()).toBe(today.getTime())
    })

    it('should return correct date for "tomorrow" interval', () => {
      const result = getDateFromInterval('tomorrow')
      const expected = new Date(2024, 0, 16) // Jan 15 + 1 day
      expected.setHours(0, 0, 0, 0)
      expect(result.getTime()).toBe(expected.getTime())
    })

    it('should return correct date for "next_week" interval', () => {
      const result = getDateFromInterval('next_week')
      const expected = new Date(2024, 0, 22) // Jan 15 + 7 days
      expected.setHours(0, 0, 0, 0)
      expect(result.getTime()).toBe(expected.getTime())
    })

    it('should return correct date for "one_month" interval', () => {
      const result = getDateFromInterval('one_month')
      const expected = new Date(2024, 1, 14) // Jan 15 + 30 days = Feb 14
      expected.setHours(0, 0, 0, 0)
      expect(result.getTime()).toBe(expected.getTime())
    })

    it('should return correct date for "three_months" interval', () => {
      const result = getDateFromInterval('three_months')
      const expected = new Date(2024, 3, 14) // Jan 15 + 90 days = Apr 14
      expected.setHours(0, 0, 0, 0)
      expect(result.getTime()).toBe(expected.getTime())
    })

    it('should return correct date for "six_months" interval', () => {
      const result = getDateFromInterval('six_months')
      const expected = new Date(2024, 6, 13) // Jan 15 + 180 days = Jul 13
      expected.setHours(0, 0, 0, 0)
      expect(result.getTime()).toBe(expected.getTime())
    })

    it('should return correct date for "one_year" interval', () => {
      const result = getDateFromInterval('one_year')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // Verify it's approximately 365 days from today
      const daysDiff = Math.round((result.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(365)
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
    })

    it('should return today for "custom" interval', () => {
      const result = getDateFromInterval('custom')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      expect(result.getTime()).toBe(today.getTime())
    })

    it('should set hours to 0:0:0:0', () => {
      const result = getDateFromInterval('today')
      expect(result.getHours()).toBe(0)
      expect(result.getMinutes()).toBe(0)
      expect(result.getSeconds()).toBe(0)
      expect(result.getMilliseconds()).toBe(0)
    })
  })

  describe('getClosestInterval', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(2024, 0, 15, 12, 0, 0)) // Jan 15, 2024 at noon local time
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return "today" for past dates', () => {
      const pastDate = new Date('2024-01-10')
      expect(getClosestInterval(pastDate)).toBe('today')
    })

    it('should return "today" for today\'s date', () => {
      const today = new Date('2024-01-15')
      expect(getClosestInterval(today)).toBe('today')
    })

    it('should return "tomorrow" for dates around 1 day', () => {
      const tomorrow = new Date(2024, 0, 16) // Jan 16, 2024 in local time
      expect(getClosestInterval(tomorrow)).toBe('tomorrow')
    })

    it('should return "next_week" for dates around 7 days', () => {
      const nextWeek = new Date('2024-01-22')
      expect(getClosestInterval(nextWeek)).toBe('next_week')
    })

    it('should return "one_month" for dates around 30 days', () => {
      const oneMonth = new Date('2024-02-14')
      expect(getClosestInterval(oneMonth)).toBe('one_month')
    })

    it('should return "three_months" for dates around 90 days', () => {
      const threeMonths = new Date('2024-04-14')
      expect(getClosestInterval(threeMonths)).toBe('three_months')
    })

    it('should return "one_year" for dates around 365 days', () => {
      const oneYear = new Date('2025-01-15')
      expect(getClosestInterval(oneYear)).toBe('one_year')
    })

    it('should find closest interval for dates between intervals', () => {
      // 45 days is closer to one_month (30) than three_months (90)
      const date45Days = new Date('2024-02-29')
      expect(getClosestInterval(date45Days)).toBe('one_month')
    })

    it('should handle dates exactly on interval boundaries', () => {
      const exactly30Days = new Date('2024-02-14') // 30 days from 2024-01-15
      expect(getClosestInterval(exactly30Days)).toBe('one_month')
    })

    it('should handle very far future dates', () => {
      const farFuture = new Date('2030-01-15')
      expect(getClosestInterval(farFuture)).toBe('five_years')
    })

    it('should handle string dates', () => {
      const dateString = '2024-02-14'
      expect(getClosestInterval(dateString)).toBe('one_month')
    })
  })

  describe('getDateColorStyles', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T00:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return correct color styles for today', () => {
      const today = new Date('2024-01-15')
      const styles = getDateColorStyles(today)
      
      expect(styles.interval).toBe('today')
      expect(styles.bgColor).toContain('red')
      expect(styles.textColor).toContain('red')
      expect(styles.borderColor).toContain('red')
    })

    it('should return correct color styles for tomorrow', () => {
      const tomorrow = new Date('2024-01-16')
      const styles = getDateColorStyles(tomorrow)
      
      expect(styles.interval).toBe('tomorrow')
      expect(styles.bgColor).toContain('rose')
      expect(styles.textColor).toContain('rose')
      expect(styles.borderColor).toContain('rose')
    })

    it('should return correct color styles for next week', () => {
      const nextWeek = new Date('2024-01-22')
      const styles = getDateColorStyles(nextWeek)
      
      expect(styles.interval).toBe('next_week')
      expect(styles.bgColor).toContain('orange')
      expect(styles.textColor).toContain('orange')
      expect(styles.borderColor).toContain('orange')
    })

    it('should return correct color styles for one month', () => {
      const oneMonth = new Date('2024-02-14')
      const styles = getDateColorStyles(oneMonth)
      
      expect(styles.interval).toBe('one_month')
      expect(styles.bgColor).toContain('amber')
      expect(styles.textColor).toContain('amber')
      expect(styles.borderColor).toContain('amber')
    })

    it('should return correct color styles for past dates', () => {
      const pastDate = new Date('2024-01-10')
      const styles = getDateColorStyles(pastDate)
      
      expect(styles.interval).toBe('today')
      expect(styles.bgColor).toContain('red')
    })

    it('should handle string dates', () => {
      const dateString = '2024-02-14'
      const styles = getDateColorStyles(dateString)
      
      expect(styles.interval).toBe('one_month')
      expect(styles.bgColor).toBeDefined()
      expect(styles.textColor).toBeDefined()
      expect(styles.borderColor).toBeDefined()
    })

    it('should return consistent colors for the same date', () => {
      const date = new Date('2024-02-14')
      const styles1 = getDateColorStyles(date)
      const styles2 = getDateColorStyles(date)
      
      expect(styles1.bgColor).toBe(styles2.bgColor)
      expect(styles1.textColor).toBe(styles2.textColor)
      expect(styles1.borderColor).toBe(styles2.borderColor)
      expect(styles1.interval).toBe(styles2.interval)
    })
  })

  describe('formatDueDateISO', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-02-14T10:30:00Z')
      const formatted = formatDueDateISO(date)
      expect(formatted).toBe('2024-02-14')
    })

    it('should pad single digit months and days', () => {
      const date = new Date(2024, 0, 5) // Jan 5, 2024
      const formatted = formatDueDateISO(date)
      expect(formatted).toBe('2024-01-05')
    })

    it('should handle string dates', () => {
      const dateString = '2024-12-25'
      const formatted = formatDueDateISO(dateString)
      // formatDueDateISO parses the string and formats it, which should preserve the date
      expect(formatted).toMatch(/^2024-12-2[45]$/) // Allow for timezone differences
    })
  })
})
