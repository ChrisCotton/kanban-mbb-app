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

export interface JournalEntry {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  audio_file_path: string | null
  audio_duration: number | null
  audio_file_size: number | null
  transcription: string | null
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed'
  transcription_provider: string | null
  use_audio_for_insights: boolean
  use_transcript_for_insights: boolean
  sentiment_score: number | null
  sentiment_label: string | null
  tags: string[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getJournalEntries(req, res)
      case 'POST':
        return await createJournalEntry(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error: any) {
    console.error('Journal API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

async function getJournalEntries(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, limit = '50', offset = '0' } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const { data: entries, error } = await getSupabase()
    .from('journal_entries')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1)

  if (error) {
    console.error('Error fetching journal entries:', error)
    return res.status(500).json({ error: 'Failed to fetch journal entries' })
  }

  return res.status(200).json({
    success: true,
    data: entries,
    count: entries?.length || 0
  })
}

async function createJournalEntry(req: NextApiRequest, res: NextApiResponse) {
  const { 
    user_id, 
    title, 
    audio_file_path,
    audio_duration,
    audio_file_size,
    transcription,
    transcription_status = 'pending',
    use_audio_for_insights = true,
    use_transcript_for_insights = true,
    tags = []
  } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const entryData = {
    user_id,
    title: title || `Journal Entry ${new Date().toLocaleDateString()}`,
    audio_file_path,
    audio_duration,
    audio_file_size,
    transcription,
    transcription_status,
    use_audio_for_insights,
    use_transcript_for_insights,
    tags
  }

  const { data: entry, error } = await getSupabase()
    .from('journal_entries')
    .insert(entryData)
    .select()
    .single()

  if (error) {
    console.error('Error creating journal entry:', error)
    return res.status(500).json({ error: 'Failed to create journal entry', details: error.message })
  }

  return res.status(201).json({
    success: true,
    data: entry,
    message: 'Journal entry created successfully'
  })
}
