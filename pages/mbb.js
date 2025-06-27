import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'

const MBBPage = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [visionBoardImages, setVisionBoardImages] = useState([])
  const [mbbData, setMbbData] = useState({
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
  const [timeSessions, setTimeSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [newTarget, setNewTarget] = useState('')

  // Load MBB data from API
  const loadMBBData = useCallback(async () => {
    try {
      const response = await fetch('/api/mbb')
      if (!response.ok) throw new Error('Failed to load MBB data')
      
      const result = await response.json()
      if (result.success) {
        setMbbData(result.data)
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
    }
  }, [])

  // Load recent time sessions
  const loadTimeSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/time-sessions?limit=10')
      if (!response.ok) throw new Error('Failed to load time sessions')
      
      const result = await response.json()
      if (result.success) {
        setTimeSessions(result.data || [])
      }
    } catch (error) {
      console.error('Error loading time sessions:', error)
      setTimeSessions([])
    }
  }, [])

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
      
      // Load MBB data and time sessions
      await Promise.all([loadMBBData(), loadTimeSessions()])
      setLoading(false)
    }

    getUser()
  }, [router, loadMBBData, loadTimeSessions])

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
      setNewTarget('')
      setShowTargetModal(false)
    } catch (error) {
      console.error('Error updating target:', error)
      alert('Failed to update target balance')
    }
  }

  // Calculate progress percentage
  const progressPercentage = Math.min((mbbData.currentBalance / mbbData.targetBalance) * 100, 100)

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
    <Layout carouselImages={visionBoardImages}>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mental Bank Balance</h1>
              <p className="text-white/70">
                Track your progress towards your financial goals and analyze your earning patterns.
              </p>
            </div>
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

          {/* Main MBB Card */}
          <div className="mb-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-white mb-2">Current Balance</h2>
              <div className="text-5xl font-bold text-white mb-4">
                {formatCurrency(mbbData.currentBalance)}
              </div>
              <div className="text-lg text-white/70">
                Target: {formatCurrency(mbbData.targetBalance)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="text-center text-white/70">
              {progressPercentage.toFixed(1)}% of target achieved
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
                <div className="text-2xl font-bold text-white">{formatCurrency(mbbData.todayEarnings)}</div>
                <div className="text-sm text-white/70">{formatHours(mbbData.todayHours)} worked</div>
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
                <div className="text-2xl font-bold text-white">{formatCurrency(mbbData.weekEarnings)}</div>
                <div className="text-sm text-white/70">{formatHours(mbbData.weekHours)} worked</div>
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
                <div className="text-2xl font-bold text-white">{formatCurrency(mbbData.monthEarnings)}</div>
                <div className="text-sm text-white/70">{formatHours(mbbData.monthHours)} worked</div>
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
                <div className="text-2xl font-bold text-white">{formatCurrency(mbbData.averageHourlyRate)}/hr</div>
                <div className="text-sm text-white/70">{formatHours(mbbData.totalHours)} total</div>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl">
            <div className="p-6 border-b border-white/20">
              <h2 className="text-xl font-semibold text-white">Recent Time Sessions</h2>
              <p className="text-white/70 mt-1">Your latest work sessions and earnings</p>
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
                              {session.task?.title || session.description || 'Work Session'}
                            </h4>
                            <p className="text-white/70 text-sm">
                              {session.category?.name || 'Uncategorized'} • {formatHours(session.duration_hours || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">
                            {formatCurrency(session.earnings || 0)}
                          </div>
                          <div className="text-white/70 text-sm">
                            {session.created_at ? new Date(session.created_at).toLocaleDateString() : 'Today'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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