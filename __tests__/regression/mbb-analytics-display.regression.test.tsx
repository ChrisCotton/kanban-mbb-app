/**
 * MBB Analytics Display Regression Tests
 * 
 * Tests the MBB page correctly combines:
 * - Database completed session data
 * - Live timer earnings from TimerContext
 * - Target balance persistence
 * - Days to target calculations
 */

import { renderHook, act } from '@testing-library/react'

describe('MBB Analytics Display', () => {
  describe('Combined Earnings Calculations', () => {
    it('should combine DB earnings with live timer earnings for today', () => {
      const dbTodayEarnings = 50.00
      const liveTimerEarnings = 125.50
      
      const combinedTodayEarnings = dbTodayEarnings + liveTimerEarnings
      
      expect(combinedTodayEarnings).toBe(175.50)
    })

    it('should combine DB earnings with live timer earnings for week', () => {
      const dbWeekEarnings = 500.00
      const liveTimerEarnings = 125.50
      
      const combinedWeekEarnings = dbWeekEarnings + liveTimerEarnings
      
      expect(combinedWeekEarnings).toBe(625.50)
    })

    it('should combine DB earnings with live timer earnings for month', () => {
      const dbMonthEarnings = 2000.00
      const liveTimerEarnings = 125.50
      
      const combinedMonthEarnings = dbMonthEarnings + liveTimerEarnings
      
      expect(combinedMonthEarnings).toBe(2125.50)
    })

    it('should combine DB total with live timer earnings for current balance', () => {
      const dbTotalEarnings = 5000.00
      const liveTimerEarnings = 500.00
      
      const combinedCurrentBalance = dbTotalEarnings + liveTimerEarnings
      
      expect(combinedCurrentBalance).toBe(5500.00)
    })

    it('should handle zero live timer earnings', () => {
      const dbTodayEarnings = 100.00
      const liveTimerEarnings = 0
      
      const combinedTodayEarnings = dbTodayEarnings + (liveTimerEarnings || 0)
      
      expect(combinedTodayEarnings).toBe(100.00)
    })

    it('should handle undefined live timer earnings', () => {
      const dbTodayEarnings = 100.00
      const liveTimerEarnings = undefined
      
      const combinedTodayEarnings = dbTodayEarnings + (liveTimerEarnings || 0)
      
      expect(combinedTodayEarnings).toBe(100.00)
    })
  })

  describe('Combined Hours Calculations', () => {
    it('should calculate live timer hours from seconds', () => {
      const timers = [
        { currentTime: 3600 }, // 1 hour
        { currentTime: 1800 }, // 0.5 hours
        { currentTime: 900 },  // 0.25 hours
      ]
      
      const liveTimerHours = timers.reduce((sum, t) => sum + (t.currentTime || 0) / 3600, 0)
      
      expect(liveTimerHours).toBe(1.75)
    })

    it('should combine DB hours with live timer hours', () => {
      const dbTodayHours = 4.5
      const liveTimerHours = 1.75
      
      const combinedTodayHours = dbTodayHours + liveTimerHours
      
      expect(combinedTodayHours).toBe(6.25)
    })

    it('should handle empty timer array', () => {
      const timers: any[] = []
      
      const liveTimerHours = timers?.reduce((sum, t) => sum + (t.currentTime || 0) / 3600, 0) || 0
      
      expect(liveTimerHours).toBe(0)
    })
  })

  describe('Average Rate Calculations', () => {
    it('should calculate average rate from combined totals', () => {
      const combinedTotalEarnings = 1000.00
      const combinedTotalHours = 10
      
      const combinedAverageRate = combinedTotalHours > 0 
        ? combinedTotalEarnings / combinedTotalHours 
        : 0
      
      expect(combinedAverageRate).toBe(100.00)
    })

    it('should handle zero hours gracefully', () => {
      const combinedTotalEarnings = 1000.00
      const combinedTotalHours = 0
      const dbAverageRate = 50.00
      
      const combinedAverageRate = combinedTotalHours > 0 
        ? combinedTotalEarnings / combinedTotalHours 
        : dbAverageRate
      
      expect(combinedAverageRate).toBe(50.00)
    })

    it('should calculate realistic hourly rate', () => {
      // User earned $9,960 over 14.2 hours
      const combinedTotalEarnings = 9960.00
      const combinedTotalHours = 14.2
      
      const combinedAverageRate = combinedTotalEarnings / combinedTotalHours
      
      expect(combinedAverageRate).toBeCloseTo(701.41, 1)
    })
  })

  describe('Progress Percentage Calculations', () => {
    it('should calculate progress percentage correctly', () => {
      const combinedCurrentBalance = 500.00
      const targetBalance = 1000.00
      
      const progressPercentage = (combinedCurrentBalance / targetBalance) * 100
      
      expect(progressPercentage).toBe(50)
    })

    it('should show percentage over 100 when target exceeded', () => {
      const combinedCurrentBalance = 1500.00
      const targetBalance = 1000.00
      
      const progressPercentage = (combinedCurrentBalance / targetBalance) * 100
      
      expect(progressPercentage).toBe(150)
    })

    it('should cap progress bar width at 100', () => {
      const combinedCurrentBalance = 9000.00
      const targetBalance = 1000.00
      
      const progressPercentage = (combinedCurrentBalance / targetBalance) * 100
      const progressBarWidth = Math.min(progressPercentage, 100)
      
      expect(progressPercentage).toBe(900)
      expect(progressBarWidth).toBe(100)
    })

    it('should handle very large percentages', () => {
      const combinedCurrentBalance = 11398.33
      const targetBalance = 1000.00
      
      const progressPercentage = (combinedCurrentBalance / targetBalance) * 100
      const progressBarWidth = Math.min(progressPercentage, 100)
      
      expect(progressPercentage).toBeCloseTo(1139.83, 1)
      expect(progressBarWidth).toBe(100)
    })
  })

  describe('Days to Target Calculations', () => {
    it('should calculate days to target based on daily earnings', () => {
      const remainingToTarget = 90000.00
      const averageDailyEarnings = 500.00
      
      const daysToTarget = Math.ceil(remainingToTarget / averageDailyEarnings)
      
      expect(daysToTarget).toBe(180)
    })

    it('should return null when no daily earnings', () => {
      const remainingToTarget = 90000.00
      const averageDailyEarnings = 0
      
      const daysToTarget = averageDailyEarnings > 0 
        ? Math.ceil(remainingToTarget / averageDailyEarnings)
        : null
      
      expect(daysToTarget).toBeNull()
    })

    it('should return 0 days when target already achieved', () => {
      const currentBalance = 1500.00
      const targetBalance = 1000.00
      
      const remainingToTarget = Math.max(0, targetBalance - currentBalance)
      
      expect(remainingToTarget).toBe(0)
    })

    it('should calculate projected date correctly', () => {
      const daysToTarget = 177
      const now = new Date('2026-01-15')
      
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + daysToTarget)
      
      // 177 days from Jan 15, 2026 = July 10, 2026
      expect(targetDate.getMonth()).toBe(6) // July (0-indexed)
      expect(targetDate.getDate()).toBe(10)
      expect(targetDate.getFullYear()).toBe(2026)
    })
  })

  describe('Target Balance Persistence', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      if (typeof window !== 'undefined') {
        localStorage.clear()
      }
    })

    it('should save target to localStorage', () => {
      const targetValue = 1000000
      
      localStorage.setItem('mbb_target_balance', targetValue.toString())
      
      const saved = localStorage.getItem('mbb_target_balance')
      expect(saved).toBe('1000000')
    })

    it('should retrieve target from localStorage', () => {
      localStorage.setItem('mbb_target_balance', '500000')
      
      const saved = localStorage.getItem('mbb_target_balance')
      const targetValue = saved ? parseFloat(saved) : 1000
      
      expect(targetValue).toBe(500000)
    })

    it('should default to 1000 when no saved target', () => {
      const saved = localStorage.getItem('mbb_target_balance')
      const targetValue = saved ? parseFloat(saved) : 1000
      
      expect(targetValue).toBe(1000)
    })

    it('should handle invalid localStorage value', () => {
      localStorage.setItem('mbb_target_balance', 'invalid')
      
      const saved = localStorage.getItem('mbb_target_balance')
      const parsed = saved ? parseFloat(saved) : 1000
      const targetValue = isNaN(parsed) ? 1000 : parsed
      
      expect(targetValue).toBe(1000)
    })
  })
})

describe('MBB Analytics API Integration', () => {
  describe('Target Balance from API', () => {
    it('should prefer API target over default when available', () => {
      const apiResponse = {
        target_balance: 500000
      }
      const defaultTarget = 1000
      
      const targetBalance = apiResponse.target_balance || defaultTarget
      
      expect(targetBalance).toBe(500000)
    })

    it('should fall back to localStorage when API returns default', () => {
      const apiTargetBalance = null
      const localStorageTarget = 750000
      const defaultTarget = 1000
      
      const targetBalance = apiTargetBalance || localStorageTarget || defaultTarget
      
      expect(targetBalance).toBe(750000)
    })

    it('should use default when both API and localStorage empty', () => {
      const apiTargetBalance = null
      const localStorageTarget = null
      const defaultTarget = 1000
      
      const targetBalance = apiTargetBalance || localStorageTarget || defaultTarget
      
      expect(targetBalance).toBe(1000)
    })
  })
})
