#!/usr/bin/env node
/**
 * Script to verify that the earnings fix worked correctly
 * 
 * Checks:
 * 1. How many completed sessions now have earnings
 * 2. If any sessions still have NULL earnings (and why)
 * 3. Sample of backfilled data
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyEarningsFix() {
  console.log('🔍 Verifying earnings fix...\n')

  try {
    // 1. Check total completed sessions
    const { data: allCompleted, error: allError } = await supabase
      .from('time_sessions')
      .select('id, earnings_usd, hourly_rate_usd, category_id, duration_seconds, started_at, ended_at')
      .not('ended_at', 'is', null)
      .eq('is_active', false)

    if (allError) {
      console.error('❌ Error fetching completed sessions:', allError.message)
      return
    }

    const totalCompleted = allCompleted?.length || 0
    const withEarnings = allCompleted?.filter(s => s.earnings_usd !== null && s.earnings_usd > 0).length || 0
    const withNullEarnings = allCompleted?.filter(s => s.earnings_usd === null || s.earnings_usd === 0).length || 0

    console.log('📊 Summary:')
    console.log(`   Total completed sessions: ${totalCompleted}`)
    console.log(`   Sessions with earnings: ${withEarnings} (${totalCompleted > 0 ? Math.round((withEarnings / totalCompleted) * 100) : 0}%)`)
    console.log(`   Sessions without earnings: ${withNullEarnings}\n`)

    // 2. Analyze sessions without earnings
    if (withNullEarnings > 0) {
      console.log('⚠️  Sessions without earnings:')
      const nullEarnings = allCompleted?.filter(s => s.earnings_usd === null || s.earnings_usd === 0).slice(0, 10)
      
      for (const session of nullEarnings) {
        const duration = session.duration_seconds || 0
        const hasRate = session.hourly_rate_usd !== null && session.hourly_rate_usd > 0
        const hasCategory = session.category_id !== null
        
        let reason = 'Unknown'
        if (duration === 0) {
          reason = 'Zero duration'
        } else if (!hasRate && !hasCategory) {
          reason = 'No hourly rate and no category'
        } else if (!hasRate && hasCategory) {
          reason = 'No hourly rate (category lookup may have failed)'
        } else if (hasRate) {
          reason = 'Has rate but earnings still NULL (trigger may not have fired)'
        }

        console.log(`   - Session ${session.id.substring(0, 8)}...`)
        console.log(`     Duration: ${duration}s, Rate: ${session.hourly_rate_usd || 'NULL'}, Category: ${session.category_id ? 'Yes' : 'No'}`)
        console.log(`     Reason: ${reason}`)
      }
      console.log('')
    }

    // 3. Show sample of successful backfills
    const successfulBackfills = allCompleted
      ?.filter(s => s.earnings_usd !== null && s.earnings_usd > 0)
      .slice(0, 5)

    if (successfulBackfills && successfulBackfills.length > 0) {
      console.log('✅ Sample of sessions with earnings:')
      for (const session of successfulBackfills) {
        const hours = (session.duration_seconds || 0) / 3600
        const rate = session.hourly_rate_usd || 0
        const earnings = session.earnings_usd || 0
        console.log(`   - ${hours.toFixed(2)}h @ $${rate}/hr = $${earnings.toFixed(2)}`)
      }
      console.log('')
    }

    // 4. Check recent sessions (last 24 hours)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const { data: recentSessions } = await supabase
      .from('time_sessions')
      .select('earnings_usd, is_active')
      .gte('ended_at', oneDayAgo.toISOString())
      .eq('is_active', false)

    const recentTotal = recentSessions?.length || 0
    const recentWithEarnings = recentSessions?.filter(s => s.earnings_usd !== null && s.earnings_usd > 0).length || 0

    console.log('📅 Recent sessions (last 24 hours):')
    console.log(`   Total: ${recentTotal}`)
    console.log(`   With earnings: ${recentWithEarnings} (${recentTotal > 0 ? Math.round((recentWithEarnings / recentTotal) * 100) : 0}%)\n`)

    // 5. Overall assessment
    const coverage = totalCompleted > 0 ? (withEarnings / totalCompleted) * 100 : 0
    
    if (coverage >= 80) {
      console.log('✅ SUCCESS: Most sessions have earnings backfilled!')
      console.log(`   Coverage: ${Math.round(coverage)}%`)
    } else if (coverage >= 50) {
      console.log('⚠️  PARTIAL: Some sessions still need attention')
      console.log(`   Coverage: ${Math.round(coverage)}%`)
    } else {
      console.log('❌ ISSUE: Many sessions still missing earnings')
      console.log(`   Coverage: ${Math.round(coverage)}%`)
      console.log('   Check the reasons above and verify migrations ran correctly')
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message)
    console.error(error.stack)
  }
}

if (require.main === module) {
  verifyEarningsFix().catch(console.error)
}

module.exports = { verifyEarningsFix }
