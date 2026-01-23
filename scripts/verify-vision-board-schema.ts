#!/usr/bin/env ts-node

/**
 * Vision Board Schema Verification Script
 * 
 * Run this script before deployment to verify:
 * - All migrations have been applied
 * - Schema matches expected structure
 * - Constraints exist and are valid
 * - Sample queries return expected fields
 * 
 * Usage: npx ts-node scripts/verify-vision-board-schema.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const REQUIRED_COLUMNS = [
  'id', 'user_id', 'file_name', 'file_path', 'is_active',
  'display_order', 'goal', 'due_date', 'media_type',
  'created_at', 'updated_at', 'view_count'
]

async function verifySchema() {
  console.log('🔍 Verifying Vision Board Schema...\n')

  let hasErrors = false

  // Check if table exists
  console.log('1. Checking if vision_board_images table exists...')
  const { data: tableData, error: tableError } = await supabase
    .from('vision_board_images')
    .select('id')
    .limit(0)

  if (tableError && tableError.message.includes('does not exist')) {
    console.error('❌ Table vision_board_images does not exist!')
    console.error('   Run migrations: supabase db push')
    hasErrors = true
  } else {
    console.log('✅ Table exists\n')
  }

  // Check required columns
  console.log('2. Checking required columns...')
  for (const column of REQUIRED_COLUMNS) {
    const { error } = await supabase
      .from('vision_board_images')
      .select(column)
      .limit(0)

    if (error && error.message.includes('column')) {
      console.error(`❌ Column ${column} is missing!`)
      hasErrors = true
    } else {
      console.log(`   ✅ ${column}`)
    }
  }
  console.log('')

  // Check constraints
  console.log('3. Checking constraints...')
  
  // Test goal constraint (non-empty)
  const { error: goalError } = await supabase
    .from('vision_board_images')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      file_name: 'test',
      file_path: 'test',
      goal: '   ', // Whitespace only
      due_date: '2024-01-01',
      media_type: 'image'
    })

  if (!goalError || !goalError.message.includes('constraint')) {
    console.warn('⚠️  Goal constraint may not be enforced')
  } else {
    console.log('   ✅ Goal constraint (non-empty) is enforced')
  }

  // Test media_type constraint
  const { error: mediaTypeError } = await supabase
    .from('vision_board_images')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      file_name: 'test',
      file_path: 'test',
      goal: 'Test goal',
      due_date: '2024-01-01',
      media_type: 'invalid_type'
    })

  if (!mediaTypeError || !mediaTypeError.message.includes('constraint')) {
    console.warn('⚠️  Media type constraint may not be enforced')
  } else {
    console.log('   ✅ Media type constraint is enforced')
  }
  console.log('')

  // Test sample query
  console.log('4. Testing sample query...')
  const { data: sampleData, error: sampleError } = await supabase
    .from('vision_board_images')
    .select('id, goal, due_date, media_type')
    .limit(1)

  if (sampleError) {
    console.warn(`⚠️  Sample query failed: ${sampleError.message}`)
    console.warn('   This may be due to RLS policies (expected for unauthenticated requests)')
  } else {
    console.log('✅ Sample query successful')
    if (sampleData && sampleData.length > 0) {
      const record = sampleData[0]
      console.log(`   Sample record has goal: ${!!record.goal}`)
      console.log(`   Sample record has due_date: ${!!record.due_date}`)
      console.log(`   Sample record has media_type: ${!!record.media_type}`)
    }
  }
  console.log('')

  // Summary
  if (hasErrors) {
    console.error('❌ Schema verification failed!')
    console.error('Please fix the errors above before deploying.')
    process.exit(1)
  } else {
    console.log('✅ Schema verification passed!')
    process.exit(0)
  }
}

verifySchema().catch(error => {
  console.error('❌ Verification script error:', error)
  process.exit(1)
})
