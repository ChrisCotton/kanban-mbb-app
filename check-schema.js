const DatabaseHelper = require('./scripts/db-helper')

async function checkSchema() {
  const db = new DatabaseHelper()
  
  // Test connection first
  const connected = await db.testConnection()
  if (!connected) {
    console.log('❌ Cannot connect to database')
    return
  }
  
  // Get categories table schema
  console.log('\n📋 Checking categories table schema...')
  const result = await db.getTableSchema('categories')
  
  if (result.success) {
    console.log('\n📊 Categories table columns:')
    console.table(result.data)
  } else {
    console.log('❌ Could not get schema:', result.error)
  }
  
  // Also check what a simple select returns
  console.log('\n🔍 Testing simple select...')
  try {
    const { data, error } = await db.supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('Select error:', error)
    } else {
      console.log('Select successful, columns available:', Object.keys(data[0] || {}))
    }
  } catch (err) {
    console.log('Select failed:', err.message)
  }
}

checkSchema().then(() => {
  console.log('\n✅ Schema check complete')
  process.exit(0)
}).catch(err => {
  console.error('❌ Schema check failed:', err)
  process.exit(1)
}) 