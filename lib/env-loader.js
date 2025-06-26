const path = require('path')
const fs = require('fs')

// Function to load environment variables consistently
function loadEnv() {
  const projectRoot = process.cwd()
  const envLocalPath = path.join(projectRoot, '.env.local')
  
  console.log('Loading environment from:', envLocalPath)
  console.log('File exists:', fs.existsSync(envLocalPath))
  
  // Load dotenv with explicit path
  require('dotenv').config({ path: envLocalPath })
  
  // Verify critical variables are loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('Environment loaded:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'MISSING')
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Critical environment variables missing!')
    console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')))
    process.exit(1)
  }
  
  return {
    supabaseUrl,
    supabaseKey
  }
}

// Create Supabase client with loaded environment
function createSupabaseClient() {
  const { supabaseUrl, supabaseKey } = loadEnv()
  const { createClient } = require('@supabase/supabase-js')
  
  return createClient(supabaseUrl, supabaseKey)
}

module.exports = {
  loadEnv,
  createSupabaseClient
} 