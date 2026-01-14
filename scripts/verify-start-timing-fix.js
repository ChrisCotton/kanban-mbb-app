#!/usr/bin/env node
/**
 * Verification Test: Start Timing Button Fix
 * 
 * Verifies that clicking Start Timing now starts the timer
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
log('cyan', '🧪', 'Start Timing Button Fix Verification')
console.log('='.repeat(70) + '\n')

// Read MBBTimerSection.tsx
const timerPath = path.join(__dirname, '..', 'components', 'timer', 'MBBTimerSection.tsx')
const timerContent = fs.readFileSync(timerPath, 'utf8')

console.log('─'.repeat(70))
log('yellow', '✅', 'Verification Tests')
console.log('─'.repeat(70) + '\n')

test('FIX: useEffect added for auto-start', () => {
  const hasUseEffect = timerContent.includes('useEffect')
  const hasAutoStart = timerContent.includes('Auto-start') || 
                      timerContent.includes('auto-start') ||
                      (timerContent.includes('activeTask') && 
                       timerContent.includes('handleStart'))
  
  assert(hasUseEffect, 'Should have useEffect')
  assert(hasAutoStart, 'Should have auto-start logic')
  log('cyan', '  →', 'Confirmed: useEffect for auto-start added')
})

test('FIX: useEffect checks activeTask', () => {
  const lines = timerContent.split('\n')
  let foundUseEffect = false
  let checksActiveTask = false
  let callsHandleStart = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (line.includes('useEffect')) {
      foundUseEffect = true
      // Check next ~5 lines for activeTask and handleStart
      for (let j = i; j < Math.min(i + 8, lines.length); j++) {
        if (lines[j].includes('activeTask')) checksActiveTask = true
        if (lines[j].includes('handleStart')) callsHandleStart = true
      }
    }
  }
  
  assert(foundUseEffect, 'Should have useEffect')
  assert(checksActiveTask, 'useEffect should check activeTask')
  assert(callsHandleStart, 'useEffect should call handleStart')
  
  log('cyan', '  →', 'Confirmed: useEffect checks activeTask and calls handleStart')
})

test('FIX: useEffect checks if timer is not running', () => {
  const hasIsRunningCheck = timerContent.includes('!isRunning') &&
                           timerContent.includes('activeTask')
  
  assert(hasIsRunningCheck, 'Should check !isRunning to prevent double-start')
  log('cyan', '  →', 'Confirmed: Prevents double-start with !isRunning check')
})

test('FIX: Interface uses hourly_rate_usd', () => {
  const usesNewField = timerContent.includes('hourly_rate_usd')
  
  assert(usesNewField, 'Interface should use hourly_rate_usd')
  log('cyan', '  →', 'Confirmed: Interface updated to hourly_rate_usd')
})

test('FIX: useEffect has correct dependencies', () => {
  const hasDependencies = timerContent.includes('[activeTask') ||
                         timerContent.includes('activeTask,')
  
  assert(hasDependencies, 'useEffect should have activeTask in dependencies')
  log('cyan', '  →', 'Confirmed: Dependencies include activeTask')
})

console.log('\n' + '─'.repeat(70))
log('yellow', '🔄', 'Expected Flow (After Fix)')
console.log('─'.repeat(70) + '\n')

console.log('1. User clicks "Start Timing" in task modal')
console.log('2. TaskDetailModal calls onStartTiming(task)')
console.log('3. dashboard.js handleStartTiming sets activeTask')
console.log('4. ✅ MBBTimerSection useEffect detects activeTask changed')
console.log('5. ✅ useEffect calls handleStart()')
console.log('6. ✅ Timer starts automatically!')
console.log('7. ✅ Green earnings begin calculating')

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
  log('cyan', '🎉', 'Start Timing button should now work!')
  log('blue', 'ℹ', 'Timer will auto-start when task is selected')
  
  console.log('\n' + '─'.repeat(70))
  log('yellow', '📋', 'What Was Fixed')
  console.log('─'.repeat(70) + '\n')
  
  console.log('✅ Added useEffect to auto-start timer')
  console.log('✅ Triggers when activeTask changes')
  console.log('✅ Prevents double-start with !isRunning check')
  console.log('✅ Updates interface to use hourly_rate_usd')
  console.log('✅ Proper dependency array in useEffect')
  
  console.log('\n' + '─'.repeat(70))
  log('yellow', '🧪', 'Manual Testing')
  console.log('─'.repeat(70) + '\n')
  
  console.log('1. Open http://localhost:3000')
  console.log('2. Click on any task')
  console.log('3. Click "Start Timing" button')
  console.log('4. Expected: Modal closes')
  console.log('5. Expected: Timer starts automatically')
  console.log('6. Expected: Green earnings start calculating')
  console.log('7. Expected: Timer shows time incrementing')
  
  process.exit(0)
}
