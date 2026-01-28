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
 * Generate image using Google Imagen API (via Gemini API endpoint)
 * Note: This uses Google's Imagen API, accessible through the Gemini API endpoint
 */
async function generateWithNanoBanana(
  prompt: string, 
  userApiKey?: string | null,
  options: { dimensions?: string } = {}
): Promise<{ imageUrl: string; imageBuffer?: Buffer }> {
  // Use user's API key if provided, otherwise fall back to environment variable
  const apiKey = userApiKey || process.env.NANO_BANANA_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey) {
    throw new Error('API key is not configured. Please add your Google API key to your Profile & Settings or set NANO_BANANA_API_KEY in environment variables.')
  }

  try {
    // Use Google Imagen API via Gemini API endpoint
    // Available models: imagen-4.0-generate-001, imagen-4.0-fast-generate-001, imagen-4.0-ultra-generate-001
    // Using fast version for better performance
    // Note: You can also use actual "Nano Banana" models: gemini-2.5-flash-image (uses generateContent method)
    const model = 'imagen-4.0-fast-generate-001'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`
    
    // Parse dimensions if provided (format: "1024x1024" or "512x768")
    let aspectRatio = '1:1' // default
    if (options.dimensions) {
      const [width, height] = options.dimensions.split('x').map(Number)
      if (width && height) {
        // Convert to aspect ratio format
        const ratio = width / height
        if (ratio > 1.3) aspectRatio = '16:9'
        else if (ratio > 1.1) aspectRatio = '4:3'
        else if (ratio > 0.9) aspectRatio = '1:1'
        else if (ratio > 0.7) aspectRatio = '3:4'
        else aspectRatio = '9:16'
      }
    }

    console.log(`🖼️ Calling Google Imagen API with model: ${model}`)
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`)
    
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [{
          prompt: prompt
        }],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspectRatio
          // Note: enhancePrompt is not supported via Gemini API endpoint (only via Vertex AI)
          // Note: addWatermark parameter is not supported by Imagen API via Gemini endpoint
        }
      })
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      let errorMessage = 'Google Imagen API error'
      
      // Log the full response for debugging
      console.error('❌ Google Imagen API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500) // First 500 chars
      })
      
      try {
        const errorJson = JSON.parse(responseText)
        errorMessage = errorJson.error?.message || errorJson.error?.details?.[0]?.message || errorJson.error || errorMessage
        
        // Log the parsed error for debugging
        console.error('❌ Parsed error JSON:', JSON.stringify(errorJson, null, 2))
        
        // Check for specific permission/API enablement errors
        const errorStr = JSON.stringify(errorJson).toLowerCase()
        if (errorStr.includes('permission') || errorStr.includes('not enabled') || errorStr.includes('api not enabled') || errorStr.includes('service not enabled') || errorStr.includes('403') || errorStr.includes('forbidden')) {
          throw new Error('API key does not have permission to use Imagen API. This usually means:\n1. Billing is not enabled for your Google Cloud project\n2. The Generative Language API is not enabled\n\nTo fix:\n- Go to Google AI Studio: https://aistudio.google.com/app/apikey\n- Find your project and click "Set up Billing"\n- Or enable billing in Google Cloud Console: https://console.cloud.google.com/billing\n- Then enable the Generative Language API: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com')
        }
        if (errorStr.includes('quota') || errorStr.includes('limit exceeded') || errorStr.includes('billing') || errorStr.includes('billing not enabled') || errorStr.includes('no billing account')) {
          throw new Error('Billing is required for Imagen API. Please set up billing:\n1. Go to Google AI Studio: https://aistudio.google.com/app/apikey\n2. Find your project (MBB VisionBoard) and click "Set up Billing"\n3. Link a billing account\n\nNote: Google provides free credits for new accounts, so you won\'t be charged immediately.')
        }
        if (errorStr.includes('invalid api key') || errorStr.includes('api key not valid') || errorStr.includes('api key invalid') || errorStr.includes('invalid key')) {
          throw new Error('Invalid Google API key. Please check your API key in Profile & Settings.')
        }
      } catch (parseError: any) {
        // If we already threw a specific error above, re-throw it
        if (parseError.message?.includes('API key') || parseError.message?.includes('quota') || parseError.message?.includes('permission') || parseError.message?.includes('billing')) {
          throw parseError
        }
        // Otherwise, use the raw response text
        errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`
      }
      
      console.error('❌ Google Imagen API error:', errorMessage)
      throw new Error(`Google Imagen API error: ${errorMessage}`)
    }

    let result: any
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      throw new Error('Invalid JSON response from API: ' + responseText.substring(0, 200))
    }
    
    // Extract image data from response
    // The response structure may vary, so we handle different formats
    let imageData: string | undefined
    
    if (result.predictions && result.predictions[0]) {
      // Vertex AI format: predictions[0].bytesBase64Encoded or predictions[0].image
      imageData = result.predictions[0].bytesBase64Encoded || result.predictions[0].image
    } else if (result.images && result.images[0]) {
      // Alternative format: images array
      imageData = result.images[0]
    } else if (result.data && result.data[0]) {
      // Another possible format: data array
      imageData = result.data[0]
    } else if (result.generatedImages && result.generatedImages[0]) {
      // Gemini API format
      imageData = result.generatedImages[0].base64String || result.generatedImages[0].image
    }

    if (!imageData) {
      console.error('❌ Unexpected API response format:', JSON.stringify(result).substring(0, 500))
      throw new Error('No image data found in API response. The API may have returned an unexpected format.')
    }

    // Convert base64 to buffer
    let imageBuffer: Buffer
    if (imageData.startsWith('data:image')) {
      // Data URL format: data:image/png;base64,...
      const base64Data = imageData.split(',')[1]
      imageBuffer = Buffer.from(base64Data, 'base64')
    } else {
      // Assume base64 string
      imageBuffer = Buffer.from(imageData, 'base64')
    }

    if (imageBuffer.length === 0) {
      throw new Error('Image buffer is empty - API may have returned invalid data')
    }

    console.log(`✅ Successfully generated image (${imageBuffer.length} bytes)`)

    // Return buffer - the calling code will upload it to Supabase Storage
    return { 
      imageUrl: 'placeholder://will-be-replaced-after-upload',
      imageBuffer: imageBuffer
    }
  } catch (error: any) {
    console.error('❌ Error calling Google Imagen API:', error)
    // If error already has a specific message (from above), re-throw it
    if (error.message?.includes('API key does not have permission') || 
        error.message?.includes('quota exceeded') ||
        error.message?.includes('Invalid Google API key')) {
      throw error
    }
    // Provide more helpful error messages for other cases
    if (error.message?.includes('API key')) {
      throw new Error('Invalid or missing Google API key. Please check your API key in Profile & Settings.')
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new Error('API quota exceeded. Please check your Google Cloud billing and quotas.')
    } else if (error.message?.includes('permission') || error.message?.includes('access') || error.message?.includes('not enabled')) {
      throw new Error('API key does not have permission to use Imagen API. Please enable the Generative Language API in Google Cloud Console: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com')
    }
    throw new Error(`Failed to generate image: ${error.message || 'Unknown error'}`)
  }
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
      goal_id,
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
    // Use select('*') to get all available columns - this avoids errors if some API key columns don't exist yet
    let profile: any = null
    let profileError: any = null
    
    try {
      const result = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user_id)
        .single()
      
      profile = result.data
      profileError = result.error
    } catch (err: any) {
      // Handle any unexpected errors
      console.error('Error fetching user profile:', err)
      profileError = err
    }

    // If profile doesn't exist, that's okay - we'll use defaults
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError)
      // If the error is about a missing column (42703), the migration hasn't been run
      if (profileError.code === '42703' || profileError.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Database schema mismatch. The API key columns are missing. Please run the migration: database/migrations/028_add_api_keys_to_user_profile.sql',
          details: profileError.message,
          code: 'MIGRATION_REQUIRED'
        })
      }
      return res.status(500).json({ 
        error: 'Failed to fetch user profile',
        details: profileError.message 
      })
    }

    const aiProvider = profile?.ai_image_provider || 'nano_banana'

    // Log provider and API key availability for debugging
    console.log('🔍 Image generation request:', {
      aiProvider,
      hasNanoBananaKey: !!profile?.nano_banana_api_key,
      hasGoogleAiKey: !!profile?.google_ai_api_key,
      user_id
    })

    // Route to appropriate provider
    let generatedMedia: { mediaUrl: string; mediaBuffer?: Buffer }
    
    try {
      if (aiProvider === 'nano_banana') {
        if (media_type === 'video') {
          return res.status(400).json({ 
            error: 'Nano Banana only supports image generation. Use Veo 3 for video generation.' 
          })
        }
        // Use nano_banana_api_key if available, otherwise fall back to google_ai_api_key
        // (since nano_banana provider uses Google Imagen API)
        const apiKey = profile?.nano_banana_api_key || profile?.google_ai_api_key
        
        if (!apiKey) {
          return res.status(400).json({
            error: 'API key is required. Please add your Google AI API key in Profile & Settings. You can use either the "Nano Banana API Key" or "Google AI API Key" field.'
          })
        }
        
        console.log('🔑 Using API key:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4))
        const nanoResult = await generateWithNanoBanana(prompt.trim(), apiKey, { dimensions })
        // Convert to expected format
        generatedMedia = {
          mediaUrl: nanoResult.imageUrl,
          mediaBuffer: nanoResult.imageBuffer
        }
      } else if (aiProvider === 'veo_3') {
        // Safely access google_ai_api_key - it may not exist if migration hasn't been run
        const googleAiKey = profile?.google_ai_api_key || null
        generatedMedia = await generateWithVeo3(prompt.trim(), media_type, googleAiKey, { dimensions })
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
    // Don't use goal text or prompt as title to avoid showing prompt content
    // Use goal text as title (it will be hidden if it matches goal field) or a generic default
    const imageTitle = goalText.substring(0, 50) || 'AI Generated Image'
    
    const { data: newImage, error: dbError } = await supabase
      .from('vision_board_images')
      .insert({
        user_id,
        file_name: fileName,
        file_path: filePath,
        title: imageTitle,
        description: null, // Don't store prompt in description to avoid showing it on carousel
        is_active: true,
        display_order: nextDisplayOrder,
        view_count: 0,
        goal: goalText,
        goal_id: finalGoalId,
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
