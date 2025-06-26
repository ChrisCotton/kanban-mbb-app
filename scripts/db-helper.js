const { createSupabaseClient } = require('../lib/env-loader')

class DatabaseHelper {
  constructor() {
    this.supabase = createSupabaseClient()
  }

  // Test basic database connectivity
  async testConnection() {
    console.log('Testing database connection...')
    
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('id')
        .limit(1)
      
      if (error) {
        console.error('Connection test failed:', error)
        return false
      }
      
      console.log('✅ Database connection successful')
      return true
    } catch (err) {
      console.error('❌ Database connection failed:', err)
      return false
    }
  }

  // Run SQL directly (for migrations)
  async runSQL(query, description = 'SQL Query') {
    console.log(`\n🔧 Running: ${description}`)
    console.log(`SQL: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`)
    
    try {
      const { data, error } = await this.supabase.rpc('sql', { query })
      
      if (error) {
        console.error(`❌ ${description} failed:`, error)
        return { success: false, error }
      }
      
      console.log(`✅ ${description} completed successfully`)
      return { success: true, data }
    } catch (err) {
      console.error(`❌ ${description} failed:`, err)
      return { success: false, error: err }
    }
  }

  // Check if table exists
  async tableExists(tableName) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('id')
        .limit(1)
      
      return !error
    } catch (err) {
      return false
    }
  }

  // Check table schema
  async getTableSchema(tableName) {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
      ORDER BY ordinal_position;
    `
    
    return await this.runSQL(query, `Get schema for ${tableName}`)
  }
}

module.exports = DatabaseHelper 