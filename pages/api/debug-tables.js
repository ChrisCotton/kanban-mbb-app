import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check categories table structure
    const { data: categoriesInfo, error: categoriesError } = await supabase
      .rpc('get_table_columns', { table_name: 'categories' })

    const result = {
      categoriesTableExists: !categoriesError,
      categoriesError: categoriesError?.message || null,
      categoriesColumns: categoriesInfo || null
    }

    // Try to get categories table info using information_schema
    if (categoriesError) {
      const { data: schemaInfo, error: schemaError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'categories')
        .eq('table_schema', 'public')

      result.schemaQuery = {
        error: schemaError?.message || null,
        columns: schemaInfo || null
      }
    }

    // Try direct table query to see what exists
    const { data: categoriesData, error: queryError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)

    result.categoriesQueryTest = {
      error: queryError?.message || null,
      hasData: !!categoriesData,
      sampleData: categoriesData?.[0] || null
    }

    res.status(200).json(result)

  } catch (error) {
    res.status(500).json({
      error: 'Database query failed',
      details: error.message
    })
  }
} 