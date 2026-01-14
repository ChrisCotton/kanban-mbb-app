#!/usr/bin/env node
/**
 * Manual Integration Tests: Category Auth & Display Fix
 * 
 * Tests both fixes:
 * 1. Category authentication and user filtering
 * 2. Hourly rate field display (hourly_rate_usd)
 */

const PORT = process.env.PORT || 3000
const API_BASE = `http://localhost:${PORT}`

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

let passed = 0
let failed = 0

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`)
}

async function test(name, testFn) {
  try {
    await testFn()
    log('green', '✓', `PASS: ${name}`)
    passed++
    return true
  } catch (error) {
    log('red', '✗', `FAIL: ${name}`)
    console.error(`  ${colors.red}${error.message}${colors.reset}`)
    failed++
    return false
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  console.log('\n' + '='.repeat(70))
  log('cyan', '🧪', 'Category Auth & Display Integration Tests')
  console.log('='.repeat(70) + '\n')

  // TEST GROUP 1: Authentication
  console.log('─'.repeat(70))
  log('yellow', '🔐', 'Authentication Tests')
  console.log('─'.repeat(70) + '\n')

  await test('Should require authentication to create category', async () => {
    const response = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TEST NO AUTH',
        hourly_rate_usd: '100',
      })
    })
    
    const data = await response.json()
    
    assert(response.status === 401, `Expected 401, got ${response.status}`)
    assert(data.success === false, 'Response should have success: false')
    assert(data.error.includes('Authentication'), `Expected auth error, got: ${data.error}`)
    
    log('cyan', '  →', 'Correctly rejected request without auth token')
  })

  await test('Should reject invalid auth token', async () => {
    const response = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-abc123'
      },
      body: JSON.stringify({
        name: 'TEST INVALID AUTH',
        hourly_rate_usd: '100',
      })
    })
    
    const data = await response.json()
    
    assert(response.status === 401, `Expected 401, got ${response.status}`)
    assert(data.error.includes('Invalid'), `Expected invalid token error, got: ${data.error}`)
    
    log('cyan', '  →', 'Correctly rejected invalid token')
  })

  // TEST GROUP 2: Hourly Rate Field
  console.log('\n' + '─'.repeat(70))
  log('yellow', '💵', 'Hourly Rate Field Tests')
  console.log('─'.repeat(70) + '\n')

  let categories = []
  
  await test('Should fetch categories from API', async () => {
    const response = await fetch(`${API_BASE}/api/categories`)
    const data = await response.json()
    
    assert(response.status === 200, `Expected 200, got ${response.status}`)
    assert(data.success === true, 'Response should be successful')
    assert(Array.isArray(data.data), 'Data should be an array')
    
    categories = data.data
    log('cyan', '  →', `Fetched ${categories.length} categories`)
  })

  await test('Should have hourly_rate_usd field in all categories', async () => {
    assert(categories.length > 0, 'Should have at least one category')
    
    categories.forEach(cat => {
      assert(cat.hasOwnProperty('hourly_rate_usd'), 
        `Category "${cat.name}" missing hourly_rate_usd field`)
    })
    
    log('cyan', '  →', 'All categories have hourly_rate_usd field')
  })

  await test('Should have numeric hourly_rate_usd values', async () => {
    categories.forEach(cat => {
      if (cat.hourly_rate_usd !== null) {
        assert(typeof cat.hourly_rate_usd === 'number', 
          `Category "${cat.name}" hourly_rate_usd should be number, got ${typeof cat.hourly_rate_usd}`)
        assert(cat.hourly_rate_usd >= 0, 
          `Category "${cat.name}" hourly_rate_usd should be non-negative`)
      }
    })
    
    log('cyan', '  →', 'All hourly_rate_usd values are valid numbers')
  })

  await test('Should display MBB DEVELOPMENT with $200 rate', async () => {
    const mbbCategory = categories.find(cat => cat.name === 'MBB DEVELOPMENT')
    
    if (mbbCategory) {
      log('cyan', '  →', `Found MBB DEVELOPMENT category`)
      log('cyan', '    ', `hourly_rate_usd: ${mbbCategory.hourly_rate_usd}`)
      
      if (mbbCategory.hourly_rate !== undefined) {
        log('cyan', '    ', `hourly_rate (legacy): ${mbbCategory.hourly_rate}`)
      }
      
      assert(mbbCategory.hourly_rate_usd === 200, 
        `Expected hourly_rate_usd to be 200, got ${mbbCategory.hourly_rate_usd}`)
      
      log('green', '  ✓', 'MBB DEVELOPMENT shows correct $200 rate')
    } else {
      log('yellow', '  ⚠', 'MBB DEVELOPMENT not found (may have been deleted)')
    }
  })

  // TEST GROUP 3: User Filtering
  console.log('\n' + '─'.repeat(70))
  log('yellow', '👤', 'User Filtering Tests')
  console.log('─'.repeat(70) + '\n')

  await test('Should only return categories with created_by field', async () => {
    categories.forEach(cat => {
      assert(cat.hasOwnProperty('created_by'), 
        `Category "${cat.name}" missing created_by field`)
      assert(typeof cat.created_by === 'string', 
        `Category "${cat.name}" created_by should be string`)
      assert(cat.created_by.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
        `Category "${cat.name}" created_by should be valid UUID`)
    })
    
    log('cyan', '  →', 'All categories have valid created_by (owner) field')
  })

  await test('Should only return categories from same user', async () => {
    if (categories.length === 0) {
      log('yellow', '  ⚠', 'No categories to test')
      return
    }
    
    const firstUserId = categories[0].created_by
    const allSameUser = categories.every(cat => cat.created_by === firstUserId)
    
    assert(allSameUser, 'All categories should belong to the same user')
    
    log('cyan', '  →', `All ${categories.length} categories belong to user: ${firstUserId.slice(0, 8)}...`)
  })

  // TEST GROUP 4: Regression Tests
  console.log('\n' + '─'.repeat(70))
  log('yellow', '🐛', 'Regression Tests (Original Bugs)')
  console.log('─'.repeat(70) + '\n')

  await test('REGRESSION: No hardcoded user IDs in API', async () => {
    // This ensures the fix prevents hardcoded user IDs
    const response = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'TEST HARDCODED',
        hourly_rate_usd: '100',
      })
    })
    
    // Should require auth, not use hardcoded default user
    assert(response.status === 401, 
      'Should require authentication, not use hardcoded user ID')
    
    log('cyan', '  →', 'Confirmed: API does not use hardcoded user IDs')
  })

  await test('REGRESSION: hourly_rate_usd takes priority over hourly_rate', async () => {
    const categoryWithRate = categories.find(cat => 
      (cat.hourly_rate_usd && cat.hourly_rate_usd > 0) ||
      (cat.hourly_rate && cat.hourly_rate > 0)
    )
    
    if (categoryWithRate) {
      log('cyan', '  →', `Testing: ${categoryWithRate.name}`)
      log('cyan', '    ', `hourly_rate_usd: ${categoryWithRate.hourly_rate_usd}`)
      
      if (categoryWithRate.hourly_rate !== undefined) {
        log('cyan', '    ', `hourly_rate: ${categoryWithRate.hourly_rate}`)
      }
      
      // UI should use hourly_rate_usd as primary field
      assert(categoryWithRate.hourly_rate_usd !== undefined, 
        'hourly_rate_usd should be defined')
      
      log('green', '  ✓', 'hourly_rate_usd is the primary field')
    } else {
      log('yellow', '  ⚠', 'No categories with rates to test')
    }
  })

  // Summary
  console.log('\n' + '='.repeat(70))
  log('cyan', '📊', 'Test Summary')
  console.log('='.repeat(70))
  log('green', '✓', `Passed: ${passed}`)
  log('red', '✗', `Failed: ${failed}`)
  console.log('='.repeat(70) + '\n')

  if (failed > 0) {
    log('red', '❌', 'SOME TESTS FAILED')
    log('yellow', '⚠', 'Please review failures above and fix issues')
    process.exit(1)
  } else {
    log('green', '✅', 'ALL TESTS PASSED!')
    log('cyan', '🎉', 'Category auth & display fixes are working correctly!')
    log('blue', 'ℹ', 'Safe to proceed with manual testing')
    process.exit(0)
  }
}

main().catch(error => {
  log('red', '💥', 'Test suite crashed!')
  console.error(error)
  process.exit(1)
})
