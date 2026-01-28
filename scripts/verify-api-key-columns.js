/**
 * Script to verify that API key columns exist in user_profile table
 * Run with: node scripts/verify-api-key-columns.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyColumns() {
  console.log('🔍 Checking user_profile table columns...\n');

  const requiredColumns = [
    'nano_banana_api_key',
    'google_ai_api_key',
    'openai_api_key',
    'google_speech_api_key',
    'assemblyai_api_key',
    'deepgram_api_key',
    'anthropic_claude_api_key',
    'google_gemini_api_key'
  ];

  try {
    // Try to select all columns including API keys
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .limit(1);

    if (error) {
      // Check if error is about missing columns
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        const missingColumnMatch = error.message?.match(/column "?(\w+)"? does not exist/i);
        const missingColumn = missingColumnMatch ? missingColumnMatch[1] : 'unknown';
        
        console.error(`❌ Column "${missingColumn}" does not exist!\n`);
        console.error('📋 Missing columns:');
        requiredColumns.forEach(col => {
          console.error(`   - ${col}`);
        });
        console.error('\n💡 To fix, run:');
        console.error('   supabase db push');
        console.error('   OR manually run: database/migrations/028_add_api_keys_to_user_profile.sql\n');
        process.exit(1);
      } else {
        console.error('❌ Error querying user_profile:', error.message);
        process.exit(1);
      }
    }

    // If we got here, the query succeeded
    console.log('✅ All API key columns exist!\n');
    console.log('📋 Verified columns:');
    requiredColumns.forEach(col => {
      console.log(`   ✓ ${col}`);
    });
    console.log('\n🎉 Migration appears to have run successfully!');
    console.log('💡 You can now save API keys in your profile.\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

verifyColumns();
