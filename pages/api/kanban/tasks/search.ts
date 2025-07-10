import { NextApiRequest, NextApiResponse } from 'next'
import { searchTasks } from '../../../../lib/database/kanban-queries'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      q: query,
      status,
      priority,
      category,
      tags,
      overdue,
      start_date,
      end_date,
      limit = '50',
      offset = '0'
    } = req.query

    // Validate and parse parameters
    const searchParams: Parameters<typeof searchTasks>[0] = {
      query: query as string,
      status: status as any,
      priority: priority as any,
      category: category as string,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined,
      overdue: overdue === 'true',
      dateRange: start_date && end_date ? {
        start: start_date as string,
        end: end_date as string
      } : undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    }

    // Validate status if provided
    if (status && !['backlog', 'todo', 'doing', 'done'].includes(status as string)) {
      return res.status(400).json({ 
        error: 'Invalid status parameter',
        validStatuses: ['backlog', 'todo', 'doing', 'done']
      })
    }

    // Validate priority if provided
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority as string)) {
      return res.status(400).json({ 
        error: 'Invalid priority parameter',
        validPriorities: ['low', 'medium', 'high', 'urgent']
      })
    }

    const tasks = await searchTasks(searchParams)
    
    return res.status(200).json({
      success: true,
      data: tasks,
      count: tasks.length,
      query: searchParams
    })
  } catch (error) {
    console.error('Search tasks error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 