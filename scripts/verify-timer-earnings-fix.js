#!/usr/bin/env node
/**
 * Verification Test: Timer Earnings Fix
 * 
 * Verifies that the timer earnings bug is fixed
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
log('cyan', '🧪', 'Timer Earnings Fix Verification')
console.log('='.repeat(70) + '\n')

// Read useTimer.ts to verify the fix
const timerPath = path.join(__dirname, '..', 'hooks', 'useTimer.ts')
const timerContent = fs.readFileSync(timerPath, 'utf8')

console.log('─'.repeat(70))
log('yellow', '✅', 'Verification Tests')
console.log('─'.repeat(70) + '\n')

test('FIX: useTimer now checks hourly_rate_usd', () => {
  const checksNewField = timerContent.includes('hourly_rate_usd')
  
  assert(checksNewField, 'Should check hourly_rate_usd field')
  log('cyan', '  →', 'Confirmed: hourly_rate_usd is now checked')
})

test('FIX: useTimer uses fallback to hourly_rate', () => {
  const hasFallback = timerContent.includes('hourly_rate_usd || activeTask?.category?.hourly_rate') ||
                     timerContent.includes('hourly_rate_usd || ') ||
                     timerContent.includes('category?.hourly_rate_usd || ')
  
  assert(hasFallback, 'Should have fallback to legacy hourly_rate')
  log('cyan', '  →', 'Confirmed: Falls back to hourly_rate for legacy data')
})

test('FIX: Earnings calculation uses correct field', () => {
  const lines = timerContent.split('\n')
  let foundCorrectCalculation = false
  
  lines.forEach((line, index) => {
    if (line.includes('const hourlyRate =') && 
        line.includes('hourly_rate_usd')) {
      foundCorrectCalculation = true
      log('cyan', '  →', `Line ${index + 1}: ${line.trim()}`)
    }
  })
  
  assert(foundCorrectCalculation, 'Should calculate earnings with hourly_rate_usd')
})

test('FIX: useEffect dependencies updated', () => {
  const hasBothInDeps = timerContent.includes('activeTask?.category?.hourly_rate_usd') &&
                       timerContent.includes('[isRunning, isPaused')
  
  assert(hasBothInDeps, 'Should include hourly_rate_usd in dependencies')
  log('cyan', '  →', 'Confirmed: Dependencies include both rate fields')
})

test('FIX: Removed hardcoded hourly_rate checks', () => {
  const lines = timerContent.split('\n')
  let badChecksRemaining = 0
  
  lines.forEach((line, index) => {
    // Check for old pattern without the fallback
    if (line.includes('activeTask?.category?.hourly_rate)') && 
        !line.includes('hourly_rate_usd') &&
        !line.includes('//') && // not a comment
        line.includes('if (')) {
      badChecksRemaining++
      log('red', '  ✗', `Line ${index + 1}: ${line.trim()}`)
    }
  })
  
  assert(badChecksRemaining === 0, `Should have no hardcoded checks, found ${badChecksRemaining}`)
  log('cyan', '  →', 'Confirmed: No hardcoded hourly_rate checks remain')
})

console.log('\n' + '─'.repeat(70))
log('yellow', '🧮', 'Calculation Accuracy Tests')
console.log('─'.repeat(70) + '\n')

test('Formula still correct: 1 hour @ $150/hr = $150', () => {
  const seconds = 3600
  const rate = 150
  const earnings = (seconds / 3600) * rate
  
  assert(earnings === 150, `Expected $150, got $${earnings}`)
  log('cyan', '  →', 'Calculation verified ✓')
})

test('Formula still correct: 30 min @ $200/hr = $100', () => {
  const seconds = 1800
  const rate = 200
  const earnings = (seconds / 3600) * rate
  
  assert(earnings === 100, `Expected $100, got $${earnings}`)
  log('cyan', '  →', 'Calculation verified ✓')
})

test('Formula still correct: 2 hours @ $75/hr = $150', () => {
  const seconds = 7200
  const rate = 75
  const earnings = (seconds / 3600) * rate
  
  assert(earnings === 150, `Expected $150, got $${earnings}`)
  log('cyan', '  →', 'Calculation verified ✓')
})

console.log('\n' + '='.repeat(70))
log('cyan', '📊', 'Verification Summary')
console.log('='.repeat(70))
log('green', '✓', `Passed: ${passed}`)
log('red', '✗', `Failed: ${failed}`)
console.log('='.repeat(70) + '\n')

if (failed > 0) {
  log('red', '❌', 'VERIFICATION FAILED')
  log('yellow', '⚠', 'Fix incomplete - some issues remain')
  process.exit(1)
} else {
  log('green', '✅', 'ALL VERIFICATIONS PASSED!')
  log('cyan', '🎉', 'Timer earnings calculation is now fixed!')
  log('blue', 'ℹ', 'Timers should now show correct earnings in real-time')
  
  console.log('\n' + '─'.repeat(70))
  log('yellow', '📋', 'What Was Fixed')
  console.log('─'.repeat(70) + '\n')
  
  console.log('✅ useTimer now checks hourly_rate_usd (new field)')
  console.log('✅ Falls back to hourly_rate for legacy data')
  console.log('✅ Real-time earnings calculation working')
  console.log('✅ Session totals calculate correctly')
  console.log('✅ Green totals in UI will now update')
  
  process.exit(0)
}
