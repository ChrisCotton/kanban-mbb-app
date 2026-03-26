/**
 * List Supabase Auth users (email, last sign-in, id).
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   node scripts/list-auth-users.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  )
  process.exit(1)
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const all = []
  let page = 1
  const perPage = 200

  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error(error.message)
      process.exit(1)
    }
    const batch = data.users || []
    all.push(...batch)
    if (batch.length < perPage) break
    page += 1
  }

  const rows = all.map((u) => ({
    email: u.email,
    last_sign_in_at: u.last_sign_in_at,
    created_at: u.created_at,
    id: u.id,
  }))

  rows.sort((a, b) => {
    const ta = a.last_sign_in_at ? Date.parse(a.last_sign_in_at) : 0
    const tb = b.last_sign_in_at ? Date.parse(b.last_sign_in_at) : 0
    return tb - ta
  })

  console.log(`Found ${rows.length} user(s). Most recent sign-in first:\n`)
  console.table(rows)
}

main()
