import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id: taskId } = req.query

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Task ID is required' })
    }

    if (req.method === 'GET') {
      return await handleGetTaskTags(req, res, taskId)
    } else if (req.method === 'POST') {
      return await handleAddTagToTask(req, res, taskId)
    } else if (req.method === 'DELETE') {
      return await handleRemoveTagFromTask(req, res, taskId)
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Task tags API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleGetTaskTags(req: NextApiRequest, res: NextApiResponse, taskId: string) {
  const { user_id } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  // Verify task belongs to user
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('user_id', user_id)
    .single()

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  // Get all tags for this task
  const { data: taskTags, error } = await supabase
    .from('task_tags')
    .select(`
      tag_id,
      tags (
        id,
        name,
        color,
        created_at,
        updated_at
      )
    `)
    .eq('task_id', taskId)

  if (error) {
    console.error('Error fetching task tags:', error)
    return res.status(500).json({ error: 'Failed to fetch task tags' })
  }

  // Transform the data
  const tags = taskTags?.map(tt => tt.tags).filter(Boolean) || []

  return res.status(200).json({ tags })
}

async function handleAddTagToTask(req: NextApiRequest, res: NextApiResponse, taskId: string) {
  const { tag_id, user_id } = req.body

  if (!tag_id || typeof tag_id !== 'string') {
    return res.status(400).json({ error: 'Tag ID is required' })
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  // Verify task belongs to user
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('user_id', user_id)
    .single()

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  // Verify tag belongs to user
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id, name, color')
    .eq('id', tag_id)
    .eq('created_by', user_id)
    .single()

  if (tagError || !tag) {
    return res.status(404).json({ error: 'Tag not found' })
  }

  // Check if relationship already exists
  const { data: existingRelation, error: checkError } = await supabase
    .from('task_tags')
    .select('id')
    .eq('task_id', taskId)
    .eq('tag_id', tag_id)
    .single()

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing relation:', checkError)
    return res.status(500).json({ error: 'Failed to check existing relation' })
  }

  if (existingRelation) {
    return res.status(409).json({ error: 'Tag is already assigned to this task' })
  }

  // Create the relationship
  const { data: taskTag, error } = await supabase
    .from('task_tags')
    .insert({
      task_id: taskId,
      tag_id: tag_id
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding tag to task:', error)
    return res.status(500).json({ error: 'Failed to add tag to task' })
  }

  return res.status(201).json({ 
    task_tag: taskTag,
    tag: tag
  })
}

async function handleRemoveTagFromTask(req: NextApiRequest, res: NextApiResponse, taskId: string) {
  const { tag_id, user_id } = req.body

  if (!tag_id || typeof tag_id !== 'string') {
    return res.status(400).json({ error: 'Tag ID is required' })
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  // Verify task belongs to user
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', taskId)
    .eq('user_id', user_id)
    .single()

  if (taskError || !task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  // Remove the relationship
  const { error } = await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', taskId)
    .eq('tag_id', tag_id)

  if (error) {
    console.error('Error removing tag from task:', error)
    return res.status(500).json({ error: 'Failed to remove tag from task' })
  }

  return res.status(200).json({ message: 'Tag removed from task successfully' })
} 