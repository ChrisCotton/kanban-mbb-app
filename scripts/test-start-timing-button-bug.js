#!/usr/bin/env node
/**
 * Diagnostic Test: Start Timing Button Not Working
 * 
 * Bug: Start Timing button doesn't trigger timer to start
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
log('cyan', '🧪', 'Start Timing Button Bug Diagnosis')
console.log('='.repeat(70) + '\n')

// Read dashboard.js
const dashboardPath = path.join(__dirname, '..', 'pages', 'dashboard.js')
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8')

console.log('─'.repeat(70))
log('yellow', '📝', 'Static Code Analysis')
console.log('─'.repeat(70) + '\n')

test('BUG: handleStartTiming only sets activeTask', () => {
  const hasSetActiveTask = dashboardContent.includes('setActiveTask(task)')
  const hasStartTimer = dashboardContent.includes('.start()') || 
                       dashboardContent.includes('startTimer') ||
                       dashboardContent.includes('timer.start')
  
  if (hasSetActiveTask && !hasStartTimer) {
    log('red', '  ❌', 'BUG CONFIRMED: Only sets activeTask, no timer start!')
    log('yellow', '  ⚠', 'Should also call timer.start()')
    
    // Find the function
    const lines = dashboardContent.split('\n')
    lines.forEach((line, index) => {
      if (line.includes('handleStartTiming')) {
        log('cyan', '  →', `Line ${index + 1}: ${line.trim()}`)
      }
      if (line.includes('setActiveTask')) {
        log('cyan', '  →', `Line ${index + 1}: ${line.trim()}`)
      }
    })
  }
  
  assert(hasSetActiveTask && !hasStartTimer, 'Bug exists: no timer.start() call')
})

test('activeTask is passed to Layout', () => {
  const passesActiveTask = dashboardContent.includes('activeTask={activeTask}')
  
  assert(passesActiveTask, 'activeTask should be passed to Layout')
  log('cyan', '  →', 'Confirmed: activeTask passed to Layout')
})

console.log('\n' + '─'.repeat(70))
log('yellow', '🔄', 'Expected Flow')
console.log('─'.repeat(70) + '\n')

console.log('Current Flow (Broken):')
console.log('  1. User clicks "Start Timing" button')
console.log('  2. TaskDetailModal calls onStartTiming(task)')
console.log('  3. dashboard.js handleStartTiming sets activeTask')
console.log('  4. ❌ Timer never starts!')
console.log('')
console.log('Expected Flow (Fixed):')
console.log('  1. User clicks "Start Timing" button')
console.log('  2. TaskDetailModal calls onStartTiming(task)')
console.log('  3. dashboard.js handleStartTiming:')
console.log('      a. Sets activeTask')
console.log('      b. ✅ Closes modal')
console.log('      c. ✅ Calls timer.start() via MBBTimerSection')

console.log('\n' + '─'.repeat(70))
log('yellow', '🔧', 'Required Fixes')
console.log('─'.repeat(70) + '\n')

console.log('Option 1: Auto-start timer when activeTask changes')
console.log('  - Add useEffect in MBBTimerSection')
console.log('  - When activeTask changes, call start()')
console.log('  - Pro: Simple, automatic')
console.log('  - Con: Less explicit')
console.log('')
console.log('Option 2: Close modal and expose start function')
console.log('  - Pass timer start function to dashboard')
console.log('  - Call it in handleStartTiming')
console.log('  - Pro: Explicit control')
console.log('  - Con: More complex prop drilling')
console.log('')
console.log('Option 3: Use ref to access timer controls')
console.log('  - Create ref in Layout for MBBTimerSection')
console.log('  - Expose start() via ref')
console.log('  - Pro: Clean separation')
console.log('  - Con: Requires ref setup')

console.log('\n' + '='.repeat(70))
log('cyan', '📊', 'Diagnostic Summary')
console.log('='.repeat(70))
log('green', '✓', `Passed: ${passed}`)
log('red', '✗', `Failed: ${failed}`)
console.log('='.repeat(70) + '\n')

if (failed > 0) {
  log('red', '❌', 'BUG CONFIRMED')
  log('yellow', '⚠', 'Start Timing button sets activeTask but never starts timer')
  log('blue', 'ℹ', 'Recommended: Option 1 (auto-start on activeTask change)')
  process.exit(1)
} else {
  log('green', '✅', 'DIAGNOSTICS COMPLETE')
  process.exit(0)
}
