import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { date } = req.query
  
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ 
      success: false,
      error: 'Date parameter is required' 
    })
  }

  console.log(`Weather API called for date: ${date} with method:`, req.method)
  
  try {
    switch (req.method) {
      case 'GET':
        return await getWeatherForDate(req, res, date)
      case 'DELETE':
        return await deleteWeatherForDate(req, res, date)
      default:
        res.setHeader('Allow', ['GET', 'DELETE'])
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

async function getWeatherForDate(req: NextApiRequest, res: NextApiResponse, date: string) {
  const { user_id } = req.query

  if (!user_id) {
    return res.status(400).json({ 
      success: false,
      error: 'user_id is required' 
    })
  }

  // Validate date format
  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid date format. Use YYYY-MM-DD format.' 
    })
  }

  try {
    const { data: weatherData, error } = await supabase
      .from('weather_data')
      .select('*')
      .eq('user_id', user_id)
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching weather data for date:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch weather data',
        details: error.message
      })
    }

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        error: 'No weather data found for this date',
        date
      })
    }

    return res.status(200).json({
      success: true,
      data: weatherData,
      message: `Weather data retrieved for ${date}`
    })

  } catch (error) {
    console.error('Error in getWeatherForDate:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function deleteWeatherForDate(req: NextApiRequest, res: NextApiResponse, date: string) {
  const { user_id } = req.query

  if (!user_id) {
    return res.status(400).json({ 
      success: false,
      error: 'user_id is required' 
    })
  }

  // Validate date format
  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid date format. Use YYYY-MM-DD format.' 
    })
  }

  try {
    const { data: deletedData, error } = await supabase
      .from('weather_data')
      .delete()
      .eq('user_id', user_id)
      .eq('date', date)
      .select('*')

    if (error) {
      console.error('Error deleting weather data:', error)
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete weather data',
        details: error.message
      })
    }

    if (!deletedData || deletedData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No weather data found for this date',
        date
      })
    }

    return res.status(200).json({
      success: true,
      data: deletedData,
      message: `Weather data deleted for ${date}`,
      deleted_count: deletedData.length
    })

  } catch (error) {
    console.error('Error in deleteWeatherForDate:', error)
    return res.status(500).json({ 
      success: false,
      error: 'Failed to delete weather data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 