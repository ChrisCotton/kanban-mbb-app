'use client'

import React from 'react'
import { WeatherData, getWeatherEmoji, formatTemperature } from '../../hooks/useWeatherData'

interface DailyWeatherCardProps {
  date: Date
  weather?: WeatherData
  compact?: boolean
  showDetails?: boolean
  className?: string
  onClick?: () => void
}

const DailyWeatherCard: React.FC<DailyWeatherCardProps> = ({
  date,
  weather,
  compact = false,
  showDetails = false,
  className = '',
  onClick
}) => {
  if (!weather) {
    return null // Don't show anything if no weather data
  }

  const emoji = getWeatherEmoji(weather.weather_description, weather.weather_icon)
  const currentTemp = formatTemperature(weather.temperature_current)
  const minTemp = formatTemperature(weather.temperature_min)
  const maxTemp = formatTemperature(weather.temperature_max)

  if (compact) {
    return (
      <div
        className={`bg-white/5 backdrop-blur-sm rounded-md p-1.5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors ${className}`}
        onClick={onClick}
        title={`${weather.weather_description} - ${currentTemp} (${minTemp}/${maxTemp})`}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="text-base">{emoji}</span>
          <span className="text-white/90 font-medium">{currentTemp}</span>
        </div>
        {showDetails && (
          <div className="text-white/70 text-xs mt-1">
            {minTemp}/{maxTemp}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow-lg cursor-pointer hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="text-white font-semibold text-lg">{currentTemp}</div>
            <div className="text-white/70 text-xs">{weather.location_name}</div>
          </div>
        </div>
        <div className="text-white/80 text-sm text-right">
          <div className="font-medium">{maxTemp}</div>
          <div className="text-white/60">{minTemp}</div>
        </div>
      </div>

      {/* Weather Description */}
      {weather.weather_description && (
        <div className="text-white/80 text-sm mb-2 capitalize">
          {weather.weather_description}
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
          {weather.humidity !== undefined && (
            <div className="flex items-center space-x-1">
              <span>💧</span>
              <span>{weather.humidity}%</span>
            </div>
          )}
          {weather.wind_speed !== undefined && (
            <div className="flex items-center space-x-1">
              <span>💨</span>
              <span>{weather.wind_speed} km/h</span>
            </div>
          )}
          {weather.precipitation !== undefined && weather.precipitation > 0 && (
            <div className="flex items-center space-x-1">
              <span>🌧️</span>
              <span>{weather.precipitation}mm</span>
            </div>
          )}
          <div className="flex items-center space-x-1 text-white/50">
            <span>📍</span>
            <span className="truncate">{weather.source || 'weather'}</span>
          </div>
        </div>
      )}

      {/* Hover indicator */}
      <div className="mt-2 text-white/50 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        Click for details
      </div>
    </div>
  )
}

export default DailyWeatherCard

// Skeleton component for loading state
export const DailyWeatherCardSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-md p-1.5 border border-white/10 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-4 h-4 bg-white/20 rounded"></div>
          <div className="w-8 h-3 bg-white/20 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-lg p-3 border border-white/20 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white/20 rounded-full"></div>
          <div>
            <div className="w-12 h-4 bg-white/20 rounded mb-1"></div>
            <div className="w-16 h-3 bg-white/20 rounded"></div>
          </div>
        </div>
        <div>
          <div className="w-8 h-4 bg-white/20 rounded mb-1"></div>
          <div className="w-8 h-3 bg-white/20 rounded"></div>
        </div>
      </div>
      <div className="w-20 h-3 bg-white/20 rounded mb-2"></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="w-12 h-3 bg-white/20 rounded"></div>
        <div className="w-16 h-3 bg-white/20 rounded"></div>
      </div>
    </div>
  )
} 