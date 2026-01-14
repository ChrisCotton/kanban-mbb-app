#!/usr/bin/env node
/**
 * Runtime Debugging: What's ACTUALLY happening?
 * 
 * Let's trace the actual data flow
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
  magenta: '\x1b[35m',
}

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`)
}

console.log('\n' + '='.repeat(70))
log('cyan', '🔍', 'RUNTIME DEBUG - What\'s Actually Happening?')
console.log('='.repeat(70) + '\n')

// Check the actual interface and data flow
const timerPath = path.join(__dirname, '..', 'components', 'timer', 'MBBTimerSection.tsx')
const timerContent = fs.readFileSync(timerPath, 'utf8')

const useTimerPath = path.join(__dirname, '..', 'hooks', 'useTimer.ts')
const useTimerContent = fs.readFileSync(useTimerPath, 'utf8')

const layoutPath = path.join(__dirname, '..', 'components', 'layout', 'Layout.tsx')
const layoutContent = fs.readFileSync(layoutPath, 'utf8')

console.log('─'.repeat(70))
log('yellow', '🔎', 'Checking Data Flow')
console.log('─'.repeat(70) + '\n')

log('magenta', '1.', 'Does Layout pass activeTask to MBBTimerSection?')
if (layoutContent.includes('activeTask') && layoutContent.includes('MBBTimerSection')) {
  log('green', '  ✓', 'Yes, Layout receives activeTask prop')
  
  // Find how it's passed
  const lines = layoutContent.split('\n')
  lines.forEach((line, i) => {
    if (line.includes('MBBTimerSection') || 
        (line.includes('activeTask') && i > 0 && lines[i-5]?.includes('MBBTimer'))) {
      log('cyan', '    ', `Line ${i+1}: ${line.trim()}`)
    }
  })
} else {
  log('red', '  ✗', 'PROBLEM: activeTask may not be passed to MBBTimerSection!')
}

console.log('')
log('magenta', '2.', 'What does MBBTimerSection expect for activeTask?')
const interfaceMatch = timerContent.match(/interface ActiveTask\s*{[^}]+}/s)
if (interfaceMatch) {
  log('cyan', '  →', 'Interface found:')
  console.log('    ' + interfaceMatch[0].replace(/\n/g, '\n    '))
}

console.log('')
log('magenta', '3.', 'Does useTimer receive activeTask?')
const useTimerCallMatch = timerContent.match(/useTimer\({[^}]+}\)/s)
if (useTimerCallMatch) {
  log('cyan', '  →', 'useTimer call:')
  console.log('    ' + useTimerCallMatch[0].replace(/\n/g, '\n    '))
  
  if (useTimerCallMatch[0].includes('activeTask')) {
    log('green', '  ✓', 'activeTask is passed to useTimer')
  } else {
    log('red', '  ✗', 'PROBLEM: activeTask NOT passed to useTimer!')
  }
}

console.log('')
log('magenta', '4.', 'Does useTimer use activeTask for calculations?')
const calcMatch = useTimerContent.match(/hourly_rate_usd.*activeTask/s) ||
                 useTimerContent.match(/activeTask.*hourly_rate_usd/s)
if (calcMatch) {
  log('green', '  ✓', 'useTimer references activeTask.category.hourly_rate_usd')
} else {
  log('red', '  ✗', 'PROBLEM: useTimer may not be using activeTask correctly!')
}

console.log('\n' + '─'.repeat(70))
log('yellow', '🐛', 'Potential Issues')
console.log('─'.repeat(70) + '\n')

let issues = []

// Check if Layout actually renders MBBTimerSection
if (!layoutContent.includes('MBBTimerSection')) {
  issues.push({
    severity: 'CRITICAL',
    issue: 'MBBTimerSection not imported or rendered in Layout',
    fix: 'Import and render MBBTimerSection in Layout component'
  })
}

// Check if activeTask prop exists in Layout
if (!layoutContent.includes('activeTask:') && !layoutContent.includes('activeTask?:')) {
  issues.push({
    severity: 'CRITICAL',
    issue: 'Layout may not accept activeTask prop',
    fix: 'Add activeTask to LayoutProps interface'
  })
}

// Check MBBTimerSection props interface
if (!timerContent.includes('activeTask?:') && !timerContent.includes('activeTask:')) {
  issues.push({
    severity: 'HIGH',
    issue: 'MBBTimerSection may not accept activeTask prop',
    fix: 'Add activeTask to MBBTimerSectionProps'
  })
}

if (issues.length > 0) {
  issues.forEach((issue, i) => {
    log('red', `${i+1}.`, `[${issue.severity}] ${issue.issue}`)
    log('yellow', '   ', `Fix: ${issue.fix}`)
  })
} else {
  log('green', '✓', 'No obvious structural issues found')
}

console.log('\n' + '─'.repeat(70))
log('yellow', '📋', 'Add These Console Logs to Debug')
console.log('─'.repeat(70) + '\n')

console.log('In MBBTimerSection.tsx, add after line 40:')
console.log('')
console.log(colors.cyan + `  useEffect(() => {
    console.log('[MBBTimerSection] Received props:', {
      activeTask: activeTask?.title,
      hasCategory: !!activeTask?.category,
      rate: activeTask?.category?.hourly_rate_usd,
      isRunning,
      currentTime,
      sessionEarnings
    })
  }, [activeTask, isRunning, currentTime, sessionEarnings])` + colors.reset)

console.log('')
console.log('In useTimer.ts, inside the setInterval (around line 208):')
console.log('')
console.log(colors.cyan + `  console.log('[useTimer] Calculating earnings:', {
    activeTask: activeTask?.title,
    hasCategory: !!activeTask?.category,
    hourly_rate_usd: activeTask?.category?.hourly_rate_usd,
    hourly_rate: activeTask?.category?.hourly_rate,
    currentTime: newTime,
    earnings
  })` + colors.reset)

console.log('\n' + '='.repeat(70))
log('red', '⚠️', 'IMPORTANT: Static tests can\'t catch runtime data flow issues!')
console.log('='.repeat(70))
console.log('')
console.log('The tests verified CODE STRUCTURE but not ACTUAL BEHAVIOR.')
console.log('We need to check browser console for actual values.')
console.log('')
log('blue', '→', 'Open browser DevTools (F12)')
log('blue', '→', 'Click "Start Timing" on a task')
log('blue', '→', 'Look for console logs showing actual values')
log('blue', '→', 'Check if activeTask.category.hourly_rate_usd is defined')

console.log('')
