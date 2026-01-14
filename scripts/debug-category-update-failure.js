#!/usr/bin/env node
/**
 * Debug Script: Reproduce Category Update Failure
 * 
 * This reproduces the exact request from the UI to see why it's failing
 */

const PORT = process.env.PORT || 3000
const API_BASE = `http://localhost:${PORT}`

async function debugRequest() {
  const taskId = '0b00046b-3ca3-479c-901d-4a705e79a336' // From the screenshot
  
  // Get the task first
  console.log('\n📋 Fetching task details...')
  const getResponse = await fetch(`${API_BASE}/api/kanban/tasks/${taskId}`)
  const taskData = await getResponse.json()
  console.log('Current task:', JSON.stringify(taskData, null, 2))
  
  // Get category ID for "SUPER DUPER IMPORTANT CATEGORY"
  console.log('\n📁 Fetching categories...')
  const categoriesResponse = await fetch(`${API_BASE}/api/categories`)
  const categoriesData = await categoriesResponse.json()
  
  const superDuperCategory = categoriesData.data.find(cat => 
    cat.name === 'SUPER DUPER IMPORTANT CATEGORY'
  )
  
  if (!superDuperCategory) {
    console.error('❌ Could not find "SUPER DUPER IMPORTANT CATEGORY"')
    console.log('Available categories:', categoriesData.data.map(c => c.name))
    process.exit(1)
  }
  
  console.log(`✓ Found category: ${superDuperCategory.name} (ID: ${superDuperCategory.id})`)
  
  // Now try the exact update that should work
  console.log('\n🔄 Attempting category update...')
  console.log('Request body:', JSON.stringify({
    category_id: superDuperCategory.id
  }, null, 2))
  
  const updateResponse = await fetch(`${API_BASE}/api/kanban/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      category_id: superDuperCategory.id
    })
  })
  
  console.log(`Response status: ${updateResponse.status}`)
  
  const updateData = await updateResponse.json()
  console.log('Response data:', JSON.stringify(updateData, null, 2))
  
  if (updateResponse.status !== 200) {
    console.error('\n❌ UPDATE FAILED!')
    console.error('Status:', updateResponse.status)
    console.error('Error:', updateData.error)
    console.error('Message:', updateData.message)
    
    // Try to get more details from the server
    console.log('\n🔍 Checking server logs for details...')
    process.exit(1)
  } else {
    console.log('\n✅ UPDATE SUCCEEDED!')
    console.log('New category_id:', updateData.data.category_id)
  }
}

debugRequest().catch(error => {
  console.error('\n💥 Script crashed:', error)
  process.exit(1)
})
