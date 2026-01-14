/**
 * Integration Tests: Categories CRUD Operations
 * 
 * Tests the full category lifecycle: Create → Read → Update → Delete
 * Uses actual API calls to catch real integration issues
 */

describe('Categories CRUD Integration', () => {
  const API_BASE = 'http://localhost:3000'
  let testCategoryId: string | null = null
  
  beforeAll(() => {
    // Ensure we're testing against a running server
    console.log('Testing against:', API_BASE)
  })
  
  afterAll(async () => {
    // Cleanup: Delete test category if it still exists
    if (testCategoryId) {
      try {
        await fetch(`${API_BASE}/api/categories/${testCategoryId}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.log('Cleanup failed (category may already be deleted):', error)
      }
    }
  })

  describe('✅ CREATE Category', () => {
    test('should create a new category and return it', async () => {
      const newCategory = {
        name: 'TEST INTEGRATION CATEGORY',
        hourly_rate_usd: '150',
        color: '#ff6b6b',
      }

      const response = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      })

      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data.name).toBe(newCategory.name)
      expect(data.data.hourly_rate).toBe(150)
      
      // Store ID for cleanup
      testCategoryId = data.data.id
    })

    test('should reject duplicate category names', async () => {
      // Try to create the same category again
      const duplicateCategory = {
        name: 'TEST INTEGRATION CATEGORY',
        hourly_rate_usd: '200',
      }

      const response = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateCategory),
      })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('already exists')
    })
  })

  describe('📋 READ Categories', () => {
    test('should fetch all categories including newly created one', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)
      
      // Find our test category
      const testCategory = data.data.find((cat: any) => cat.id === testCategoryId)
      expect(testCategory).toBeDefined()
      expect(testCategory.name).toBe('TEST INTEGRATION CATEGORY')
    })

    test('should fetch a single category by ID', async () => {
      const response = await fetch(`${API_BASE}/api/categories/${testCategoryId}`)

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(testCategoryId)
      expect(data.data.name).toBe('TEST INTEGRATION CATEGORY')
    })
  })

  describe('✏️ UPDATE Category', () => {
    test('should update category name and hourly rate', async () => {
      const updates = {
        name: 'UPDATED INTEGRATION CATEGORY',
        hourly_rate_usd: '250',
      }

      const response = await fetch(`${API_BASE}/api/categories/${testCategoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('UPDATED INTEGRATION CATEGORY')
      expect(data.data.hourly_rate).toBe(250)
    })
  })

  describe('🗑️ DELETE Category', () => {
    test('should delete category', async () => {
      const response = await fetch(`${API_BASE}/api/categories/${testCategoryId}`, {
        method: 'DELETE',
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // Mark as deleted so cleanup doesn't try again
      testCategoryId = null
    })

    test('should not find deleted category', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)

      const data = await response.json()
      const deletedCategory = data.data.find((cat: any) => cat.name === 'UPDATED INTEGRATION CATEGORY')
      
      expect(deletedCategory).toBeUndefined()
    })
  })

  describe('🐛 REGRESSION: MBB DEVELOPMENT Bug', () => {
    test('should create MBB DEVELOPMENT category', async () => {
      const newCategory = {
        name: 'MBB DEVELOPMENT',
        hourly_rate_usd: '200',
      }

      const response = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      })

      // Should succeed (or fail with duplicate if it already exists)
      expect([201, 400]).toContain(response.status)
      
      const data = await response.json()
      console.log('MBB DEVELOPMENT create response:', data)
    })

    test('should list MBB DEVELOPMENT in categories', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)

      expect(response.status).toBe(200)
      
      const data = await response.json()
      console.log('Categories list:', data.data.map((c: any) => ({ id: c.id, name: c.name })))
      
      const mbbCategory = data.data.find((cat: any) => cat.name === 'MBB DEVELOPMENT')
      
      // This should pass if the category is visible in the list
      expect(mbbCategory).toBeDefined()
      expect(mbbCategory.name).toBe('MBB DEVELOPMENT')
      expect(mbbCategory.hourly_rate).toBe(200)
    })
  })
})
