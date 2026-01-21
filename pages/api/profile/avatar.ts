import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import formidable, { File } from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

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

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${method} not allowed` })
  }

  try {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => {
        return mimetype ? ALLOWED_TYPES.includes(mimetype) : false
      }
    })

    const [fields, files] = await form.parse(req)
    
    const userId = fields.user_id?.[0]
    const avatarFile = files.avatar?.[0] as File | undefined

    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    if (!avatarFile) {
      return res.status(400).json({ error: 'No avatar file provided' })
    }

    // Validate file type
    if (!avatarFile.mimetype || !ALLOWED_TYPES.includes(avatarFile.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' 
      })
    }

    // Read file
    const fileBuffer = fs.readFileSync(avatarFile.filepath)
    const fileExtension = path.extname(avatarFile.originalFilename || '.jpg') || '.jpg'
    const fileName = `${userId}/avatar${fileExtension}`

    // Delete old avatar if exists
    const { data: existingFiles, error: listError } = await getSupabase().storage
      .from('avatars')
      .list(userId)
    
    if (listError) {
      console.error('Error listing avatars bucket:', listError)
      // If bucket doesn't exist, provide helpful message
      if (listError.message?.includes('not found') || listError.message?.includes('Bucket')) {
        return res.status(500).json({
          error: 'Storage bucket "avatars" not found. Please create it in Supabase Dashboard > Storage > New Bucket (name: avatars, public: true)',
          details: listError.message
        })
      }
    }

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`)
      await getSupabase().storage.from('avatars').remove(filesToDelete)
    }

    // Upload new avatar
    const { data: uploadData, error: uploadError } = await getSupabase().storage
      .from('avatars')
      .upload(fileName, fileBuffer, {
        contentType: avatarFile.mimetype,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      // Check for specific error types
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket')) {
        return res.status(500).json({ 
          error: 'Storage bucket "avatars" not found. Please create it in Supabase Dashboard > Storage.',
          details: uploadError.message
        })
      }
      return res.status(500).json({ 
        error: 'Failed to upload avatar', 
        details: uploadError.message 
      })
    }

    // Get public URL
    const { data: urlData } = getSupabase().storage
      .from('avatars')
      .getPublicUrl(fileName)

    const avatarUrl = urlData.publicUrl

    // Update user profile with avatar URL
    const { error: updateError } = await getSupabase()
      .from('user_profile')
      .upsert({
        user_id: userId,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      console.error('Error updating profile with avatar:', updateError)
      return res.status(500).json({ error: 'Failed to update profile' })
    }

    // Clean up temp file
    fs.unlinkSync(avatarFile.filepath)

    return res.status(200).json({
      success: true,
      avatar_url: avatarUrl,
      message: 'Avatar uploaded successfully'
    })

  } catch (error: any) {
    console.error('Avatar upload error:', error)
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max 5MB allowed.' })
    }
    
    return res.status(500).json({
      error: 'Failed to process avatar upload',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
