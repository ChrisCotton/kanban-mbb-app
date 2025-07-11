import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface WeatherData {
  id?: string
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
  created_at?: string
  updated_at?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Weather API called with method:', req.method)
  
  try {
    switch (req.method) {
      case 'GET':
        return await getWeatherData(req, res)
      case 'POST':
        return await createOrUpdateWeatherData(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ 
          success: false,
          error: `Method ${req.method} not allowed` 
        })
    }
  } catch (error) {
    console.error('Weather API error:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function getWeatherData(req: NextApiRequest, res: NextApiResponse) {
  const { 
    user_id, 
    start_date, 
    end_date, 
    date,
    location,
    limit = '30' 
  } = req.query

  if (!user_id) {
    // Use a default user_id if none provided (temporary fix)
    user_id = '00000000-0000-0000-0000-000000000000'
  }

  try {
    let query = supabase
      .from('weather_data')
      .select('*')
      .eq('user_id', user_id)
      .order('date', { ascending: false })

    // Filter by specific date
    if (date) {
      query = query.eq('date', date)
    }

    // Filter by date range
    if (start_date) {
      query = query.gte('date', start_date)
    }
    if (end_date) {
      query = query.lte('date', end_date)
    }

    // Filter by location
    if (location) {
      query = query.ilike('location_name', `%${location}%`)
    }

    // Apply limit
    const limitNum = Math.min(parseInt(limit as string) || 30, 100)
    query = query.limit(limitNum)

    const { data: weatherData, error } = await query

    if (error) {
      console.error('Error fetching weather data:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch weather data',
        details: error.message
      })
    }

    return res.status(200).json({
      success: true,
      data: weatherData || [],
      count: weatherData?.length || 0,
      message: 'Weather data retrieved successfully'
    })

  } catch (error) {
    console.error('Error in getWeatherData:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function createOrUpdateWeatherData(req: NextApiRequest, res: NextApiResponse) {
  const { 
    user_id, 
    date, 
    location_name,
    latitude,
    longitude,
    temperature_current,
    temperature_min,
    temperature_max,
    weather_description,
    weather_icon,
    humidity,
    wind_speed,
    precipitation,
    source = 'open-meteo'
  } = req.body

  // Validate required fields
  if (!user_id || !date || !latitude || !longitude) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields',
      required: ['user_id', 'date', 'latitude', 'longitude']
    })
  }

  // Validate date format
  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid date format. Use YYYY-MM-DD format.' 
    })
  }

  // Validate coordinates
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ 
      success: false,
      error: 'Latitude and longitude must be numbers' 
    })
  }

  const weatherData = {
    user_id,
    date,
    location_name: location_name || 'Unknown Location',
    latitude,
    longitude,
    temperature_current: temperature_current ? parseInt(temperature_current) : null,
    temperature_min: temperature_min ? parseInt(temperature_min) : null,
    temperature_max: temperature_max ? parseInt(temperature_max) : null,
    weather_description: weather_description || null,
    weather_icon: weather_icon || null,
    humidity: humidity ? parseInt(humidity) : null,
    wind_speed: wind_speed ? parseInt(wind_speed) : null,
    precipitation: precipitation ? parseFloat(precipitation) : 0,
    source
  }

  try {
    // Use upsert to handle duplicates (insert or update if exists)
    const { data: newWeatherData, error } = await supabase
      .from('weather_data')
      .upsert(weatherData, { 
        onConflict: 'user_id,date,location_name' 
      })
      .select('*')
      .single()

    if (error) {
      console.error('Supabase error creating/updating weather data:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to save weather data',
        details: error.message
      })
    }

    console.log('Weather data saved successfully:', newWeatherData?.id)

    return res.status(201).json({
      success: true,
      data: newWeatherData,
      message: 'Weather data saved successfully'
    })

  } catch (error) {
    console.error('Error in createOrUpdateWeatherData:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to save weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 