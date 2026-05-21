#!/usr/bin/env node
/**
 * Quick check after enabling RLS on mbb_settings / user_settings:
 * - Service-role client must still query (same path as Next.js API routes).
 * - Anon client without JWT should not read arbitrary rows (RLS enforced for PostgREST).
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !serviceKey || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const service = createClient(url, serviceKey)
const anon = createClient(url, anonKey)

async function main() {
  const tables = ['mbb_settings', 'user_settings']

  console.log('Service role (expects success if table exists)')
  for (const t of tables) {
    const { data, error } = await service.from(t).select('*').limit(1)
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.log(`  ${t}: skipped (table not present)`)
      continue
    }
    if (error) {
      console.error(`  ${t}: FAIL`, error.message)
      process.exit(1)
    }
    console.log(`  ${t}: OK (${data?.length ?? 0} sample row(s))`)
  }

  console.log('')
  console.log('Anon without session (expects no rows — RLS blocks access to others’ data)')
  for (const t of tables) {
    const { data, error } = await anon.from(t).select('*').limit(5)
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.log(`  ${t}: skipped (table not present)`)
      continue
    }
    if (error) {
      console.error(`  ${t}: unexpected error`, error.message)
      process.exit(1)
    }
    if (data?.length === 0) {
      console.log(`  ${t}: OK — 0 rows (RLS behaving for unauthenticated anon)`)
    } else {
      console.warn(
        `  ${t}: ⚠️ anon returned ${data.length} row(s); check grants/policies if this table should not be public without auth.`,
      )
    }
  }

  console.log('')
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
