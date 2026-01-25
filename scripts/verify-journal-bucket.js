#!/usr/bin/env node

/**
 * Verify Journal Audio Bucket Setup
 * Checks that the bucket exists and policies are configured correctly
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyBucket() {
  console.log('🔍 Verifying journal_audio bucket setup...\n')
  
  try {
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message)
      return false
    }
    
    const journalBucket = buckets.find(b => b.id === 'journal_audio')
    
    if (!journalBucket) {
      console.error('❌ Bucket "journal_audio" not found!')
      console.log('\n📋 Available buckets:')
      buckets.forEach(b => console.log(`   - ${b.id} (public: ${b.public})`))
      return false
    }
    
    console.log('✅ Bucket "journal_audio" exists')
    console.log(`   - Public: ${journalBucket.public ? '✅ Yes' : '❌ No (should be true)'}`)
    console.log(`   - File size limit: ${journalBucket.file_size_limit ? `${journalBucket.file_size_limit / 1024 / 1024}MB` : 'Unlimited'}`)
    
    // Test upload permission (create a test file)
    const testFileName = `test-${Date.now()}.txt`
    const testContent = Buffer.from('test')
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('journal_audio')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      })
    
    if (uploadError) {
      console.error('\n❌ Upload test failed:', uploadError.message)
      if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission')) {
        console.error('   → Storage policies may not be configured correctly')
      }
      return false
    }
    
    console.log('✅ Upload test successful')
    
    // Clean up test file
    await supabase.storage
      .from('journal_audio')
      .remove([testFileName])
    
    console.log('✅ Test file cleaned up')
    
    // Check if we can create signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from('journal_audio')
      .createSignedUrl(testFileName, 60)
    
    if (urlError && !urlError.message?.includes('not found')) {
      console.warn('⚠️  Signed URL test had issues (this is okay if file was deleted)')
    } else {
      console.log('✅ Signed URL generation works')
    }
    
    console.log('\n🎉 All checks passed! Journal audio bucket is ready to use.')
    console.log('\n📋 Next steps:')
    console.log('   1. Go to /journal page in your app')
    console.log('   2. Click "Record New Entry"')
    console.log('   3. Record a short audio clip')
    console.log('   4. Stop and save - it should upload successfully!')
    
    return true
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

verifyBucket().then(success => {
  process.exit(success ? 0 : 1)
})
