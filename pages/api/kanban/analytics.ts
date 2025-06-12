import { NextApiRequest, NextApiResponse } from 'next'
import { getTaskStats, getRecentCompletions, getOverdueTasks } from '../../../lib/database/kanban-queries'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  try {
    return await handleGetAnalytics(req, res)
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleGetAnalytics(req: NextApiRequest, res: NextApiResponse) {
  const { days } = req.query
  
  // Validate days parameter
  let daysNumber = 7 // default
  if (days) {
    daysNumber = parseInt(days as string)
    if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
      return res.status(400).json({ 
        error: 'Days parameter must be a number between 1 and 365' 
      })
    }
  }

  try {
    // Fetch all analytics data in parallel
    const [stats, recentCompletions, overdueTasks] = await Promise.all([
      getTaskStats(),
      getRecentCompletions(daysNumber),
      getOverdueTasks()
    ])

    // Calculate additional metrics
    const productivity = {
      tasksCompletedInPeriod: recentCompletions.length,
      averageTasksPerDay: recentCompletions.length / daysNumber,
      overdueCount: overdueTasks.length,
      productivityScore: calculateProductivityScore(stats, recentCompletions.length, overdueTasks.length)
    }

    return res.status(200).json({
      success: true,
      data: {
        overview: stats,
        productivity,
        recentCompletions,
        overdueTasks,
        period: {
          days: daysNumber,
          from: new Date(Date.now() - daysNumber * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    throw error
  }
}

/**
 * Calculate a productivity score based on various metrics
 * Score ranges from 0-100
 */
function calculateProductivityScore(
  stats: any, 
  recentCompletions: number, 
  overdueCount: number
): number {
  let score = 0

  // Base score from completion rate (0-40 points)
  score += Math.min(stats.completionRate * 0.4, 40)

  // Recent activity bonus (0-30 points)
  // 1+ tasks per day = full points
  const dailyAverage = recentCompletions / 7
  score += Math.min(dailyAverage * 30, 30)

  // Overdue penalty (0-20 points deducted)
  const overduePenalty = Math.min(overdueCount * 5, 20)
  score -= overduePenalty

  // Active work bonus (0-10 points)
  // Having tasks in "doing" shows active engagement
  if (stats.doing > 0) {
    score += Math.min(stats.doing * 2, 10)
  }

  return Math.max(0, Math.min(100, Math.round(score)))
} 