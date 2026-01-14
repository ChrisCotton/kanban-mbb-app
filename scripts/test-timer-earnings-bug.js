#!/usr/bin/env node
/**
 * Diagnostic Test: Timer Earnings Calculation Bug
 * 
 * Verifies that timer earnings are calculated correctly with hourly_rate_usd
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
log('cyan', '🧪', 'Timer Earnings Calculation Bug Diagnosis')
console.log('='.repeat(70) + '\n')

//Read useTimer.ts to check for the bug
const timerPath = path.join(__dirname, '..', 'hooks', 'useTimer.ts')
const timerContent = fs.readFileSync(timerPath, 'utf8')

console.log('─'.repeat(70))
log('yellow', '📝', 'Static Code Analysis')
console.log('─'.repeat(70) + '\n')

test('useTimer file exists', () => {
  assert(fs.existsSync(timerPath), 'useTimer.ts should exist')
  log('cyan', '  →', 'Found: hooks/useTimer.ts')
})

test('BUG: useTimer checks hourly_rate (wrong field)', () => {
  const hasWrongField = timerContent.includes('activeTask?.category?.hourly_rate')
  
  if (hasWrongField) {
    log('red', '  ❌', 'BUG CONFIRMED: useTimer checks hourly_rate')
    log('yellow', '  ⚠', 'Should check hourly_rate_usd instead!')
    
    // Find line numbers
    const lines = timerContent.split('\n')
    lines.forEach((line, index) => {
      if (line.includes('activeTask?.category?.hourly_rate') && 
          !line.includes('hourly_rate_usd')) {
        log('cyan', '  →', `Line ${index + 1}: ${line.trim()}`)
      }
    })
  }
  
  assert(hasWrongField, 'Bug exists: checking wrong field name')
})

test('useTimer does NOT check hourly_rate_usd', () => {
  const hasCorrectField = timerContent.includes('hourly_rate_usd') &&
                         timerContent.includes('activeTask?.category?.hourly_rate_usd')
  
  if (!hasCorrectField) {
    log('red', '  ❌', 'useTimer does NOT check hourly_rate_usd')
  }
  
  assert(!hasCorrectField, 'Confirms: hourly_rate_usd not being checked')
})

console.log('\n' + '─'.repeat(70))
log('yellow', '💡', 'Earnings Calculation Logic Tests')
console.log('─'.repeat(70) + '\n')

test('Formula: (seconds / 3600) * rate = earnings', () => {
  const seconds = 3600 // 1 hour
  const rate = 150
  const earnings = (seconds / 3600) * rate
  
  assert(earnings === 150, `Should be $150, got $${earnings}`)
  log('cyan', '  →', '1 hour @ $150/hr = $150.00 ✓')
})

test('30 minutes @ $120/hr = $60.00', () => {
  const seconds = 1800
  const rate = 120
  const earnings = (seconds / 3600) * rate
  
  assert(earnings === 60, `Should be $60, got $${earnings}`)
  log('cyan', '  →', 'Calculation correct ✓')
})

test('10 seconds @ $100/hr = $0.28', () => {
  const seconds = 10
  const rate = 100
  const earnings = (seconds / 3600) * rate
  const rounded = Math.round(earnings * 100) / 100
  
  assert(rounded === 0.28, `Should be $0.28, got $${rounded}`)
  log('cyan', '  →', 'Calculation correct ✓')
})

console.log('\n' + '─'.repeat(70))
log('yellow', '🔧', 'Required Fixes')
console.log('─'.repeat(70) + '\n')

console.log('File: hooks/useTimer.ts')
console.log('')
console.log('1. Line ~207: Change')
console.log(`   ${colors.red}if (activeTask?.category?.hourly_rate) {${colors.reset}`)
console.log('   to:')
console.log(`   ${colors.green}if (activeTask?.category?.hourly_rate_usd || activeTask?.category?.hourly_rate) {${colors.reset}`)
console.log('')
console.log('2. Line ~209: Change')
console.log(`   ${colors.red}const earnings = hoursWorked * activeTask.category.hourly_rate${colors.reset}`)
console.log('   to:')
console.log(`   ${colors.green}const earnings = hoursWorked * (activeTask.category.hourly_rate_usd || activeTask.category.hourly_rate)${colors.reset}`)
console.log('')
console.log('3. Line ~89: Change')
console.log(`   ${colors.red}if (parsed.activeSession && activeTask?.category?.hourly_rate) {${colors.reset}`)
console.log('   to:')
console.log(`   ${colors.green}if (parsed.activeSession && (activeTask?.category?.hourly_rate_usd || activeTask?.category?.hourly_rate)) {${colors.reset}`)
console.log('')
console.log('4. Line ~91: Change')
console.log(`   ${colors.red}parsed.sessionEarnings = hoursWorked * activeTask.category.hourly_rate${colors.reset}`)
console.log('   to:')
console.log(`   ${colors.green}parsed.sessionEarnings = hoursWorked * (activeTask.category.hourly_rate_usd || activeTask.category.hourly_rate)${colors.reset}`)

console.log('\n' + '='.repeat(70))
log('cyan', '📊', 'Diagnostic Summary')
console.log('='.repeat(70))
log('green', '✓', `Passed: ${passed}`)
log('red', '✗', `Failed: ${failed}`)
console.log('='.repeat(70) + '\n')

if (failed > 0) {
  log('red', '❌', 'BUG CONFIRMED')
  log('yellow', '⚠', 'Timer earnings show $0.00 because wrong field name is checked')
  log('blue', 'ℹ', 'Fix required: Update useTimer.ts to check hourly_rate_usd')
  process.exit(1)
} else {
  log('green', '✅', 'DIAGNOSTICS COMPLETE')
  process.exit(0)
}
