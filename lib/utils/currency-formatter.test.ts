import {
  formatCurrency,
  formatHourlyRate,
  formatCompactCurrency,
  parseCurrency,
  isValidCurrencyAmount,
  calculateEarnings,
  calculateHoursNeeded,
  formatDuration,
  getCurrencyValidationError,
  currencyFormatter
} from './currency-formatter'

describe('Currency Formatter Utilities', () => {
  describe('formatCurrency', () => {
    it('should format numbers as USD currency', () => {
      expect(formatCurrency(50)).toBe('$50.00')
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format string numbers', () => {
      expect(formatCurrency('50')).toBe('$50.00')
      expect(formatCurrency('1234.56')).toBe('$1,234.56')
    })

    it('should handle invalid inputs', () => {
      expect(formatCurrency('invalid')).toBe('$0.00')
      expect(formatCurrency('')).toBe('$0.00')
      expect(formatCurrency(NaN)).toBe('$0.00')
    })

    it('should format with custom options', () => {
      expect(formatCurrency(50, { showPerHour: true })).toBe('$50.00/hr')
      expect(formatCurrency(50, { showCurrencySymbol: false })).toBe('50.00')
      expect(formatCurrency(50, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe('$50')
    })
  })

  describe('formatHourlyRate', () => {
    it('should format hourly rates', () => {
      expect(formatHourlyRate(75)).toBe('$75.00/hr')
      expect(formatHourlyRate('85.50')).toBe('$85.50/hr')
    })
  })

  describe('formatCompactCurrency', () => {
    it('should format large amounts compactly', () => {
      expect(formatCompactCurrency(1500)).toBe('$1.5K')
      expect(formatCompactCurrency(2500000)).toBe('$2.5M')
      expect(formatCompactCurrency(50)).toBe('$50.0')
    })
  })

  describe('parseCurrency', () => {
    it('should parse currency strings to numbers', () => {
      expect(parseCurrency('$50.00')).toBe(50)
      expect(parseCurrency('$1,234.56')).toBe(1234.56)
      expect(parseCurrency('75.00/hr')).toBe(75)
      expect(parseCurrency('$85.50/h')).toBe(85.5)
    })

    it('should handle invalid inputs', () => {
      expect(parseCurrency('')).toBe(0)
      expect(parseCurrency('invalid')).toBe(0)
      expect(parseCurrency('abc123')).toBe(0)
    })

    it('should parse numbers without symbols', () => {
      expect(parseCurrency('50')).toBe(50)
      expect(parseCurrency('1234.56')).toBe(1234.56)
    })
  })

  describe('isValidCurrencyAmount', () => {
    it('should validate valid currency amounts', () => {
      expect(isValidCurrencyAmount('50')).toBe(true)
      expect(isValidCurrencyAmount('$50.00')).toBe(true)
      expect(isValidCurrencyAmount('1,234.56')).toBe(true)
      expect(isValidCurrencyAmount('0')).toBe(true)
    })

    it('should reject invalid amounts', () => {
      expect(isValidCurrencyAmount('')).toBe(false)
      expect(isValidCurrencyAmount('invalid')).toBe(false)
      expect(isValidCurrencyAmount('abc123')).toBe(false)
      expect(isValidCurrencyAmount('-50')).toBe(false)
    })
  })

  describe('calculateEarnings', () => {
    it('should calculate earnings correctly', () => {
      expect(calculateEarnings(8, 75)).toBe(600)
      expect(calculateEarnings(40, 85.5)).toBe(3420)
      expect(calculateEarnings(0, 75)).toBe(0)
    })

    it('should handle invalid inputs', () => {
      expect(calculateEarnings(NaN, 75)).toBe(0)
      expect(calculateEarnings(8, NaN)).toBe(0)
      expect(calculateEarnings(-8, 75)).toBe(0)
      expect(calculateEarnings(8, -75)).toBe(0)
    })
  })

  describe('calculateHoursNeeded', () => {
    it('should calculate hours needed correctly', () => {
      expect(calculateHoursNeeded(600, 75)).toBe(8)
      expect(calculateHoursNeeded(3420, 85.5)).toBe(40)
      expect(calculateHoursNeeded(100, 50)).toBe(2)
    })

    it('should handle edge cases', () => {
      expect(calculateHoursNeeded(100, 0)).toBe(0)
      expect(calculateHoursNeeded(NaN, 75)).toBe(0)
      expect(calculateHoursNeeded(100, NaN)).toBe(0)
    })
  })

  describe('formatDuration', () => {
    it('should format hours as duration strings', () => {
      expect(formatDuration(8)).toBe('8h')
      expect(formatDuration(8.5)).toBe('8h 30m')
      expect(formatDuration(0.5)).toBe('30m')
      expect(formatDuration(0.25)).toBe('15m')
      expect(formatDuration(1.75)).toBe('1h 45m')
    })

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0h')
      expect(formatDuration(NaN)).toBe('0h')
      expect(formatDuration(-1)).toBe('0h')
    })
  })

  describe('getCurrencyValidationError', () => {
    it('should return null for valid amounts', () => {
      expect(getCurrencyValidationError('50')).toBe(null)
      expect(getCurrencyValidationError('$75.00')).toBe(null)
      expect(getCurrencyValidationError('1234.56')).toBe(null)
    })

    it('should return error messages for invalid amounts', () => {
      expect(getCurrencyValidationError('')).toBe('Amount is required')
      expect(getCurrencyValidationError('   ')).toBe('Amount is required')
      expect(getCurrencyValidationError('invalid')).toBe('Please enter a valid amount (e.g., 50.00)')
      expect(getCurrencyValidationError('-50')).toBe('Amount must be positive')
      expect(getCurrencyValidationError('1000000')).toBe('Amount must be less than $1,000,000')
    })
  })

  describe('currencyFormatter object', () => {
    it('should provide all formatter methods', () => {
      expect(currencyFormatter.format(50)).toBe('$50.00')
      expect(currencyFormatter.hourly(75)).toBe('$75.00/hr')
      expect(currencyFormatter.compact(1500)).toBe('$1.5K')
      expect(currencyFormatter.decimal(50)).toBe('50.00')
      expect(currencyFormatter.parse('$50.00')).toBe(50)
      expect(currencyFormatter.validate('50')).toBe(null)
      expect(currencyFormatter.isValid('50')).toBe(true)
    })
  })
}) 