import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Test with service role key
    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Test basic connection
    const { data: testData, error: testError } = await supabaseServiceRole
      .from('categories')
      .select('count')
      .limit(1)

    const result = {
      serviceRoleKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      connectionTest: testError ? `ERROR: ${testError.message}` : 'SUCCESS',
      testData: testData
    }

    // Try to get table info
    try {
      const { data: tables, error: tablesError } = await supabaseServiceRole
        .rpc('get_table_names')
        .limit(10)
      
      result.tablesQuery = tablesError ? `ERROR: ${tablesError.message}` : tables
    } catch (e) {
      result.tablesQuery = `RPC not available: ${e.message}`
    }

    res.status(200).json(result)

  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed',
      details: error.message,
      serviceRoleKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL
    })
  }
} 