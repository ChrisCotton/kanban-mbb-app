#!/usr/bin/env node
/**
 * Verification Script: Check if UI update matches what we expect
 */

const PORT = process.env.PORT || 3000
const API_BASE = `http://localhost:${PORT}`

async function verify() {
  const taskId = '0b00046b-3ca3-479c-901d-4a705e79a336'
  
  console.log('\n📋 Checking current task state...')
  const response = await fetch(`${API_BASE}/api/kanban/tasks/${taskId}`)
  const data = await response.json()
  
  if (!data.success) {
    console.error('❌ Failed to fetch task')
    process.exit(1)
  }
  
  const task = data.data
  
  console.log('\n' + '='.repeat(60))
  console.log('Task Details:')
  console.log('='.repeat(60))
  console.log(`Title: ${task.title}`)
  console.log(`Status: ${task.status}`)
  console.log(`Category ID: ${task.category_id}`)
  
  // Get category name
  if (task.category_id) {
    const catResponse = await fetch(`${API_BASE}/api/categories`)
    const catData = await catResponse.json()
    const category = catData.data.find(c => c.id === task.category_id)
    console.log(`Category Name: ${category ? category.name : 'Unknown'}`)
  } else {
    console.log(`Category Name: (No category)`)
  }
  
  console.log(`Last Updated: ${task.updated_at}`)
  console.log('='.repeat(60))
  
  if (task.category_id === '1dfbd4c9-d55f-49d2-a930-f9ce874750a5') {
    console.log('\n✅ Task HAS the "SUPER DUPER IMPORTANT CATEGORY" assigned!')
    console.log('✅ The update was successful!')
  } else if (!task.category_id) {
    console.log('\n⚠️  Task has NO category assigned')
  } else {
    console.log('\n📌 Task has a different category assigned')
  }
}

verify().catch(error => {
  console.error('\n💥 Error:', error)
  process.exit(1)
})
