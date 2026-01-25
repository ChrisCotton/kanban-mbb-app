import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-load supabase client
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

// Transcription provider configurations
const TRANSCRIPTION_PROVIDERS = {
  openai_whisper: {
    name: 'OpenAI Whisper',
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    requiresKey: 'OPENAI_API_KEY'
  },
  google_speech: {
    name: 'Google Speech-to-Text',
    endpoint: 'https://speech.googleapis.com/v1/speech:recognize',
    requiresKey: 'GOOGLE_CLOUD_API_KEY'
  },
  assemblyai: {
    name: 'AssemblyAI',
    endpoint: 'https://api.assemblyai.com/v2/transcript',
    requiresKey: 'ASSEMBLYAI_API_KEY'
  },
  deepgram: {
    name: 'Deepgram',
    endpoint: 'https://api.deepgram.com/v1/listen',
    requiresKey: 'DEEPGRAM_API_KEY'
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  try {
    const { entry_id, user_id, provider = 'openai_whisper' } = req.body

    if (!entry_id || !user_id) {
      return res.status(400).json({ error: 'entry_id and user_id are required' })
    }

    // Get the journal entry
    const { data: entry, error: fetchError } = await getSupabase()
      .from('journal_entries')
      .select('*')
      .eq('id', entry_id)
      .eq('user_id', user_id)
      .single()

    if (fetchError || !entry) {
      return res.status(404).json({ error: 'Journal entry not found' })
    }

    if (!entry.audio_file_path) {
      return res.status(400).json({ error: 'No audio file associated with this entry' })
    }

    // Update status to processing
    await getSupabase()
      .from('journal_entries')
      .update({ 
        transcription_status: 'processing',
        transcription_provider: provider 
      })
      .eq('id', entry_id)

    // Get the audio file from storage
    const { data: audioData, error: downloadError } = await getSupabase()
      .storage
      .from('journal_audio')
      .download(entry.audio_file_path)

    if (downloadError || !audioData) {
      await getSupabase()
        .from('journal_entries')
        .update({ transcription_status: 'failed' })
        .eq('id', entry_id)
      
      return res.status(500).json({ error: 'Failed to download audio file for transcription' })
    }

    // Transcribe based on provider
    let transcription: string | null = null
    let transcriptionError: string | null = null

    try {
      transcription = await transcribeAudio(audioData, provider, user_id)
    } catch (err: any) {
      transcriptionError = err.message
      console.error('Transcription error:', err)
    }

    if (transcription) {
      // Update entry with transcription
      const { error: updateError } = await getSupabase()
        .from('journal_entries')
        .update({
          transcription,
          transcription_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', entry_id)

      if (updateError) {
        console.error('Error saving transcription:', updateError)
        return res.status(500).json({ error: 'Failed to save transcription' })
      }

      return res.status(200).json({
        success: true,
        transcription,
        message: 'Transcription completed successfully'
      })
    } else {
      // Mark as failed
      await getSupabase()
        .from('journal_entries')
        .update({ transcription_status: 'failed' })
        .eq('id', entry_id)

      return res.status(500).json({
        error: 'Transcription failed',
        details: transcriptionError || 'Unknown error'
      })
    }

  } catch (error: any) {
    console.error('Transcription API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function transcribeAudio(audioBlob: Blob, provider: string, userId?: string): Promise<string> {
  // Check if we have the API key for the provider
  const providerConfig = TRANSCRIPTION_PROVIDERS[provider as keyof typeof TRANSCRIPTION_PROVIDERS]
  
  if (!providerConfig) {
    throw new Error(`Unknown transcription provider: ${provider}`)
  }

  // Map provider to profile API key field name
  const providerKeyMap: Record<string, string> = {
    'openai_whisper': 'openai_api_key',
    'google_speech': 'google_speech_api_key',
    'assemblyai': 'assemblyai_api_key',
    'deepgram': 'deepgram_api_key'
  }

  // Try to get API key from user profile first, then fall back to environment variable
  let apiKey: string | undefined = undefined
  
  if (userId) {
    try {
      const profileKeyField = providerKeyMap[provider]
      if (profileKeyField) {
        const { data: profile } = await getSupabase()
          .from('user_profile')
          .select(profileKeyField)
          .eq('user_id', userId)
          .single()
        
        if (profile && profile[profileKeyField]) {
          apiKey = profile[profileKeyField]
          console.log(`✅ Using ${providerConfig.name} API key from user profile`)
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch user profile for API key:', err)
    }
  }
  
  // Fall back to environment variable if no user key found
  if (!apiKey) {
    apiKey = process.env[providerConfig.requiresKey]
    if (apiKey) {
      console.log(`✅ Using ${providerConfig.name} API key from environment variable`)
    }
  }
  
  if (!apiKey) {
    // Fallback: Return placeholder for demo/development
    console.warn(`No API key found for ${provider}. Using placeholder transcription.`)
    const message = userId 
      ? `[Transcription placeholder - ${providerConfig.name} API key not configured]\n\nTo enable real transcription, add your API key in Profile Settings.\n\nAudio duration: ${Math.round(audioBlob.size / 1000)}KB`
      : `[Transcription placeholder - ${providerConfig.name} API key not configured]\n\nTo enable real transcription, add ${providerConfig.requiresKey} to your environment variables.\n\nAudio duration: ${Math.round(audioBlob.size / 1000)}KB`
    return message
  }

  // OpenAI Whisper transcription
  if (provider === 'openai_whisper') {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI transcription failed')
    }

    const result = await response.json()
    return result.text
  }

  // AssemblyAI transcription
  if (provider === 'assemblyai') {
    // First upload the audio
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream'
      },
      body: audioBlob
    })

    if (!uploadResponse.ok) {
      throw new Error('AssemblyAI upload failed')
    }

    const { upload_url } = await uploadResponse.json()

    // Request transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: upload_url,
        sentiment_analysis: true
      })
    })

    if (!transcriptResponse.ok) {
      throw new Error('AssemblyAI transcription request failed')
    }

    const { id: transcriptId } = await transcriptResponse.json()

    // Poll for completion
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { 'Authorization': apiKey }
      })

      const pollResult = await pollResponse.json()

      if (pollResult.status === 'completed') {
        return pollResult.text
      } else if (pollResult.status === 'error') {
        throw new Error(pollResult.error || 'AssemblyAI transcription error')
      }

      // Wait 5 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
    }

    throw new Error('Transcription timed out')
  }

  // Deepgram transcription
  if (provider === 'deepgram') {
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'audio/webm'
      },
      body: audioBlob
    })

    if (!response.ok) {
      throw new Error('Deepgram transcription failed')
    }

    const result = await response.json()
    return result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
  }

  throw new Error(`Transcription not implemented for provider: ${provider}`)
}
