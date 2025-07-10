import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface Tag {
  id: string
  name: string
  color: string
  created_by: string
  created_at: string
  updated_at: string
  task_count?: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      return await handleGetTags(req, res)
    } else if (req.method === 'POST') {
      return await handleCreateTag(req, res)
    } else {
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Tags API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleGetTags(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  // Get all tags for the user with task count
  const { data: tags, error } = await supabase
    .from('tags')
    .select(`
      *,
      task_count:task_tags(count)
    `)
    .eq('created_by', user_id)
    .order('name')

  if (error) {
    console.error('Error fetching tags:', error)
    return res.status(500).json({ error: 'Failed to fetch tags' })
  }

  // Transform the data to include task count
  const transformedTags = tags?.map(tag => ({
    ...tag,
    task_count: tag.task_count?.[0]?.count || 0
  })) || []

  return res.status(200).json({ tags: transformedTags })
}

async function handleCreateTag(req: NextApiRequest, res: NextApiResponse) {
  const { name, color, user_id } = req.body

  // Validation
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Tag name is required' })
  }

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  if (name.length < 1 || name.length > 50) {
    return res.status(400).json({ error: 'Tag name must be between 1 and 50 characters' })
  }

  if (color && (typeof color !== 'string' || !/^#[0-9A-F]{6}$/i.test(color))) {
    return res.status(400).json({ error: 'Color must be a valid hex color code' })
  }

  // Check if tag name already exists for this user
  const { data: existingTag, error: checkError } = await supabase
    .from('tags')
    .select('id')
    .eq('created_by', user_id)
    .eq('name', name.trim())
    .single()

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error checking existing tag:', checkError)
    return res.status(500).json({ error: 'Failed to check existing tag' })
  }

  if (existingTag) {
    return res.status(409).json({ error: 'A tag with this name already exists' })
  }

  // Create the tag
  const { data: tag, error } = await supabase
    .from('tags')
    .insert({
      name: name.trim(),
      color: color || '#3B82F6',
      created_by: user_id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tag:', error)
    return res.status(500).json({ error: 'Failed to create tag' })
  }

  return res.status(201).json({ 
    tag: {
      ...tag,
      task_count: 0
    }
  })
} 