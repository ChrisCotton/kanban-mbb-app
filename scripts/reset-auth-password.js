/**
 * Reset a Supabase Auth user's password (service role).
 *
 *   node scripts/reset-auth-password.js <email> <new-password>
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-auth-password.js <email> <new-password>')
  process.exit(1)
}

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
  let page = 1
  const perPage = 200
  let found = null

  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error(error.message)
      process.exit(1)
    }
    const batch = data.users || []
    found = batch.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) break
    if (batch.length < perPage) break
    page += 1
  }

  if (!found) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  const { data: updated, error: updateErr } = await sb.auth.admin.updateUserById(
    found.id,
    { password: newPassword }
  )

  if (updateErr) {
    console.error(updateErr.message)
    process.exit(1)
  }

  console.log(`Password updated for ${updated.user.email} (${updated.user.id})`)
}

main()
