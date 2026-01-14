#!/usr/bin/env node
/**
 * Diagnostic Script: Category Display Issue
 * 
 * Investigates why "MBB DEVELOPMENT" category is not showing in the list
 */

const PORT = process.env.PORT || 3000
const API_BASE = `http://localhost:${PORT}`

async function diagnose() {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 CATEGORY DISPLAY DIAGNOSTIC')
  console.log('='.repeat(70) + '\n')

  // 1. Check if category exists via API
  console.log('1️⃣ Fetching all categories from API...')
  const response = await fetch(`${API_BASE}/api/categories`)
  const data = await response.json()
  
  if (!data.success) {
    console.error('❌ API call failed:', data.error)
    process.exit(1)
  }
  
  console.log(`✓ Found ${data.data.length} categories total\n`)
  
  // 2. List all categories
  console.log('📋 All Categories:')
  console.log('-'.repeat(70))
  data.data.forEach((cat, index) => {
    console.log(`${index + 1}. ${cat.name}`)
    console.log(`   ID: ${cat.id}`)
    console.log(`   Rate: $${cat.hourly_rate}/hr`)
    console.log(`   Active: ${cat.is_active}`)
    console.log(`   Created: ${cat.created_at}`)
    console.log(`   Owner: ${cat.created_by}`)
    console.log()
  })
  
  // 3. Search for "MBB DEVELOPMENT"
  console.log('🔎 Searching for "MBB DEVELOPMENT"...')
  const mbbCategory = data.data.find(cat => cat.name === 'MBB DEVELOPMENT')
  
  if (mbbCategory) {
    console.log('✅ FOUND "MBB DEVELOPMENT" in API response!')
    console.log(JSON.stringify(mbbCategory, null, 2))
    
    // Check if there's anything unusual
    if (!mbbCategory.is_active) {
      console.log('\n⚠️  WARNING: Category is_active = false')
      console.log('   This might be filtered out in the UI')
    }
    
    if (!mbbCategory.created_by) {
      console.log('\n⚠️  WARNING: Category has no created_by (owner)')
      console.log('   This might cause authorization issues')
    }
  } else {
    console.log('❌ NOT FOUND "MBB DEVELOPMENT" in API response')
    console.log('\nPossible names that might match:')
    data.data.forEach(cat => {
      if (cat.name.toLowerCase().includes('mbb') || cat.name.toLowerCase().includes('development')) {
        console.log(`   - "${cat.name}"`)
      }
    })
  }
  
  // 4. Try to create it
  console.log('\n4️⃣ Attempting to create "MBB DEVELOPMENT"...')
  const createResponse = await fetch(`${API_BASE}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'MBB DEVELOPMENT',
      hourly_rate_usd: '200',
    })
  })
  
  const createData = await createResponse.json()
  console.log(`Status: ${createResponse.status}`)
  console.log('Response:', JSON.stringify(createData, null, 2))
  
  if (createResponse.status === 400 && createData.error?.includes('already exists')) {
    console.log('\n✅ Confirmed: Category EXISTS in database (duplicate error)')
    console.log('   But it\'s not showing in the list above!')
    console.log('\n🐛 ISSUE IDENTIFIED: Category exists but not visible in UI')
  } else if (createResponse.status === 201) {
    console.log('\n✅ Category created successfully')
    console.log('   Check if it now appears in the categories list')
  }
  
  // 5. Check frontend hook behavior
  console.log('\n5️⃣ Recommendations:')
  console.log('─'.repeat(70))
  console.log('• Check if useCategories hook is filtering categories')
  console.log('• Check if there\'s client-side caching preventing refresh')
  console.log('• Verify category ownership matches current user')
  console.log('• Check browser localStorage for cached category data')
  console.log('• Verify API response includes all fields frontend expects')
  
  console.log('\n' + '='.repeat(70))
  console.log('🏁 Diagnostic Complete')
  console.log('='.repeat(70) + '\n')
}

diagnose().catch(error => {
  console.error('\n💥 Diagnostic failed:', error)
  process.exit(1)
})
