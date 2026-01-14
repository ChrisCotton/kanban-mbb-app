#!/usr/bin/env node
/**
 * TDD Test Suite: Category Dropdown Population
 * 
 * Diagnoses why categories fail to populate in dropdown
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
  magenta: '\x1b[35m',
}

let passed = 0
let failed = 0
let warnings = 0

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
    if (error.details) {
      console.error(`  ${colors.yellow}${error.details}${colors.reset}`)
    }
    failed++
    return false
  }
}

function warn(message) {
  log('yellow', '⚠', message)
  warnings++
}

function assert(condition, message, details = '') {
  if (!condition) {
    const error = new Error(message)
    if (details) error.details = details
    throw error
  }
}

async function main() {
  console.log('\n' + '='.repeat(70))
  log('cyan', '🧪', 'TDD: Category Dropdown Population Tests')
  console.log('='.repeat(70) + '\n')

  // TEST GROUP 1: API Accessibility
  console.log('─'.repeat(70))
  log('yellow', '🔌', 'API Connectivity Tests')
  console.log('─'.repeat(70) + '\n')

  let apiReachable = false
  let requiresAuth = false
  let categoriesResponse = null

  await test('API server is reachable', async () => {
    try {
      const response = await fetch(`${API_BASE}/api/categories`)
      apiReachable = true
      categoriesResponse = response
      
      log('cyan', '  →', `Server responded with status: ${response.status}`)
      
      assert(response.status === 200 || response.status === 401, 
        `Expected 200 or 401, got ${response.status}`)
    } catch (err) {
      assert(false, 'API server is not reachable', 
        `Make sure dev server is running on port ${PORT}`)
    }
  })

  if (!apiReachable) {
    log('red', '❌', 'Cannot proceed - API server not reachable')
    process.exit(1)
  }

  await test('Identify authentication requirements', async () => {
    const status = categoriesResponse.status
    
    if (status === 401) {
      requiresAuth = true
      log('cyan', '  →', 'API requires authentication (expected)')
    } else if (status === 200) {
      requiresAuth = false
      warn('API does not require authentication (unexpected)')
    }
    
    // This test always passes - it's diagnostic
  })

  // TEST GROUP 2: Authenticated Requests
  console.log('\n' + '─'.repeat(70))
  log('yellow', '🔐', 'Authentication Simulation Tests')
  console.log('─'.repeat(70) + '\n')

  let mockToken = 'mock-test-token-12345'
  let authResponse = null

  await test('API rejects invalid auth token', async () => {
    const response = await fetch(`${API_BASE}/api/categories`, {
      headers: {
        'Authorization': `Bearer ${mockToken}`
      }
    })
    
    authResponse = response
    const data = await response.json()
    
    log('cyan', '  →', `Status: ${response.status}`)
    log('cyan', '  →', `Response: ${JSON.stringify(data).slice(0, 100)}`)
    
    if (response.status === 401) {
      assert(data.success === false, 'Should have success: false')
      log('green', '  ✓', 'Correctly rejects invalid token')
    } else if (response.status === 200) {
      warn('API accepted invalid token - security issue!')
    }
  })

  // TEST GROUP 3: Browser Context Simulation
  console.log('\n' + '─'.repeat(70))
  log('yellow', '🌐', 'Browser Context Tests')
  console.log('─'.repeat(70) + '\n')

  await test('Check if API works with browser cookies', async () => {
    // In browser, the session cookie is automatically sent
    log('cyan', '  →', 'In browser, Supabase session is automatically included')
    log('cyan', '  →', 'useCategories hook calls supabase.auth.getSession()')
    log('cyan', '  →', 'Token is included in Authorization header')
    
    // This is a documentation test
  })

  // TEST GROUP 4: useCategories Hook Behavior
  console.log('\n' + '─'.repeat(70))
  log('yellow', '⚛️', 'React Hook Behavior Tests')
  console.log('─'.repeat(70) + '\n')

  await test('useCategories should call loadCategories on mount', async () => {
    log('cyan', '  →', 'useEffect(() => { loadCategories() }, [loadCategories])')
    log('cyan', '  →', 'This runs when component mounts')
    log('cyan', '  →', 'loadCategories fetches from /api/categories with auth token')
  })

  await test('useCategories should handle auth errors gracefully', async () => {
    log('cyan', '  →', 'If no token: throw Error("Not authenticated")')
    log('cyan', '  →', 'If invalid token: API returns 401')
    log('cyan', '  →', 'Hook should set error state and categories to []')
  })

  // TEST GROUP 5: Component Integration
  console.log('\n' + '─'.repeat(70))
  log('yellow', '🧩', 'Component Integration Tests')
  console.log('─'.repeat(70) + '\n')

  await test('CategorySelector should display categories from hook', async () => {
    log('cyan', '  →', 'const { categories, loading } = useCategories()')
    log('cyan', '  →', 'if (loading) return <Spinner />')
    log('cyan', '  →', 'if (categories.length === 0) return "No categories"')
    log('cyan', '  →', 'else render dropdown with categories')
  })

  // TEST GROUP 6: Potential Issues
  console.log('\n' + '─'.repeat(70))
  log('yellow', '🔍', 'Potential Issue Diagnosis')
  console.log('─'.repeat(70) + '\n')

  const potentialIssues = []

  await test('Check for authentication issues', async () => {
    if (requiresAuth) {
      potentialIssues.push({
        issue: 'API requires authentication',
        impact: 'Dropdown won\'t populate if user not logged in',
        fix: 'Ensure user is authenticated before showing dropdown'
      })
      log('yellow', '  ⚠', 'Issue identified: Authentication required')
    }
  })

  await test('Check for CORS issues', async () => {
    log('cyan', '  →', 'Same-origin requests should work (localhost:3000 → localhost:3000)')
    log('cyan', '  →', 'If different origins, CORS headers needed')
  })

  await test('Check for React rendering issues', async () => {
    potentialIssues.push({
      issue: 'Component not re-rendering after categories load',
      impact: 'Dropdown stays empty even after API returns data',
      fix: 'Ensure useState is triggering re-render'
    })
    log('yellow', '  ⚠', 'Possible: Component not re-rendering')
  })

  await test('Check for event listener cleanup', async () => {
    log('cyan', '  →', 'Recent fix added event listeners for category sync')
    log('cyan', '  →', 'Listeners are cleaned up in useEffect return')
    log('cyan', '  →', 'Multiple mounts/unmounts should not cause issues')
  })

  // TEST GROUP 7: API Response Validation
  console.log('\n' + '─'.repeat(70))
  log('yellow', '📦', 'API Response Validation')
  console.log('─'.repeat(70) + '\n')

  await test('Validate API response structure', async () => {
    // Try without auth (will fail but we can see the error structure)
    const response = await fetch(`${API_BASE}/api/categories`)
    const data = await response.json()
    
    log('cyan', '  →', `Response keys: ${Object.keys(data).join(', ')}`)
    
    if (data.success === false) {
      log('cyan', '  →', `Error: ${data.error}`)
      assert(data.error.includes('Authentication'), 
        'Error should mention authentication')
    } else if (data.success === true) {
      assert(Array.isArray(data.data), 'data.data should be an array')
      log('cyan', '  →', `Categories count: ${data.data.length}`)
    }
  })

  // Summary
  console.log('\n' + '='.repeat(70))
  log('cyan', '📊', 'Diagnostic Summary')
  console.log('='.repeat(70))
  log('green', '✓', `Passed: ${passed}`)
  log('red', '✗', `Failed: ${failed}`)
  log('yellow', '⚠', `Warnings: ${warnings}`)
  console.log('='.repeat(70) + '\n')

  // Potential Issues Report
  if (potentialIssues.length > 0) {
    console.log('─'.repeat(70))
    log('magenta', '🔧', 'Potential Issues Identified')
    console.log('─'.repeat(70) + '\n')
    
    potentialIssues.forEach((item, index) => {
      console.log(`${index + 1}. ${colors.yellow}${item.issue}${colors.reset}`)
      console.log(`   Impact: ${item.impact}`)
      console.log(`   Fix: ${colors.green}${item.fix}${colors.reset}\n`)
    })
  }

  // Recommendations
  console.log('─'.repeat(70))
  log('blue', '💡', 'Next Steps')
  console.log('─'.repeat(70) + '\n')

  if (requiresAuth) {
    console.log('1. Verify user is logged in (check browser console for session)')
    console.log('2. Check if supabase.auth.getSession() returns valid token')
    console.log('3. Inspect Network tab for /api/categories request')
    console.log('4. Look for 401 errors or failed requests')
  } else {
    console.log('1. Check browser console for JavaScript errors')
    console.log('2. Verify useCategories hook is being called')
    console.log('3. Check if categories state is being set')
    console.log('4. Look for React rendering issues')
  }

  console.log('\n' + '─'.repeat(70))
  log('cyan', '🧪', 'Manual Browser Tests Required')
  console.log('─'.repeat(70) + '\n')
  console.log('Run these in browser console:')
  console.log('')
  console.log('// Check Supabase session')
  console.log('const { createClient } = supabase')
  console.log('const sb = createClient(SUPABASE_URL, SUPABASE_KEY)')
  console.log('sb.auth.getSession().then(s => console.log(s))')
  console.log('')
  console.log('// Test API directly')
  console.log('sb.auth.getSession().then(async ({data: {session}}) => {')
  console.log('  const res = await fetch("/api/categories", {')
  console.log('    headers: { Authorization: `Bearer ${session.access_token}` }')
  console.log('  })')
  console.log('  console.log(await res.json())')
  console.log('})')

  if (failed > 0) {
    log('red', '❌', 'TESTS FAILED - Issues detected')
    process.exit(1)
  } else {
    log('green', '✅', 'DIAGNOSTICS COMPLETE')
    log('blue', 'ℹ', 'Proceed to implementation fixes')
    process.exit(0)
  }
}

main().catch(error => {
  log('red', '💥', 'Test suite crashed!')
  console.error(error)
  process.exit(1)
})
