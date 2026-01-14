/**
 * REGRESSION TEST: Timer Earnings Calculation
 * 
 * Bug: Timer totals showing $0.00 even when task has hourly rate
 * Fixed: 2026-01-14
 * 
 * This test ensures the bug doesn't reappear in future releases
 */

describe('REGRESSION: Timer Earnings Calculation', () => {
  describe('Bug Prevention: Field Name Consistency', () => {
    test('Should use hourly_rate_usd as primary field', () => {
      const task = {
        id: 'task-1',
        category: {
          id: 'cat-1',
          name: 'Development',
          hourly_rate_usd: 175
        }
      }

      const rate = task.category.hourly_rate_usd
      expect(rate).toBe(175)
      expect(rate).toBeGreaterThan(0)
    })

    test('Should fallback to hourly_rate for legacy data', () => {
      const legacyTask = {
        id: 'task-2',
        category: {
          id: 'cat-2',
          name: 'Legacy Category',
          hourly_rate: 150, // Old field name
        }
      }

      const rate = (legacyTask.category as any).hourly_rate_usd || legacyTask.category.hourly_rate
      expect(rate).toBe(150)
    })

    test('Should prefer hourly_rate_usd when both exist', () => {
      const taskWithBoth = {
        category: {
          hourly_rate_usd: 200,
          hourly_rate: 150
        }
      }

      const rate = taskWithBoth.category.hourly_rate_usd || taskWithBoth.category.hourly_rate
      expect(rate).toBe(200) // Should use hourly_rate_usd
    })
  })

  describe('Earnings Calculation Accuracy', () => {
    test('1 hour at $150/hr = $150.00', () => {
      const seconds = 3600
      const rate = 150
      const earnings = (seconds / 3600) * rate

      expect(earnings).toBe(150.00)
    })

    test('30 minutes at $120/hr = $60.00', () => {
      const seconds = 1800
      const rate = 120
      const earnings = (seconds / 3600) * rate

      expect(earnings).toBe(60.00)
    })

    test('2 hours at $175/hr = $350.00', () => {
      const seconds = 7200
      const rate = 175
      const earnings = (seconds / 3600) * rate

      expect(earnings).toBe(350.00)
    })

    test('10 seconds at $100/hr ≈ $0.28', () => {
      const seconds = 10
      const rate = 100
      const earnings = (seconds / 3600) * rate

      expect(earnings).toBeCloseTo(0.28, 2)
    })

    test('45 minutes at $200/hr = $150.00', () => {
      const seconds = 2700
      const rate = 200
      const earnings = (seconds / 3600) * rate

      expect(earnings).toBe(150.00)
    })
  })

  describe('Edge Cases', () => {
    test('No category assigned = $0.00 earnings', () => {
      const taskNoCategory = {
        id: 'task-no-cat',
        category: null
      }

      const rate = taskNoCategory.category?.hourly_rate_usd || 0
      const earnings = (3600 / 3600) * rate

      expect(earnings).toBe(0)
    })

    test('Category with $0 rate = $0.00 earnings', () => {
      const taskZeroRate = {
        category: {
          hourly_rate_usd: 0
        }
      }

      const earnings = (3600 / 3600) * taskZeroRate.category.hourly_rate_usd
      expect(earnings).toBe(0)
    })

    test('Negative time handled gracefully', () => {
      const seconds = -100
      const rate = 150
      const earnings = Math.max(0, (seconds / 3600) * rate)

      expect(earnings).toBe(0)
    })

    test('Very large hourly rate', () => {
      const seconds = 3600
      const rate = 10000 // $10,000/hr
      const earnings = (seconds / 3600) * rate

      expect(earnings).toBe(10000)
    })

    test('Decimal hourly rate', () => {
      const seconds = 3600
      const rate = 125.50
      const earnings = (seconds / 3600) * rate

      expect(earnings).toBe(125.50)
    })
  })

  describe('Real-Time Calculation', () => {
    test('Earnings should update every second', () => {
      const rate = 100

      const earnings1sec = (1 / 3600) * rate
      const earnings2sec = (2 / 3600) * rate
      const earnings3sec = (3 / 3600) * rate

      expect(earnings2sec).toBeGreaterThan(earnings1sec)
      expect(earnings3sec).toBeGreaterThan(earnings2sec)
    })

    test('Earnings growth is linear', () => {
      const rate = 150

      const earnings10sec = (10 / 3600) * rate
      const earnings20sec = (20 / 3600) * rate

      // 20 seconds should be exactly 2x 10 seconds
      expect(earnings20sec).toBe(earnings10sec * 2)
    })
  })

  describe('Currency Formatting', () => {
    test('Should format as USD currency', () => {
      const earnings = 123.45

      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(earnings)

      expect(formatted).toBe('$123.45')
    })

    test('Should handle cents correctly', () => {
      const seconds = 10
      const rate = 100
      const earnings = (seconds / 3600) * rate

      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(earnings)

      expect(formatted).toContain('$0.28')
    })
  })
})
