import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import formidable, { File } from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

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

const ALLOWED_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB for 30 min audio

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  try {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
    })

    const [fields, files] = await form.parse(req)
    
    console.log('📥 Audio upload request received')
    console.log('📥 Fields:', Object.keys(fields), 'Files:', Object.keys(files))
    console.log('📥 userId:', fields.user_id?.[0])
    console.log('📥 entryId:', fields.entry_id?.[0])
    console.log('📥 audio files:', files.audio ? files.audio.map(f => ({ name: f.originalFilename, size: f.size, type: f.mimetype })) : 'none')
    
    const userId = fields.user_id?.[0]
    const entryId = fields.entry_id?.[0]
    const duration = fields.duration?.[0]
    const audioFile = files.audio?.[0] as File | undefined

    if (!userId) {
      console.error('❌ Missing user_id')
      return res.status(400).json({ error: 'user_id is required' })
    }

    if (!audioFile) {
      console.error('❌ No audio file provided. Files received:', Object.keys(files))
      return res.status(400).json({ 
        error: 'No audio data provided',
        details: `Expected 'audio' field in form data. Received fields: ${Object.keys(files).join(', ') || 'none'}`
      })
    }

    console.log('✅ Audio file received:', {
      name: audioFile.originalFilename,
      size: audioFile.size,
      type: audioFile.mimetype,
      path: audioFile.filepath
    })

    // Validate file type
    if (!audioFile.mimetype || !ALLOWED_TYPES.includes(audioFile.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Allowed: WebM, MP4, MP3, OGG, WAV',
        received: audioFile.mimetype
      })
    }

    // Read file
    const fileBuffer = fs.readFileSync(audioFile.filepath)
    const fileExtension = audioFile.mimetype === 'audio/webm' ? '.webm' 
      : audioFile.mimetype === 'audio/mp4' ? '.m4a'
      : audioFile.mimetype === 'audio/mpeg' ? '.mp3'
      : audioFile.mimetype === 'audio/ogg' ? '.ogg'
      : '.wav'
    
    const fileName = `${userId}/${entryId || Date.now()}${fileExtension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await getSupabase().storage
      .from('journal_audio')
      .upload(fileName, fileBuffer, {
        contentType: audioFile.mimetype,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading audio:', uploadError)
      
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket')) {
        return res.status(500).json({
          error: 'Storage bucket "journal_audio" not found. Please create it in Supabase Dashboard > Storage.',
          details: uploadError.message
        })
      }
      
      return res.status(500).json({ 
        error: 'Failed to upload audio',
        details: uploadError.message
      })
    }

    // Get the file path
    const audioFilePath = uploadData.path

    // If we have an entry ID, update it with the audio info
    if (entryId) {
      const { error: updateError } = await getSupabase()
        .from('journal_entries')
        .update({
          audio_file_path: audioFilePath,
          audio_duration: duration ? parseInt(duration) : null,
          audio_file_size: fileBuffer.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating journal entry with audio:', updateError)
      }
    }

    // Clean up temp file
    fs.unlinkSync(audioFile.filepath)

    // Get signed URL for playback
    const { data: signedUrlData } = await getSupabase().storage
      .from('journal_audio')
      .createSignedUrl(audioFilePath, 3600) // 1 hour expiry

    return res.status(200).json({
      success: true,
      audio_file_path: audioFilePath,
      audio_url: signedUrlData?.signedUrl,
      file_size: fileBuffer.length,
      message: 'Audio uploaded successfully'
    })

  } catch (error: any) {
    console.error('Audio upload error:', error)
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max 100MB allowed.' })
    }
    
    return res.status(500).json({
      error: 'Failed to process audio upload',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
