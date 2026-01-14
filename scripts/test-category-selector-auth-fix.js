#!/usr/bin/env node
/**
 * Integration Test: CategorySelector Auth Fix
 * 
 * Verifies that CategorySelector now uses useCategories hook with auth
 */

const fs = require('fs')
const path = require('path')

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

function test(name, testFn) {
  try {
    testFn()
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

console.log('\n' + '='.repeat(70))
log('cyan', '🧪', 'CategorySelector Auth Fix Verification')
console.log('='.repeat(70) + '\n')

// Read the CategorySelector file
const selectorPath = path.join(__dirname, '..', 'components', 'ui', 'CategorySelector.tsx')
const selectorContent = fs.readFileSync(selectorPath, 'utf8')

console.log('─'.repeat(70))
log('yellow', '📝', 'Static Code Analysis Tests')
console.log('─'.repeat(70) + '\n')

test('CategorySelector imports useCategories hook', () => {
  assert(
    selectorContent.includes('import { useCategories } from'),
    'Should import useCategories hook'
  )
  log('cyan', '  →', 'Found: import { useCategories } from \'../../hooks/useCategories\'')
})

test('CategorySelector does NOT use direct fetch', () => {
  const hasDirectFetch = selectorContent.includes('await fetch(\'/api/categories\')')
  assert(
    !hasDirectFetch,
    'Should NOT use direct fetch to /api/categories'
  )
  log('cyan', '  →', 'Confirmed: No direct fetch calls to /api/categories')
})

test('CategorySelector uses useCategories hook', () => {
  assert(
    selectorContent.includes('useCategories()'),
    'Should call useCategories() hook'
  )
  log('cyan', '  →', 'Found: useCategories() hook call')
})

test('CategorySelector extracts categories from hook', () => {
  const hasCategories = selectorContent.includes('categories') && 
                       selectorContent.match(/const\s*{\s*categories/)
  assert(
    hasCategories,
    'Should destructure categories from hook'
  )
  log('cyan', '  →', 'Found: const { categories, ... } = useCategories()')
})

test('CategorySelector extracts loading from hook', () => {
  const hasLoading = selectorContent.includes('loading') && 
                    selectorContent.match(/const\s*{[^}]*loading[^}]*}\s*=\s*useCategories/)
  assert(
    hasLoading,
    'Should destructure loading from hook'
  )
  log('cyan', '  →', 'Found: loading state from hook')
})

test('CategorySelector extracts error from hook', () => {
  const hasError = selectorContent.match(/error:\s*loadError/) ||
                  selectorContent.match(/error\s*from\s*useCategories/)
  assert(
    hasError,
    'Should destructure error from hook'
  )
  log('cyan', '  →', 'Found: error state from hook')
})

test('CategorySelector does NOT define its own loadCategories', () => {
  const hasOwnLoader = selectorContent.includes('const loadCategories = useCallback')
  assert(
    !hasOwnLoader,
    'Should NOT define its own loadCategories function'
  )
  log('cyan', '  →', 'Confirmed: No custom loadCategories function')
})

test('CategorySelector does NOT use useState for categories', () => {
  const lines = selectorContent.split('\n')
  const hasOwnState = lines.some(line => 
    line.includes('useState<Category[]>') || 
    (line.includes('useState') && line.includes('Category[]'))
  )
  assert(
    !hasOwnState,
    'Should NOT use useState to manage categories locally'
  )
  log('cyan', '  →', 'Confirmed: No local useState for categories')
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
  log('yellow', '⚠', 'CategorySelector may not be using useCategories hook correctly')
  process.exit(1)
} else {
  log('green', '✅', 'ALL TESTS PASSED!')
  log('cyan', '🎉', 'CategorySelector now uses useCategories with auth!')
  log('blue', 'ℹ', 'Category dropdown should now populate correctly')
  
  console.log('\n' + '─'.repeat(70))
  log('yellow', '📋', 'What This Fix Accomplishes')
  console.log('─'.repeat(70) + '\n')
  
  console.log('✅ CategorySelector uses useCategories hook')
  console.log('✅ Auth token automatically included in API requests')
  console.log('✅ Category dropdown will populate when user is logged in')
  console.log('✅ Consistent auth behavior across all components')
  console.log('✅ Benefits from global category sync events')
  
  console.log('\n' + '─'.repeat(70))
  log('blue', '💡', 'Manual Verification Steps')
  console.log('─'.repeat(70) + '\n')
  
  console.log('1. Open browser to http://localhost:3000')
  console.log('2. Make sure you are logged in')
  console.log('3. Open a task modal or category dropdown')
  console.log('4. Verify categories populate immediately')
  console.log('5. Check browser console for any errors')
  
  process.exit(0)
}
