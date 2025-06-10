import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// API Verification Functions
export const verifySupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('boards').select('count').limit(1)
    if (error) throw error
    return { success: true, message: 'Database connection verified' }
  } catch (error) {
    return { success: false, message: `Connection failed: ${error.message}` }
  }
}

export const verifyDatabaseOperations = async () => {
  try {
    // Test board creation
    const { data: boardData, error: boardError } = await supabase
      .from('boards')
      .insert({ name: 'Test Board', description: 'API Verification Test' })
      .select()
      .single()

    if (boardError) throw boardError

    // Test column creation
    const { data: columnData, error: columnError } = await supabase
      .from('columns')
      .insert({ 
        board_id: boardData.id, 
        name: 'Test Column', 
        position: 0 
      })
      .select()
      .single()

    if (columnError) throw columnError

    // Test card creation
    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .insert({
        column_id: columnData.id,
        title: 'Test Card',
        description: 'API Verification Test Card',
        position: 0
      })
      .select()
      .single()

    if (cardError) throw cardError

    // Cleanup test data
    await supabase.from('boards').delete().eq('id', boardData.id)

    return { 
      success: true, 
      message: 'All database operations verified successfully' 
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Database operations failed: ${error.message}` 
    }
  }
}
