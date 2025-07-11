import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  try {
    // Since we're having database issues, let's provide a simple solution
    // You can manually set your user ID here temporarily
    
    // Try to get user from current auth session first
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (user) {
      return res.status(200).json({
        user_id: user.id,
        email: user.email,
        source: 'auth_session'
      })
    }
    
    // If no auth session, provide a temporary solution
    // You'll need to replace this with your actual user ID
    const TEMP_USER_ID = 'REPLACE_WITH_YOUR_USER_ID'
    
    return res.status(200).json({
      user_id: TEMP_USER_ID,
      source: 'temporary_hardcoded',
      message: 'Replace TEMP_USER_ID with your actual user ID from Supabase auth',
      instructions: [
        '1. Go to your Supabase project dashboard',
        '2. Navigate to Authentication > Users',
        '3. Copy your user ID from there',
        '4. Use that ID in your n8n workflow'
      ]
    })
    
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
} 