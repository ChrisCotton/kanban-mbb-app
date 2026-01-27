import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configure for JSON body parsing
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
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
    offset = '0',
    due_date_from,
    due_date_to,
    sort_by_due_date = 'false'
  } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  try {
    let query = supabase
      .from('vision_board_images')
      .select('*')
      .eq('user_id', user_id)

    if (active_only === 'true') {
      query = query.eq('is_active', true)
    }

    // Apply due date filtering
    if (due_date_from) {
      query = query.gte('due_date', due_date_from as string)
    }
    if (due_date_to) {
      query = query.lte('due_date', due_date_to as string)
    }

    // Apply ordering
    if (sort_by_due_date === 'true') {
      query = query.order('due_date', { ascending: true })
    } else {
      query = query.order('display_order', { ascending: true })
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
    file_name,
    is_active = true,
    goal,
    goal_id,
    due_date,
    media_type = 'image'
  } = req.body

  // Validate required fields
  if (!user_id) {
    return res.status(400).json({ 
      error: 'Missing required field: user_id'
    })
  }
  if (!file_path) {
    return res.status(400).json({ 
      error: 'Missing required field: file_path'
    })
  }
  
  // Goal validation: either goal_id or goal text must be provided
  let goalText = '';
  let finalGoalId: string | null = null;
  
  if (goal_id) {
    // If goal_id is provided, fetch the goal to get its title
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .select('id, title')
      .eq('id', goal_id)
      .eq('user_id', user_id)
      .single();
    
    if (goalError || !goalData) {
      return res.status(400).json({ 
        error: 'Invalid goal_id or goal does not belong to user'
      })
    }
    
    finalGoalId = goalData.id;
    goalText = goalData.title; // Use goal title as goal text
  } else if (goal && goal.trim()) {
    // Use provided goal text
    const trimmedGoal = goal.trim();
    if (trimmedGoal.length === 0) {
      return res.status(400).json({ 
        error: 'goal cannot be empty or whitespace only'
      })
    }
    if (trimmedGoal.length > 500) {
      return res.status(400).json({ 
        error: 'goal must be 500 characters or less'
      })
    }
    goalText = trimmedGoal;
  } else {
    return res.status(400).json({ 
      error: 'Missing required field: either goal_id or goal text must be provided'
    })
  }
  
  if (!due_date) {
    return res.status(400).json({ 
      error: 'Missing required field: due_date'
    })
  }

  // Validate due_date format
  const dueDateObj = new Date(due_date)
  if (isNaN(dueDateObj.getTime())) {
    return res.status(400).json({ 
      error: 'due_date must be a valid date'
    })
  }

  // Format due_date as ISO date string (YYYY-MM-DD)
  const dueDateISO = due_date.includes('T') 
    ? due_date.split('T')[0] 
    : due_date

  // Validate media_type
  if (media_type !== 'image' && media_type !== 'video') {
    return res.status(400).json({ 
      error: 'media_type must be "image" or "video"'
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
        file_name: file_name || file_path.split('/').pop() || 'untitled',
        file_path,
        title: title || goalText.substring(0, 200) || 'Untitled Vision',
        description: description || null,
        is_active: Boolean(is_active),
        display_order: nextDisplayOrder,
        view_count: 0,
        goal: goalText,
        goal_id: finalGoalId,
        due_date: dueDateISO,
        media_type: media_type,
        ai_provider: null, // Manual uploads don't have AI provider
        generation_prompt: null // Manual uploads don't have generation prompt
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating vision board image:', error)
      return res.status(500).json({ 
        error: 'Failed to create vision board image',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }

    // Create link in goal_vision_images junction table if goal_id is provided
    if (finalGoalId && newImage) {
      const { error: linkError } = await supabase
        .from('goal_vision_images')
        .insert({
          goal_id: finalGoalId,
          vision_image_id: newImage.id
        })

      if (linkError) {
        console.error('Error creating goal-vision image link:', linkError)
        // Don't fail the request, but log the error
        // The goal_id is already set on the image, so the relationship exists
      }
    }

    return res.status(201).json({
      success: true,
      data: newImage,
      message: 'Vision board image created successfully'
    })

  } catch (error: any) {
    console.error('Error in createVisionBoardImage:', error)
    return res.status(500).json({ 
      error: 'Failed to create vision board image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
} 