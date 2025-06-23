import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getVisionBoardImages(req, res)
      case 'POST':
        return await createVisionBoardImage(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Vision board API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getVisionBoardImages(req: NextApiRequest, res: NextApiResponse) {
  const { 
    user_id, 
    active_only = 'false',
    limit = '50',
    offset = '0'
  } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    let query = supabase
      .from('vision_board_images')
      .select('*')
      .eq('user_id', user_id)
      .order('display_order', { ascending: true })

    if (active_only === 'true') {
      query = query.eq('is_active', true)
    }

    const limitNum = Math.min(parseInt(limit as string) || 50, 100)
    const offsetNum = parseInt(offset as string) || 0
    query = query.range(offsetNum, offsetNum + limitNum - 1)

    const { data: images, error } = await query

    if (error) {
      console.error('Error fetching vision board images:', error)
      return res.status(500).json({ error: 'Failed to fetch vision board images' })
    }

    return res.status(200).json({
      success: true,
      data: images,
      count: images?.length || 0
    })

  } catch (error) {
    console.error('Error in getVisionBoardImages:', error)
    return res.status(500).json({ error: 'Failed to fetch vision board images' })
  }
}

async function createVisionBoardImage(req: NextApiRequest, res: NextApiResponse) {
  const { 
    user_id,
    title,
    description,
    file_path,
    is_active = true
  } = req.body

  if (!user_id || !file_path) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['user_id', 'file_path']
    })
  }

  try {
    // Get the current max display_order
    const { data: maxOrderData } = await supabase
      .from('vision_board_images')
      .select('display_order')
      .eq('user_id', user_id)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextDisplayOrder = (maxOrderData?.[0]?.display_order || 0) + 1

    const { data: newImage, error } = await supabase
      .from('vision_board_images')
      .insert({
        user_id,
        file_name: file_path.split('/').pop() || 'untitled',
        file_path,
        title: title || 'Untitled Vision',
        description: description || null,
        is_active: Boolean(is_active),
        display_order: nextDisplayOrder,
        view_count: 0
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating vision board image:', error)
      return res.status(500).json({ error: 'Failed to create vision board image' })
    }

    return res.status(201).json({
      success: true,
      data: newImage,
      message: 'Vision board image created successfully'
    })

  } catch (error) {
    console.error('Error in createVisionBoardImage:', error)
    return res.status(500).json({ error: 'Failed to create vision board image' })
  }
} 