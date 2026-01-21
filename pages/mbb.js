import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { useRealtimeAnalytics } from '../hooks/useRealtimeAnalytics'
import { useTimerContext } from '../contexts/TimerContext'

const MBBPage = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visionBoardImages, setVisionBoardImages] = useState([])
  
  // Get live timer data from context to combine with DB analytics
  const { timers, totalEarnings: liveTimerEarnings, totalActiveTimers } = useTimerContext()

  // Restore target from localStorage on mount (fallback for when DB table doesn't exist)
  useEffect(() => {
    const savedTarget = localStorage.getItem('mbb_target_balance')
    if (savedTarget) {
      const targetValue = parseFloat(savedTarget)
      if (!isNaN(targetValue) && targetValue > 0) {
        setMbbData(prev => ({ ...prev, targetBalance: targetValue }))
      }
    }
  }, [])
  const [defaultTargetRevenue, setDefaultTargetRevenue] = useState(1000)
  
  // Load target from localStorage as fallback (since DB table may not exist)
  const getInitialTarget = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mbb_target_balance')
      if (saved) return parseFloat(saved)
    }
    return 1000
  }
  
  // Fetch default target revenue from user profile
  const loadDefaultTargetFromProfile = async (userId) => {
    try {
      const response = await fetch(`/api/profile?user_id=${userId}`)
      const result = await response.json()
      if (result.success && result.data?.default_target_revenue) {
        setDefaultTargetRevenue(result.data.default_target_revenue)
        // If no target is set in localStorage or DB, use profile default
        const savedTarget = localStorage.getItem('mbb_target_balance')
        if (!savedTarget) {
          setMbbData(prev => ({ ...prev, targetBalance: result.data.default_target_revenue }))
        }
      }
    } catch (error) {
      console.error('Error loading default target from profile:', error)
    }
  }
  
  const [mbbData, setMbbData] = useState({
    currentBalance: 0,
    targetBalance: typeof window !== 'undefined' ? getInitialTarget() : 1000,
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    totalEarnings: 0,
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    totalHours: 0,
    averageHourlyRate: 0
  })
  const [timeSessions, setTimeSessions] = useState([])
  const [timeSessionsTotalCount, setTimeSessionsTotalCount] = useState(0)
  const [timeSessionsPage, setTimeSessionsPage] = useState(1)
  const [timeSessionsPerPage, setTimeSessionsPerPage] = useState(5)
  const [loading, setLoading] = useState(true)
  const [analyticsRefreshing, setAnalyticsRefreshing] = useState(false)
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [newTarget, setNewTarget] = useState('')

  // Load MBB data from analytics API
  const loadMBBData = useCallback(async (userId, showRefreshIndicator = false) => {
    if (!userId) return
    
    if (showRefreshIndicator) {
      setAnalyticsRefreshing(true)
    }
    
    try {
      const response = await fetch(`/api/mbb/analytics?user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to load MBB data')
      
      const result = await response.json()
      if (result.success && result.data) {
        setMbbData({
          currentBalance: result.data.total_earnings || 0,
          targetBalance: result.data.target_balance || (typeof window !== 'undefined' && localStorage.getItem('mbb_target_balance') ? parseFloat(localStorage.getItem('mbb_target_balance')) : 1000),
          todayEarnings: result.data.today_earnings || 0,
          weekEarnings: result.data.week_earnings || 0,
          monthEarnings: result.data.month_earnings || 0,
          totalEarnings: result.data.total_earnings || 0,
          todayHours: result.data.today_hours || 0,
          weekHours: result.data.week_hours || 0,
          monthHours: result.data.month_hours || 0,
          totalHours: result.data.total_hours || 0,
          averageHourlyRate: result.data.average_hourly_rate || 0
        })
      } else {
        throw new Error(result.error || 'Failed to load MBB data')
      }
    } catch (error) {
      console.error('Error loading MBB data:', error)
      // Set default data if API fails
      setMbbData({
        currentBalance: 0,
        targetBalance: 1000,
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
        totalEarnings: 0,
        todayHours: 0,
        weekHours: 0,
        monthHours: 0,
        totalHours: 0,
        averageHourlyRate: 0
      })
    } finally {
      setAnalyticsRefreshing(false)
    }
  }, [])

  // Load recent time sessions
  const loadTimeSessions = useCallback(async (userId, page, perPage) => {
    if (!userId) return
    
    try {
      const offset = (page - 1) * perPage
      const response = await fetch(`/api/time-sessions?user_id=${userId}&limit=${perPage}&offset=${offset}`)
      if (!response.ok) throw new Error('Failed to load time sessions')
      
      const result = await response.json()
      if (result.success) {
        setTimeSessions(result.data || [])
        // Use total_count from pagination or response, with fallback to data length if count is 0 but we have data
        const totalCount = result.pagination?.total_count ?? result.total_count ?? 0
        const sessionsCount = result.data?.length || 0
        // If API returns 0 count but we have sessions, use sessions count as minimum (happens on first page)
        setTimeSessionsTotalCount(totalCount > 0 ? totalCount : (sessionsCount > 0 && page === 1 ? sessionsCount : totalCount))
      }
    } catch (error) {
      console.error('Error loading time sessions:', error)
      setTimeSessions([])
      setTimeSessionsTotalCount(0)
    }
  }, [])

  // Callback to refresh analytics data (for realtime hook)
  const refreshAnalytics = useCallback(() => {
    if (user?.id) {
      loadMBBData(user.id, true)
      loadTimeSessions(user.id, timeSessionsPage, timeSessionsPerPage)
    }
  }, [user, loadMBBData, loadTimeSessions, timeSessionsPage, timeSessionsPerPage])

  // Subscribe to realtime updates for time_sessions
  useRealtimeAnalytics({
    userId: user?.id,
    onUpdate: refreshAnalytics,
    debounceMs: 1000,
    enabled: !!user?.id
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      
      // Get active vision board images for carousel
      const { data: images } = await supabase
        .from('vision_board_images')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        
      setVisionBoardImages(images || [])
      
      // Load MBB data, time sessions, and default target from profile
      await Promise.all([
        loadMBBData(user.id), 
        loadTimeSessions(user.id, 1, 5), // Start with page 1, 5 per page
        loadDefaultTargetFromProfile(user.id)
      ])
      setLoading(false)
    }

    getUser()
  }, [router, loadMBBData, loadTimeSessions])

  // Reload time sessions when page or perPage changes
  useEffect(() => {
    if (user?.id) {
      loadTimeSessions(user.id, timeSessionsPage, timeSessionsPerPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, timeSessionsPage, timeSessionsPerPage])

  // Handle updating target balance
  const handleUpdateTarget = async (e) => {
    e.preventDefault()
    const targetValue = parseFloat(newTarget)
    if (isNaN(targetValue) || targetValue < 0) return

    if (!user?.id) {
      console.error('No user ID available')
      alert('User not authenticated')
      return
    }

    try {
      const response = await fetch('/api/mbb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id,
          target_balance_usd: targetValue 
        })
      })

      if (!response.ok) throw new Error('Failed to update target')
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      setMbbData(prev => ({ ...prev, targetBalance: targetValue }))
      // Also save to localStorage as fallback (in case DB table doesn't exist)
      localStorage.setItem('mbb_target_balance', targetValue.toString())
      setNewTarget('')
      setShowTargetModal(false)
    } catch (error) {
      console.error('Error updating target:', error)
      alert('Failed to update target balance')
    }
  }

  // Calculate combined values: DB completed sessions + live active timer earnings
  // Live timer earnings should be added to "today" since active timers are for today
  const combinedTodayEarnings = mbbData.todayEarnings + (liveTimerEarnings || 0)
  const combinedWeekEarnings = mbbData.weekEarnings + (liveTimerEarnings || 0)
  const combinedMonthEarnings = mbbData.monthEarnings + (liveTimerEarnings || 0)
  const combinedTotalEarnings = mbbData.totalEarnings + (liveTimerEarnings || 0)
  const combinedCurrentBalance = mbbData.currentBalance + (liveTimerEarnings || 0)
  
  // Calculate live timer hours (from active timers)
  const liveTimerHours = timers?.reduce((sum, t) => sum + (t.currentTime || 0) / 3600, 0) || 0
  const combinedTodayHours = mbbData.todayHours + liveTimerHours
  const combinedWeekHours = mbbData.weekHours + liveTimerHours
  const combinedMonthHours = mbbData.monthHours + liveTimerHours
  const combinedTotalHours = mbbData.totalHours + liveTimerHours
  
  // Calculate combined average hourly rate (total earnings / total hours)
  const combinedAverageRate = combinedTotalHours > 0 
    ? combinedTotalEarnings / combinedTotalHours 
    : mbbData.averageHourlyRate
  
  // Calculate days to reach target at current average daily rate
  const remainingToTarget = Math.max(0, mbbData.targetBalance - combinedCurrentBalance)
  const averageDailyEarnings = combinedTodayHours > 0 
    ? (combinedTodayEarnings / combinedTodayHours) * 8 // Assume 8hr workday
    : (combinedAverageRate * 8)
  const daysToTarget = averageDailyEarnings > 0 
    ? Math.ceil(remainingToTarget / averageDailyEarnings)
    : null
  
  // Calculate projected target date
  const projectedTargetDate = daysToTarget !== null ? (() => {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysToTarget)
    return targetDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  })() : null

  // Calculate progress percentage using combined balance
  // Show actual percentage for display, but cap bar width at 100%
  const progressPercentage = (combinedCurrentBalance / mbbData.targetBalance) * 100
  const progressBarWidth = Math.min(progressPercentage, 100)


  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  // Format hours
  const formatHours = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`
    }
    return `${hours.toFixed(1)}h`
  }

  if (loading) {
    return (
      <Layout showCarousel={false} showNavigation={false} showTimer={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Layout carouselImages={visionBoardImages} userId={user?.id}>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mental Bank Balance</h1>
              <p className="text-white/70">
                Track your progress towards your financial goals and analyze your earning patterns.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (user?.id && !analyticsRefreshing) {
                    loadMBBData(user.id, true)
                    loadTimeSessions(user.id, timeSessionsPage, timeSessionsPerPage)
                  }
                }}
                disabled={analyticsRefreshing}
                className={`px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20 ${analyticsRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Refresh analytics data"
              >
                <svg className={`w-5 h-5 ${analyticsRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setNewTarget(mbbData.targetBalance.toString())
                  setShowTargetModal(true)
                }}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Set Target
              </button>
            </div>
          </div>

          {/* Main MBB Card */}
          <div className="mb-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-white mb-2">Current Balance</h2>
              <div className="text-5xl font-bold text-white mb-4">
                {formatCurrency(combinedCurrentBalance)}
              </div>
              <div className="text-lg text-white/70">
                Target: {formatCurrency(mbbData.targetBalance)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressBarWidth}%` }}
              ></div>
            </div>
            <div className="text-center text-white/70">
              {progressPercentage.toFixed(1)}% of target achieved
              {remainingToTarget > 0 && daysToTarget !== null && (
                <span className="ml-2 text-blue-300">
                  • ~{daysToTarget} day{daysToTarget !== 1 ? 's' : ''} to target at current rate
                  {projectedTargetDate && <span className="text-purple-300"> ({projectedTargetDate})</span>}
                </span>
              )}
              {remainingToTarget <= 0 && (
                <span className="ml-2 text-green-400">🎉 Target achieved!</span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Today</h3>
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">{formatCurrency(combinedTodayEarnings)}</div>
                <div className="text-sm text-white/70">{formatHours(combinedTodayHours)} worked</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">This Week</h3>
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">{formatCurrency(combinedWeekEarnings)}</div>
                <div className="text-sm text-white/70">{formatHours(combinedWeekHours)} worked</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">This Month</h3>
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">{formatCurrency(combinedMonthEarnings)}</div>
                <div className="text-sm text-white/70">{formatHours(combinedMonthHours)} worked</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Average Rate</h3>
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">{formatCurrency(combinedAverageRate)}/hr</div>
                <div className="text-sm text-white/70">{formatHours(combinedTotalHours)} total</div>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Recent Time Sessions</h2>
                  <p className="text-white/70 mt-1">Your latest work sessions and earnings</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-white/70 text-sm">Show:</label>
                  <select
                    value={timeSessionsPerPage}
                    onChange={(e) => {
                      const newPerPage = parseInt(e.target.value)
                      setTimeSessionsPerPage(newPerPage)
                      setTimeSessionsPage(1) // Reset to first page when changing per page
                    }}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              {timeSessions.length === 0 ? (
                <div className="text-center p-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Time Sessions Yet</h3>
                  <p className="text-white/70">Start tracking time on your tasks to see session history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {timeSessions.map((session, index) => (
                    <div
                      key={session.id || index}
                      className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">
                              {session.tasks?.title || session.description || 'Work Session'}
                            </h4>
                            <p className="text-white/70 text-sm">
                              {session.categories?.name || 'Uncategorized'} • {formatHours((session.duration_seconds || 0) / 3600)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">
                            {session.earnings_usd !== null && session.earnings_usd !== undefined
                              ? formatCurrency(parseFloat(session.earnings_usd) || 0)
                              : (
                                  <span className="text-white/50" title="No hourly rate set for this session">
                                    $0.00
                                    {!session.hourly_rate_usd && (
                                      <span className="text-xs text-yellow-400 ml-1" title="No hourly rate was set when this session was created">
                                        ⚠️
                                      </span>
                                    )}
                                  </span>
                                )
                            }
                          </div>
                          <div className="text-white/70 text-sm">
                            {session.started_at ? new Date(session.started_at).toLocaleDateString() : 'Today'}
                            {session.hourly_rate_usd && (
                              <div className="text-xs text-white/50">
                                {formatCurrency(parseFloat(session.hourly_rate_usd))}/hr
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination Controls */}
              {timeSessions.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-white/70 text-sm">
                    Showing {((timeSessionsPage - 1) * timeSessionsPerPage) + 1} to {Math.min(timeSessionsPage * timeSessionsPerPage, timeSessionsTotalCount)} of {timeSessionsTotalCount} sessions
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTimeSessionsPage(prev => Math.max(1, prev - 1))}
                      disabled={timeSessionsPage === 1}
                      className={`px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20 ${
                        timeSessionsPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(timeSessionsTotalCount / timeSessionsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          const totalPages = Math.ceil(timeSessionsTotalCount / timeSessionsPerPage)
                          return page === 1 || 
                                 page === totalPages || 
                                 (page >= timeSessionsPage - 1 && page <= timeSessionsPage + 1)
                        })
                        .map((page, index, array) => {
                          // Add ellipsis between non-consecutive pages
                          const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1
                          return (
                            <React.Fragment key={page}>
                              {showEllipsisBefore && (
                                <span className="text-white/50 px-2">...</span>
                              )}
                              <button
                                onClick={() => setTimeSessionsPage(page)}
                                className={`px-3 py-2 min-w-[40px] rounded-lg transition-colors border ${
                                  timeSessionsPage === page
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          )
                        })}
                    </div>
                    <button
                      onClick={() => setTimeSessionsPage(prev => prev + 1)}
                      disabled={timeSessionsPage >= Math.ceil(timeSessionsTotalCount / timeSessionsPerPage)}
                      className={`px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20 ${
                        timeSessionsPage >= Math.ceil(timeSessionsTotalCount / timeSessionsPerPage) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Set Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Set Target Balance</h3>
              <button
                onClick={() => setShowTargetModal(false)}
                className="text-white/70 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateTarget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Target Balance (USD)</label>
                <div className="flex items-center">
                  <span className="text-white/70 mr-2">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="1000.00"
                    required
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Set your financial goal to track progress
                </p>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Update Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default MBBPage 