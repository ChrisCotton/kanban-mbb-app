import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getMBBData(req, res)
      case 'POST':
        return await updateMBBSettings(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('MBB API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getMBBData(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  console.log(`📊 Getting MBB data for user ${user_id}`)

  // Return mock data for now since table doesn't exist
  const mockSettings = {
    id: 'mock-id',
    user_id,
    target_balance_usd: 1000.00,
    current_balance_usd: 250.00,
    progress_percentage: 25.0,
    show_balance: true,
    show_progress: true,
    show_earnings_rate: true,
    notification_enabled: true,
    target_reminder_frequency: 'daily',
    targets_reached_count: 0,
    current_streak_days: 0,
    longest_streak_days: 0,
    last_balance_update: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return res.status(200).json({
    success: true,
    data: {
      settings: mockSettings,
      earnings: { total_earnings: 250.00 },
      progress_metrics: { target_progress: 25.0 },
      recent_sessions: [],
      balance_history: null,
      last_updated: new Date().toISOString()
    }
  })
}

async function updateMBBSettings(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, target_balance_usd } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  if (target_balance_usd !== undefined) {
    const targetAmount = parseFloat(target_balance_usd)
    if (isNaN(targetAmount) || targetAmount < 0) {
      return res.status(400).json({ error: 'target_balance_usd must be a positive number' })
    }
  }

  console.log(`✅ MBB target updated to $${target_balance_usd} for user ${user_id}`)

  const updatedSettings = {
    id: 'mock-id',
    user_id,
    target_balance_usd: target_balance_usd || 1000.00,
    current_balance_usd: 250.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return res.status(200).json({
    success: true,
    data: updatedSettings,
    message: 'MBB settings updated successfully'
  })
}
