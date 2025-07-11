#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function nuclearReset() {
  console.log('🔥 NUCLEAR RESET: Dropping all tables...')
  
  const tablesToDrop = [
    'weather_data',
    'vision_board_images', 
    'time_sessions',
    'tags',
    'task_tags',
    'subtasks',
    'comments',
    'tasks',
    'categories'
  ]
  
  for (const table of tablesToDrop) {
    try {
      const { error } = await supabase.rpc('exec', {
        query: `DROP TABLE IF EXISTS ${table} CASCADE;`
      })
      if (error) {
        console.log(`⚠️  Could not drop ${table}:`, error.message)
      } else {
        console.log(`✅ Dropped ${table}`)
      }
    } catch (e) {
      console.log(`⚠️  Could not drop ${table}:`, e.message)
    }
  }
  
  console.log('💥 Nuclear reset complete! Now run migrations.')
}

nuclearReset().catch(console.error) 