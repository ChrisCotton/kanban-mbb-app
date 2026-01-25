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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Entry ID is required' })
  }

  try {
    switch (method) {
      case 'GET':
        return await getJournalEntry(id, req, res)
      case 'PUT':
        return await updateJournalEntry(id, req, res)
      case 'DELETE':
        return await deleteJournalEntry(id, req, res)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
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

async function getJournalEntry(id: string, req: NextApiRequest, res: NextApiResponse) {
  const { data: entry, error } = await getSupabase()
    .from('journal_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Journal entry not found' })
    }
    console.error('Error fetching journal entry:', error)
    return res.status(500).json({ error: 'Failed to fetch journal entry' })
  }

  return res.status(200).json({
    success: true,
    data: entry
  })
}

async function updateJournalEntry(id: string, req: NextApiRequest, res: NextApiResponse) {
  const { user_id, ...updateData } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  // Allowed fields to update
  const allowedFields = [
    'title',
    'transcription',
    'transcription_status',
    'transcription_provider',
    'use_audio_for_insights',
    'use_transcript_for_insights',
    'sentiment_score',
    'sentiment_label',
    'tags',
    'audio_file_path',
    'audio_duration',
    'audio_file_size'
  ]

  const filteredData: Record<string, any> = {}
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field]
    }
  }

  if (Object.keys(filteredData).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  // Log what's being updated (without sensitive data)
  console.log('📝 Updating journal entry:', id, 'Fields:', Object.keys(filteredData))
  
  filteredData.updated_at = new Date().toISOString()

  const { data: entry, error } = await getSupabase()
    .from('journal_entries')
    .update(filteredData)
    .eq('id', id)
    .eq('user_id', user_id) // Ensure user owns the entry
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating journal entry:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Journal entry not found or access denied' })
    }
    
    return res.status(500).json({ 
      error: 'Failed to update journal entry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }

  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found or access denied' })
  }

  console.log('✅ Journal entry updated successfully:', id)

  return res.status(200).json({
    success: true,
    data: entry,
    message: 'Journal entry updated successfully'
  })
}

async function deleteJournalEntry(id: string, req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  // First get the entry to delete associated audio file
  const { data: entry, error: fetchError } = await getSupabase()
    .from('journal_entries')
    .select('audio_file_path')
    .eq('id', id)
    .eq('user_id', user_id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Journal entry not found' })
    }
    console.error('Error fetching journal entry for delete:', fetchError)
    return res.status(500).json({ error: 'Failed to delete journal entry' })
  }

  // Delete audio file from storage if exists
  if (entry?.audio_file_path) {
    const { error: storageError } = await getSupabase()
      .storage
      .from('journal_audio')
      .remove([entry.audio_file_path])
    
    if (storageError) {
      console.error('Error deleting audio file:', storageError)
      // Continue with entry deletion even if audio deletion fails
    }
  }

  // Delete the entry
  const { error: deleteError } = await getSupabase()
    .from('journal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id)

  if (deleteError) {
    console.error('Error deleting journal entry:', deleteError)
    return res.status(500).json({ error: 'Failed to delete journal entry' })
  }

  return res.status(200).json({
    success: true,
    message: 'Journal entry deleted successfully'
  })
}
