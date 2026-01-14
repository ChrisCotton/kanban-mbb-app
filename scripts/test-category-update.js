#!/usr/bin/env node
/**
 * Manual Test Script: Category Update API
 * 
 * Tests the HOTFIX for category_id in task update endpoint
 * Run: node scripts/test-category-update.js
 */

const PORT = process.env.PORT || 3000
const API_BASE = `http://localhost:${PORT}`

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`)
}

async function runTest(name, testFn) {
  try {
    await testFn()
    log('green', '✓', `PASS: ${name}`)
    return true
  } catch (error) {
    log('red', '✗', `FAIL: ${name}`)
    console.error(`  Error: ${error.message}`)
    return false
  }
}

async function makeRequest(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${path}`, options)
  const data = await response.json()
  
  return { status: response.status, data, response }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  log('cyan', '🧪', 'Category Update API Tests')
  console.log('='.repeat(60) + '\n')

  let passed = 0
  let failed = 0

  // Get a real task ID from the database
  log('blue', 'ℹ', 'Fetching test task from database...')
  let testTaskId
  let originalCategoryId
  
  try {
    const { data: tasksData } = await makeRequest('GET', '/api/kanban/tasks')
    if (!tasksData.success || !tasksData.data || tasksData.data.length === 0) {
      throw new Error('No tasks found in database')
    }
    
    // Get the first task from any status
    const allTasks = Object.values(tasksData.data).flat()
    const testTask = allTasks[0]
    testTaskId = testTask.id
    originalCategoryId = testTask.category_id
    
    log('green', '✓', `Using task: ${testTask.title} (ID: ${testTaskId})`)
    console.log()
  } catch (error) {
    log('red', '✗', `Failed to get test task: ${error.message}`)
    process.exit(1)
  }

  // Get a real category ID
  log('blue', 'ℹ', 'Fetching test category from database...')
  let testCategoryId
  
  try {
    const { data: categoriesData } = await makeRequest('GET', '/api/categories')
    if (!categoriesData.success || !categoriesData.data || categoriesData.data.length === 0) {
      throw new Error('No categories found in database')
    }
    
    testCategoryId = categoriesData.data[0].id
    log('green', '✓', `Using category: ${categoriesData.data[0].name} (ID: ${testCategoryId})`)
    console.log()
  } catch (error) {
    log('red', '✗', `Failed to get test category: ${error.message}`)
    process.exit(1)
  }

  console.log('─'.repeat(60))
  log('yellow', '📋', 'Running Tests...')
  console.log('─'.repeat(60) + '\n')

  // TEST 1: Update task with valid category_id
  if (await runTest('Update task with valid category_id', async () => {
    const { status, data } = await makeRequest('PUT', `/api/kanban/tasks/${testTaskId}`, {
      category_id: testCategoryId,
    })

    if (status !== 200) {
      throw new Error(`Expected status 200, got ${status}`)
    }

    if (!data.success) {
      throw new Error('Response success should be true')
    }

    if (data.data.category_id !== testCategoryId) {
      throw new Error(`Expected category_id ${testCategoryId}, got ${data.data.category_id}`)
    }

    log('cyan', '  →', `Category successfully updated to: ${testCategoryId}`)
  })) {
    passed++
  } else {
    failed++
  }

  // TEST 2: Clear category (set to null)
  if (await runTest('Clear category assignment (set to null)', async () => {
    const { status, data } = await makeRequest('PUT', `/api/kanban/tasks/${testTaskId}`, {
      category_id: null,
    })

    if (status !== 200) {
      throw new Error(`Expected status 200, got ${status}`)
    }

    if (data.data.category_id !== null) {
      throw new Error(`Expected category_id null, got ${data.data.category_id}`)
    }

    log('cyan', '  →', 'Category successfully cleared')
  })) {
    passed++
  } else {
    failed++
  }

  // TEST 3: Update with invalid category_id (should fail)
  if (await runTest('Reject invalid UUID for category_id', async () => {
    const { status, data } = await makeRequest('PUT', `/api/kanban/tasks/${testTaskId}`, {
      category_id: 'not-a-valid-uuid',
    })

    if (status !== 400) {
      throw new Error(`Expected status 400, got ${status}`)
    }

    if (!data.error || !data.error.includes('Invalid category_id')) {
      throw new Error('Expected error message about invalid category_id')
    }

    log('cyan', '  →', 'Correctly rejected invalid UUID')
  })) {
    passed++
  } else {
    failed++
  }

  // TEST 4: Update category along with other fields
  if (await runTest('Update category along with title', async () => {
    const newTitle = `Test Task ${Date.now()}`
    const { status, data } = await makeRequest('PUT', `/api/kanban/tasks/${testTaskId}`, {
      title: newTitle,
      category_id: testCategoryId,
    })

    if (status !== 200) {
      throw new Error(`Expected status 200, got ${status}`)
    }

    if (data.data.title !== newTitle) {
      throw new Error(`Title not updated correctly`)
    }

    if (data.data.category_id !== testCategoryId) {
      throw new Error(`Category not updated correctly`)
    }

    log('cyan', '  →', `Both title and category updated successfully`)
  })) {
    passed++
  } else {
    failed++
  }

  // TEST 5: Update other fields without touching category_id
  if (await runTest('Update title without changing category', async () => {
    const newTitle = `Updated Task ${Date.now()}`
    const { status, data } = await makeRequest('PUT', `/api/kanban/tasks/${testTaskId}`, {
      title: newTitle,
      // category_id not provided - should remain unchanged
    })

    if (status !== 200) {
      throw new Error(`Expected status 200, got ${status}`)
    }

    if (data.data.title !== newTitle) {
      throw new Error(`Title not updated`)
    }

    // Category should still be testCategoryId from previous test
    if (data.data.category_id !== testCategoryId) {
      throw new Error(`Category was unexpectedly changed`)
    }

    log('cyan', '  →', 'Title updated, category unchanged')
  })) {
    passed++
  } else {
    failed++
  }

  // Restore original category
  log('blue', 'ℹ', `Restoring original category: ${originalCategoryId || 'null'}`)
  await makeRequest('PUT', `/api/kanban/tasks/${testTaskId}`, {
    category_id: originalCategoryId,
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  log('cyan', '📊', 'Test Summary')
  console.log('='.repeat(60))
  log('green', '✓', `Passed: ${passed}`)
  log('red', '✗', `Failed: ${failed}`)
  console.log('='.repeat(60) + '\n')

  if (failed > 0) {
    log('red', '❌', 'SOME TESTS FAILED')
    process.exit(1)
  } else {
    log('green', '✅', 'ALL TESTS PASSED!')
    log('cyan', '🎉', 'Category update functionality is working correctly!')
    process.exit(0)
  }
}

// Run tests
main().catch(error => {
  log('red', '💥', 'Test suite crashed!')
  console.error(error)
  process.exit(1)
})
