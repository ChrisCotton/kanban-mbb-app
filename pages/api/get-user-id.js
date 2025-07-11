import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ error: 'Failed to fetch users', details: error.message })
    }
    
    if (data.users && data.users.length > 0) {
      const user = data.users[0]
      return res.status(200).json({
        user_id: user.id,
        email: user.email,
        created_at: user.created_at
      })
    } else {
      return res.status(404).json({ error: 'No users found' })
    }
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
} 