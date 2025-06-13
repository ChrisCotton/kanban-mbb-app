import React from 'react'
import { useMentalBankBalance } from '../../hooks/useMentalBankBalance'

interface MentalBankDisplayProps {
  compact?: boolean
  showTransactions?: boolean
  className?: string
}

export function MentalBankDisplay({ 
  compact = false, 
  showTransactions = false, 
  className = '' 
}: MentalBankDisplayProps) {
  const { 
    mentalBankState, 
    loading, 
    error, 
    recentTransactions, 
    getEnergyLimitsCheck 
  } = useMentalBankBalance()

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Error loading mental bank balance
      </div>
    )
  }

  const energyPercentage = (mentalBankState.currentEnergy / mentalBankState.maxEnergy) * 100
  const dailyUsagePercentage = Math.min((mentalBankState.dailyExpenditure / 200) * 100, 100)
  const energyLimits = getEnergyLimitsCheck()

  // Color based on energy level
  const getEnergyColor = () => {
    if (energyPercentage >= 70) return 'text-green-400'
    if (energyPercentage >= 40) return 'text-yellow-400'
    if (energyPercentage >= 20) return 'text-orange-400'
    return 'text-red-400'
  }

  const getProgressBarColor = () => {
    if (energyPercentage >= 70) return 'bg-green-400'
    if (energyPercentage >= 40) return 'bg-yellow-400'
    if (energyPercentage >= 20) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const getWarningIcon = () => {
    switch (energyLimits.warningLevel) {
      case 'critical': return '🚨'
      case 'warning': return '⚠️'
      case 'caution': return '⚡'
      default: return '✨'
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm font-medium">Energy:</span>
        <div className="flex items-center space-x-1">
          <span className={`text-sm font-bold ${getEnergyColor()}`}>
            {mentalBankState.currentEnergy}
          </span>
          <span className="text-xs text-gray-500">
            / {mentalBankState.maxEnergy}
          </span>
        </div>
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${energyPercentage}%` }}
          />
        </div>
        {energyLimits.warningLevel !== 'none' && (
          <span className="text-sm" title={energyLimits.recommendation}>
            {getWarningIcon()}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Mental Bank Balance</h3>
        <span className="text-2xl">{getWarningIcon()}</span>
      </div>

      {/* Energy Level */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Current Energy</span>
          <span className={`text-lg font-bold ${getEnergyColor()}`}>
            {mentalBankState.currentEnergy} / {mentalBankState.maxEnergy}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${energyPercentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {energyPercentage.toFixed(1)}% available
        </div>
      </div>

      {/* Daily Usage */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Daily Usage</span>
          <span className="text-sm text-gray-600">
            {mentalBankState.dailyExpenditure} spent
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-400 transition-all duration-500"
            style={{ width: `${dailyUsagePercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {mentalBankState.totalTasksCompleted}
          </div>
          <div className="text-xs text-gray-500">Tasks Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">
            {mentalBankState.streakDays}
          </div>
          <div className="text-xs text-gray-500">Day Streak</div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">This Week</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-red-500">-{mentalBankState.weeklyStats.energySpent}</span>
            <span className="text-gray-500 ml-1">spent</span>
          </div>
          <div>
            <span className="text-green-500">+{mentalBankState.weeklyStats.energyGained}</span>
            <span className="text-gray-500 ml-1">gained</span>
          </div>
          <div>
            <span className="text-blue-500">{mentalBankState.weeklyStats.tasksCompleted}</span>
            <span className="text-gray-500 ml-1">tasks</span>
          </div>
          <div>
            <span className="text-purple-500">{mentalBankState.weeklyStats.focusTime}m</span>
            <span className="text-gray-500 ml-1">focus</span>
          </div>
        </div>
      </div>

      {/* Warning/Recommendation */}
      {energyLimits.warningLevel !== 'none' && (
        <div className={`p-3 rounded-lg mb-4 ${
          energyLimits.warningLevel === 'critical' ? 'bg-red-50 border border-red-200' :
          energyLimits.warningLevel === 'warning' ? 'bg-orange-50 border border-orange-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className={`text-sm ${
            energyLimits.warningLevel === 'critical' ? 'text-red-700' :
            energyLimits.warningLevel === 'warning' ? 'text-orange-700' :
            'text-yellow-700'
          }`}>
            {energyLimits.recommendation}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {showTransactions && recentTransactions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span>
                    {transaction.type === 'task_complete' ? '✅' :
                     transaction.type === 'task_move' ? '📋' :
                     transaction.type === 'focus_session' ? '🎯' :
                     transaction.type === 'break' ? '😌' : '⚡'}
                  </span>
                  <span className="text-gray-600 truncate max-w-24">
                    {transaction.metadata?.taskTitle || 
                     transaction.metadata?.notes ||
                     transaction.type.replace('_', ' ')}
                  </span>
                </div>
                <span className={`font-medium ${
                  transaction.energyDelta > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {transaction.energyDelta > 0 ? '+' : ''}{transaction.energyDelta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 