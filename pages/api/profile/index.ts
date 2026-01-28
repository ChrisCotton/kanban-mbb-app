import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-load supabase client to ensure env vars are available
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }
    
    supabase = createClient(url, key)
  }
  return supabase
}

export interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  default_category_id: string | null
  default_target_revenue: number
  ai_image_provider: string
  ai_audio_journal_provider: string
  ai_journal_insight_provider: string
  nano_banana_api_key: string | null
  google_ai_api_key: string | null
  openai_api_key: string | null
  google_speech_api_key: string | null
  assemblyai_api_key: string | null
  deepgram_api_key: string | null
  anthropic_claude_api_key: string | null
  google_gemini_api_key: string | null
  created_at: string
  updated_at: string
}

export const AI_IMAGE_PROVIDERS = [
  { id: 'openai_dalle', name: 'OpenAI DALL-E', description: 'High-quality AI image generation' },
  { id: 'stability_ai', name: 'Stability AI', description: 'Stable Diffusion models' },
  { id: 'midjourney', name: 'Midjourney', description: 'Artistic AI imagery' },
  { id: 'nano_banana', name: 'Nano Banana', description: 'Fast AI image generation' },
  { id: 'veo_3', name: 'Veo 3', description: 'Google video/image generation' },
]

export const AI_AUDIO_PROVIDERS = [
  { id: 'openai_whisper', name: 'OpenAI Whisper', description: 'High-accuracy transcription' },
  { id: 'google_speech', name: 'Google Speech-to-Text', description: 'Google Cloud transcription' },
  { id: 'assemblyai', name: 'AssemblyAI', description: 'AI transcription with sentiment' },
  { id: 'deepgram', name: 'Deepgram', description: 'Real-time transcription' },
]

export const AI_JOURNAL_PROVIDERS = [
  { id: 'openai_gpt4', name: 'OpenAI GPT-4', description: 'Advanced reasoning and analysis' },
  { id: 'anthropic_claude', name: 'Anthropic Claude', description: 'Thoughtful, nuanced analysis' },
  { id: 'google_gemini', name: 'Google Gemini', description: 'Multimodal understanding' },
  { id: 'cognee_memory', name: 'Cognee Memory (Coming Soon)', description: 'Long-term memory and context' },
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getProfile(req, res)
      case 'PUT':
        return await updateProfile(req, res)
      case 'POST':
        return await createProfile(req, res)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error: any) {
    console.error('Profile API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getProfile(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  // Try to get existing profile
  const { data: profile, error } = await getSupabase()
    .from('user_profile')
    .select('*')
    .eq('user_id', user_id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error)
    return res.status(500).json({ error: 'Failed to fetch profile' })
  }

  // If no profile exists, return defaults
  if (!profile) {
    return res.status(200).json({
      success: true,
      data: {
        user_id,
        display_name: null,
        avatar_url: null,
        default_category_id: null,
        default_target_revenue: 1000.00,
        ai_image_provider: 'openai_dalle',
        ai_audio_journal_provider: 'openai_whisper',
        ai_journal_insight_provider: 'openai_gpt4',
      },
      isNew: true
    })
  }

  return res.status(200).json({
    success: true,
    data: profile,
    isNew: false
  })
}

async function createProfile(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, ...profileData } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const { data: profile, error } = await getSupabase()
    .from('user_profile')
    .insert({
      user_id,
      ...profileData
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // Profile already exists, update instead
      return updateProfile(req, res)
    }
    console.error('Error creating profile:', error)
    return res.status(500).json({ error: 'Failed to create profile' })
  }

  return res.status(201).json({
    success: true,
    data: profile,
    message: 'Profile created successfully'
  })
}

