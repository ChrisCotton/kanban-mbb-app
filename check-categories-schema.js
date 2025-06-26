require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
  console.log('Checking categories table schema...')
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  try {
    // Let's check directly using SQL
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Error selecting from categories:', error)
    } else {
      console.log('Categories select works. Sample result:', data)
    }
    
    // Also try to describe the table structure
    const { data: columns, error: colError } = await supabase
      .rpc('sql', {
        query: `\\d categories`
      })
    
    if (colError) {
      console.log('Could not get detailed schema, trying alternative...')
      // Try a simple insert test to see what fields are expected
      const { error: insertError } = await supabase
        .from('categories')
        .insert({
          name: 'test_schema_check',
          created_by: 'test123'
        })
        .select()
      
      if (insertError) {
        console.log('Insert test error:', insertError)
      } else {
        console.log('Basic insert test passed')
      }
    } else {
      console.log('Table structure:', columns)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkSchema()
