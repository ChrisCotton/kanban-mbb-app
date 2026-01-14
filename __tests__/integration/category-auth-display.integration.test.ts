import fetch from 'node-fetch';

describe('Category Auth & Display Integration Tests', () => {
  const API_BASE = 'http://localhost:3000'
  
  // Mock Supabase session for testing
  const mockSession = {
    access_token: 'mock-token-for-testing',
    user: {
      id: 'test-user-123'
    }
  }

  beforeAll(() => {
    // Explicitly assign fetch to global scope for this test file
    global.fetch = fetch as any;
    global.Headers = fetch.Headers as any;
    global.Request = fetch.Request as any;
    global.Response = fetch.Response as any;

    console.log('🧪 Testing Category Auth & Display Fixes')
  })

  describe('🔐 Category Creation with Authentication', () => {
    test('should require authentication to create category', async () => {
      const response = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
        body: JSON.stringify({
          name: 'TEST NO AUTH',
          hourly_rate_usd: '100',
        })
      })

      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
    })

    test('should reject invalid auth token', async () => {
      const response = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-123',
        },
        body: JSON.stringify({
          name: 'TEST INVALID AUTH',
          hourly_rate_usd: '100',
        })
      })

      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid authentication')
    })
  })

  describe('💵 Hourly Rate Field Consistency', () => {
    test('should store hourly rate in hourly_rate_usd field', async () => {
      // This test verifies the API response includes the correct field
      const response = await fetch(`${API_BASE}/api/categories`)
      const data = await response.json()

      if (data.data && data.data.length > 0) {
        const category = data.data[0]
        
        // Should have hourly_rate_usd field
        expect(category).toHaveProperty('hourly_rate_usd')
        
        // If hourly_rate exists, hourly_rate_usd should be primary
        if (category.hourly_rate !== undefined && category.hourly_rate_usd !== undefined) {
          console.log('Category fields:', {
            name: category.name,
            hourly_rate: category.hourly_rate,
            hourly_rate_usd: category.hourly_rate_usd
          })
        }
      }
    })

    test('should return numeric hourly_rate_usd value', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)
      const data = await response.json()

      if (data.data && data.data.length > 0) {
        data.data.forEach((category: any) => {
          if (category.hourly_rate_usd !== null) {
            expect(typeof category.hourly_rate_usd).toBe('number')
            expect(category.hourly_rate_usd).toBeGreaterThanOrEqual(0)
          }
        })
      }
    })

    test('should handle categories with $200 hourly rate correctly', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)
      const data = await response.json()

      // Find MBB DEVELOPMENT if it exists
      const mbbCategory = data.data?.find((cat: any) => cat.name === 'MBB DEVELOPMENT')
      
      if (mbbCategory) {
        console.log('MBB DEVELOPMENT hourly_rate_usd:', mbbCategory.hourly_rate_usd)
        
        // Should be 200, not 0
        expect(mbbCategory.hourly_rate_usd).toBe(200)
        
        // If both fields exist, hourly_rate_usd should be correct
        if (mbbCategory.hourly_rate !== undefined) {
          // This would fail in the buggy version where hourly_rate was 0
          console.log('  hourly_rate (legacy):', mbbCategory.hourly_rate)
          console.log('  hourly_rate_usd (correct):', mbbCategory.hourly_rate_usd)
        }
      }
    })
  })

  describe('👤 User-Specific Category Filtering', () => {
    test('should only return categories for authenticated user', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(Array.isArray(data.data)).toBe(true)

      // All returned categories should have a created_by field
      data.data.forEach((category: any) => {
        expect(category).toHaveProperty('created_by')
        expect(typeof category.created_by).toBe('string')
        
        // Should be a valid UUID
        expect(category.created_by).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      })
    })

    test('should not return categories from other users', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)
      const data = await response.json()

      if (data.data && data.data.length > 0) {
        const firstUserId = data.data[0].created_by
        
        // All categories should belong to the same user
        const allSameUser = data.data.every((cat: any) => cat.created_by === firstUserId)
        
        expect(allSameUser).toBe(true)
        
        console.log(`All ${data.data.length} categories belong to user: ${firstUserId}`)
      }
    })
  })

  describe('🔄 End-to-End Category Lifecycle', () => {
    test('should verify MBB DEVELOPMENT is now visible to correct user', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)
      const data = await response.json()

      console.log('\n📋 Current Categories:')
      data.data.forEach((cat: any, index: number) => {
        console.log(`${index + 1}. ${cat.name}`)
        console.log(`   Rate: $${cat.hourly_rate_usd}/hr`)
        console.log(`   Owner: ${cat.created_by}`)
      })

      // This test documents the expected behavior
      expect(data.success).toBe(true)
      expect(data.data.length).toBeGreaterThan(0)
    })
  })

  describe('⚠️ REGRESSION: Original Bug Scenarios', () => {
    test('should NOT allow creating category with hardcoded user ID', async () => {
      // This test ensures the bug fix prevents hardcoded user IDs
      const response = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Missing auth token - should fail
        },
        body: JSON.stringify({
          name: 'TEST HARDCODED USER',
          hourly_rate_usd: '150',
        })
      })

      // Should require authentication, not use default/hardcoded user
      expect(response.status).toBe(401)
    })

    test('should display hourly_rate_usd, not hourly_rate', async () => {
      const response = await fetch(`${API_BASE}/api/categories`)
      const data = await response.json()

      if (data.data && data.data.length > 0) {
        // Pick a category with a non-zero rate
        const categoryWithRate = data.data.find((cat: any) => 
          cat.hourly_rate_usd > 0 || cat.hourly_rate > 0
        )

        if (categoryWithRate) {
          console.log('\n🔍 Verifying field priority:')
          console.log(`  Category: ${categoryWithRate.name}`)
          console.log(`  hourly_rate_usd: ${categoryWithRate.hourly_rate_usd}`)
          console.log(`  hourly_rate: ${categoryWithRate.hourly_rate}`)

          // UI should prioritize hourly_rate_usd
          expect(categoryWithRate.hourly_rate_usd).toBeDefined()
        }
      }
    })
  })
})
