import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// AI Provider configurations
const AI_PROVIDERS = {
  nano_banana: {
    name: 'Nano Banana',
    requiresKey: 'NANO_BANANA_API_KEY',
    endpoint: process.env.NANO_BANANA_API_ENDPOINT || 'https://api.nanobanana.ai/v1/generate'
  },
  veo_3: {
    name: 'Google Veo 3',
    requiresKey: 'GOOGLE_AI_API_KEY',
    endpoint: process.env.GOOGLE_AI_API_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models'
  }
}

/**
 * Generate image using Nano Banana API
 */
async function generateWithNanoBanana(
  prompt: string, 
  userApiKey?: string | null,
  options: { dimensions?: string } = {}
): Promise<{ imageUrl: string; imageBuffer?: Buffer }> {
  // Use user's API key if provided, otherwise fall back to environment variable
  const apiKey = userApiKey || process.env.NANO_BANANA_API_KEY
  
  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY is not configured. Please add it to your Profile & Settings or environment variables.')
  }

  // TODO: Implement actual Nano Banana API call
  // This is a placeholder - replace with actual API implementation
  // Example structure:
  /*
  const response = await fetch(AI_PROVIDERS.nano_banana.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      ...options
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Nano Banana API error')
  }

  const result = await response.json()
  return { imageUrl: result.image_url, imageBuffer: result.image_buffer }
  */

  // Placeholder: Return a placeholder image URL for now
  // In production, this should call the actual Nano Banana API
  throw new Error('Nano Banana API integration not yet implemented. Please check the API documentation and update the generateWithNanoBanana function.')
}

/**
 * Generate image or video using Google Veo 3 API
 */
async function generateWithVeo3(
  prompt: string, 
  mediaType: 'image' | 'video',
  userApiKey?: string | null,
  options: { dimensions?: string } = {}
): Promise<{ mediaUrl: string; mediaBuffer?: Buffer }> {
  // Use user's API key if provided, otherwise fall back to environment variable
  const apiKey = userApiKey || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured. Please add it to your Profile & Settings or environment variables.')
  }

  // TODO: Implement actual Google Veo 3 / Imagen 3 API call
  // This is a placeholder - replace with actual API implementation
  // For videos, use Veo 3 model
  // For images, use Imagen 3 model
  // Example structure:
  /*
  const model = mediaType === 'video' 
    ? 'veo-3' 
    : 'imagen-3'
  
  const response = await fetch(`${AI_PROVIDERS.veo_3.endpoint}/${model}:generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      ...options
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Google AI API error')
  }

  const result = await response.json()
  return { mediaUrl: result.media_url, mediaBuffer: result.media_buffer }
  */

  // Placeholder: Return error for now
  throw new Error('Google Veo 3 / Imagen 3 API integration not yet implemented. Please check the API documentation and update the generateWithVeo3 function.')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  try {
    const { 
      user_id,
      prompt,
      goal,
      due_date,
      media_type = 'image',
      style,
      dimensions
    } = req.body

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required' })
    }
    if (!goal || !goal.trim()) {
      return res.status(400).json({ error: 'goal is required' })
    }
    if (!due_date) {
      return res.status(400).json({ error: 'due_date is required' })
    }
    if (media_type !== 'image' && media_type !== 'video') {
      return res.status(400).json({ error: 'media_type must be "image" or "video"' })
    }

    // Validate due_date format
    const dueDateObj = new Date(due_date)
    if (isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ error: 'due_date must be a valid date' })
    }

    // Fetch user profile to get AI provider and API keys
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('ai_image_provider, nano_banana_api_key, google_ai_api_key')
      .eq('user_id', user_id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError)
      return res.status(500).json({ error: 'Failed to fetch user profile' })
    }

    const aiProvider = profile?.ai_image_provider || 'nano_banana'

    // Route to appropriate provider
    let generatedMedia: { mediaUrl: string; mediaBuffer?: Buffer }
    
    try {
      if (aiProvider === 'nano_banana') {
        if (media_type === 'video') {
          return res.status(400).json({ 
            error: 'Nano Banana only supports image generation. Use Veo 3 for video generation.' 
          })
        }
        generatedMedia = await generateWithNanoBanana(prompt.trim(), profile?.nano_banana_api_key, { dimensions })
      } else if (aiProvider === 'veo_3') {
        generatedMedia = await generateWithVeo3(prompt.trim(), media_type, profile?.google_ai_api_key, { dimensions })
      } else {
        return res.status(400).json({ 
          error: `Unsupported AI provider: ${aiProvider}. Supported providers: nano_banana, veo_3` 
        })
      }
    } catch (providerError: any) {
      console.error(`Error generating with ${aiProvider}:`, providerError)
      return res.status(500).json({ 
        error: providerError.message || `Failed to generate ${media_type} with ${aiProvider}`,
        provider: aiProvider
      })
    }

    // Upload generated media to Supabase Storage
    let filePath: string
    let fileName: string
    let mimeType: string

    try {
      const fileExt = media_type === 'video' ? 'mp4' : 'png'
      fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      mimeType = media_type === 'video' ? 'video/mp4' : 'image/png'

      // If we have a buffer, upload it directly
      if (generatedMedia.mediaBuffer) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vision-board')
          .upload(fileName, generatedMedia.mediaBuffer, {
            contentType: mimeType
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('vision-board')
          .getPublicUrl(fileName)

        filePath = publicUrl
      } else {
        // If we have a URL, download and upload to our storage
        const downloadResponse = await fetch(generatedMedia.mediaUrl)
        if (!downloadResponse.ok) {
          throw new Error('Failed to download generated media')
        }

        const buffer = Buffer.from(await downloadResponse.arrayBuffer())
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vision-board')
          .upload(fileName, buffer, {
            contentType: mimeType
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('vision-board')
          .getPublicUrl(fileName)

        filePath = publicUrl
      }
    } catch (storageError: any) {
      console.error('Error uploading generated media:', storageError)
      return res.status(500).json({ 
        error: 'Failed to upload generated media to storage',
        details: storageError.message
      })
    }

    // Get the current max display_order for this user
    const { data: maxOrderData } = await supabase
      .from('vision_board_images')
      .select('display_order')
      .eq('user_id', user_id)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextDisplayOrder = (maxOrderData?.[0]?.display_order || 0) + 1

    // Format due_date as ISO date string (YYYY-MM-DD)
    const dueDateISO = due_date.includes('T') 
      ? due_date.split('T')[0] 
      : due_date

    // Create database record
    const { data: newImage, error: dbError } = await supabase
      .from('vision_board_images')
      .insert({
        user_id,
        file_name: fileName,
        file_path: filePath,
        title: goal.trim().substring(0, 200) || 'Generated Vision',
        description: prompt.trim().substring(0, 500) || null,
        is_active: true,
        display_order: nextDisplayOrder,
        view_count: 0,
        goal: goal.trim(),
        due_date: dueDateISO,
        media_type: media_type,
        generation_prompt: prompt.trim(),
        ai_provider: aiProvider,
        mime_type: mimeType
      })
      .select('*')
      .single()

    if (dbError) {
      console.error('Error creating vision board image:', dbError)
      return res.status(500).json({ error: 'Failed to create vision board image record' })
    }

    return res.status(201).json({
      success: true,
      data: newImage,
      message: `${media_type === 'video' ? 'Video' : 'Image'} generated successfully`
    })

  } catch (error: any) {
    console.error('Error in generate endpoint:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
