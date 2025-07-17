import { useState, useEffect, useCallback } from 'react'

export interface WeatherData {
  id: string
  user_id: string
  date: string
  location_name: string
  latitude: number
  longitude: number
  temperature_current?: number
  temperature_min?: number
  temperature_max?: number
  weather_description?: string
  weather_icon?: string
  humidity?: number
  wind_speed?: number
  precipitation?: number
  source?: string
  created_at: string
  updated_at: string
}

export interface UseWeatherDataOptions {
  userId: string
  startDate?: string
  endDate?: string
  location?: string
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
}

export interface UseWeatherDataReturn {
  weatherData: WeatherData[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  getWeatherForDate: (date: string) => WeatherData | undefined
  hasWeatherForDate: (date: string) => boolean
}

export const useWeatherData = (options: UseWeatherDataOptions): UseWeatherDataReturn => {
  const { userId, startDate, endDate, location, autoRefresh = false, refreshInterval = 300000 } = options
  
  const [weatherData, setWeatherData] = useState<WeatherData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeatherData = useCallback(async () => {
    if (!userId) {
      setError('User ID is required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // If we have a single date (startDate === endDate) or just startDate, use the date-specific endpoint
      if (startDate && (!endDate || startDate === endDate)) {
        console.log(`Fetching weather data for single date: ${startDate}, user: ${userId}`)
        
        const response = await fetch(`/api/weather/${startDate}?user_id=${userId}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch weather data')
        }

        // Convert single result to array format
        const weatherArray = result.data ? [result.data] : []
        console.log('Weather data fetched successfully:', weatherArray.length, 'entries')
        setWeatherData(weatherArray)
        
      } else {
        // For date ranges, we'll need to fetch multiple dates or use a different approach
        // For now, let's handle the range by fetching each date individually
        const weatherResults: WeatherData[] = []
        
        if (startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          const dates: string[] = []
          
          // Generate array of dates between start and end
          for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            dates.push(date.toISOString().split('T')[0])
          }
          
          console.log(`Fetching weather data for date range: ${startDate} to ${endDate} (${dates.length} dates)`)
          
          // Fetch weather for each date
          for (const date of dates) {
            try {
              const response = await fetch(`/api/weather/${date}?user_id=${userId}`)
              
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) {
                  weatherResults.push(result.data)
                }
              }
              // Continue even if one date fails
            } catch (err) {
              console.warn(`Failed to fetch weather for ${date}:`, err)
            }
          }
        }
        
        console.log('Weather data fetched successfully:', weatherResults.length, 'entries')
        setWeatherData(weatherResults)
      }

    } catch (err) {
      console.error('Error fetching weather data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data')
      setWeatherData([])
    } finally {
      setLoading(false)
    }
  }, [userId, startDate, endDate, location])

  // Get weather data for a specific date
  const getWeatherForDate = useCallback((date: string): WeatherData | undefined => {
    return weatherData.find(weather => weather.date === date)
  }, [weatherData])

  // Check if weather data exists for a specific date
  const hasWeatherForDate = useCallback((date: string): boolean => {
    return weatherData.some(weather => weather.date === date)
  }, [weatherData])

  // Initial fetch
  useEffect(() => {
    fetchWeatherData()
  }, [fetchWeatherData])

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const interval = setInterval(() => {
      console.log('Auto-refreshing weather data...')
      fetchWeatherData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchWeatherData])

  return {
    weatherData,
    loading,
    error,
    refetch: fetchWeatherData,
    getWeatherForDate,
    hasWeatherForDate
  }
}

// Helper function to format date for API calls
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

// Helper function to get date range for current month
export const getCurrentMonthDateRange = (currentDate: Date) => {
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  return {
    startDate: formatDateForAPI(startOfMonth),
    endDate: formatDateForAPI(endOfMonth)
  }
}

// Helper function to get weather icon emoji
export const getWeatherEmoji = (description?: string, icon?: string): string => {
  if (!description && !icon) return '🌤️'
  
  const desc = (description || '').toLowerCase()
  
  if (desc.includes('clear') || desc.includes('sunny')) return '☀️'
  if (desc.includes('partly cloudy') || desc.includes('partly')) return '⛅'
  if (desc.includes('cloudy') || desc.includes('overcast')) return '☁️'
  if (desc.includes('rain') || desc.includes('drizzle')) return '🌧️'
  if (desc.includes('storm') || desc.includes('thunder')) return '⛈️'
  if (desc.includes('snow')) return '❄️'
  if (desc.includes('fog') || desc.includes('mist')) return '🌫️'
  if (desc.includes('wind')) return '💨'
  
  return '🌤️' // Default
}

// Helper function to format temperature
export const formatTemperature = (temp?: number, unit: 'C' | 'F' = 'C'): string => {
  if (temp === undefined || temp === null) return '--°'
  return `${Math.round(temp)}°${unit}`
} 