async function updateProfile(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, ...updateData } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  // Validate AI provider values if provided
  if (updateData.ai_image_provider && 
      !AI_IMAGE_PROVIDERS.find(p => p.id === updateData.ai_image_provider)) {
    return res.status(400).json({ error: 'Invalid ai_image_provider' })
  }
  if (updateData.ai_audio_journal_provider && 
      !AI_AUDIO_PROVIDERS.find(p => p.id === updateData.ai_audio_journal_provider)) {
    return res.status(400).json({ error: 'Invalid ai_audio_journal_provider' })
  }
  if (updateData.ai_journal_insight_provider && 
      !AI_JOURNAL_PROVIDERS.find(p => p.id === updateData.ai_journal_insight_provider)) {
    return res.status(400).json({ error: 'Invalid ai_journal_insight_provider' })
  }

  // Sanitize API keys - remove empty strings, keep null for unset
  const apiKeyFields = [
    'nano_banana_api_key',
    'google_ai_api_key',
    'openai_api_key',
    'google_speech_api_key',
    'assemblyai_api_key',
    'deepgram_api_key',
    'anthropic_claude_api_key',
    'google_gemini_api_key'
  ]
  
  apiKeyFields.forEach(field => {
    if (updateData[field] === '') {
      updateData[field] = null
    }
  })

  // Log what we're about to save (without logging actual key values)
  console.log('💾 Updating profile with fields:', Object.keys(updateData))
  const updatingApiKeys = apiKeyFields.filter(field => updateData[field] !== undefined && updateData[field] !== null)
  if (updatingApiKeys.length > 0) {
    console.log('💾 API key fields being updated:', updatingApiKeys)
  }
  
  // Separate API key fields from other fields
  const apiKeyUpdateData: Record<string, any> = {}
  const nonApiKeyUpdateData: Record<string, any> = {}
  
  Object.keys(updateData).forEach(key => {
    if (apiKeyFields.includes(key)) {
      apiKeyUpdateData[key] = updateData[key]
    } else {
      nonApiKeyUpdateData[key] = updateData[key]
    }
  })

  // First, try to update non-API-key fields (these should always exist)
  let { data: profile, error } = await getSupabase()
    .from('user_profile')
    .upsert({
      user_id,
      ...nonApiKeyUpdateData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single()

  // If basic update failed, return error
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error updating profile (non-API fields):', error)
    return res.status(500).json({ 
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code
    })
  }

  // Now try to update API key fields if any were provided
  if (Object.keys(apiKeyUpdateData).length > 0) {
    const apiKeyUpdate = await getSupabase()
      .from('user_profile')
      .upsert({
        user_id,
        ...apiKeyUpdateData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (apiKeyUpdate.error) {
      // Check if it's a missing column error
      if (apiKeyUpdate.error.code === '42703' || 
          (apiKeyUpdate.error.message?.includes('column') && apiKeyUpdate.error.message?.includes('does not exist'))) {
        // Extract missing column name
        const missingColumnMatch = apiKeyUpdate.error.message?.match(/column "?(\w+)"? does not exist/i)
        const missingColumn = missingColumnMatch ? missingColumnMatch[1] : 'unknown'
        
        console.warn(`⚠️ API key column "${missingColumn}" does not exist. Profile updated without API keys.`)
        
        // Return success for non-API fields, but warn about missing columns
        return res.status(200).json({
          success: true,
          data: profile,
          message: 'Profile updated successfully',
          warning: `API key fields could not be saved: column "${missingColumn}" does not exist in the database.`,
          skippedFields: Object.keys(apiKeyUpdateData),
          migrationHint: 'To enable API key storage, run: supabase db push or manually execute database/migrations/028_add_api_keys_to_user_profile.sql'
        })
      }
      
      // Other error updating API keys
      console.error('❌ Error updating API key fields:', apiKeyUpdate.error)
      return res.status(500).json({ 
        error: 'Failed to update API key fields',
        details: process.env.NODE_ENV === 'development' ? apiKeyUpdate.error.message : undefined,
        code: apiKeyUpdate.error.code,
        message: 'Profile was updated but API keys could not be saved'
      })
    }
    
    // API keys updated successfully
    profile = apiKeyUpdate.data
  }

  console.log('✅ Profile updated successfully')
  console.log('✅ Updated fields:', Object.keys(profile || {}))

  return res.status(200).json({
    success: true,
    data: profile,
    message: 'Profile updated successfully'
  })
}
