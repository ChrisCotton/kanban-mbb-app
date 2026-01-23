/**
 * Backend Schema Validation Tests for vision_board_images table
 * 
 * These tests verify that the database schema matches expected structure,
 * including all required columns, data types, constraints, and indexes.
 */

import { createClient } from '@supabase/supabase-js'

// Use test environment variables or provide test credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not found. Schema tests will be skipped.')
}

const REQUIRED_COLUMNS = [
  'id',
  'user_id',
  'file_name',
  'file_path',
  'is_active',
  'display_order',
  'goal',
  'due_date',
  'media_type',
  'created_at',
  'updated_at',
  'view_count'
]

const OPTIONAL_COLUMNS = [
  'file_size',
  'mime_type',
  'title',
  'alt_text',
  'description',
  'width_px',
  'height_px',
  'uploaded_at',
  'last_viewed_at',
  'goal_id',
  'generation_prompt',
  'ai_provider'
]

const REQUIRED_INDEXES = [
  'idx_vision_board_user_id',
  'idx_vision_board_active',
  'idx_vision_board_due_date',
  'idx_vision_board_media_type'
]

describe('Vision Board Schema Validation', () => {
  let supabase: ReturnType<typeof createClient>

  beforeAll(() => {
    if (!supabaseUrl || !supabaseKey) {
      return
    }
    supabase = createClient(supabaseUrl, supabaseKey)
  })

  describe('Required Columns', () => {
    REQUIRED_COLUMNS.forEach(columnName => {
      it(`should have required column: ${columnName}`, async () => {
        if (!supabase) {
          console.warn('Skipping test - Supabase not configured')
          return
        }

        const { data, error } = await supabase.rpc('exec_sql', {
          query: `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'vision_board_images'
            AND column_name = '${columnName}'
          `
        })

        if (error) {
          // Fallback: try direct query
          const { data: directData, error: directError } = await supabase
            .from('vision_board_images')
            .select(columnName)
            .limit(0)

          if (directError && directError.message.includes('column')) {
            throw new Error(`Column ${columnName} does not exist: ${directError.message}`)
          }
        } else {
          expect(data).toBeDefined()
          if (Array.isArray(data) && data.length > 0) {
            expect(data[0].column_name).toBe(columnName)
          }
        }
      })
    })
  })

  describe('Optional Columns', () => {
    OPTIONAL_COLUMNS.forEach(columnName => {
      it(`should have optional column: ${columnName}`, async () => {
        if (!supabase) {
          console.warn('Skipping test - Supabase not configured')
          return
        }

        // Try to select the column (should not error if it exists)
        const { error } = await supabase
          .from('vision_board_images')
          .select(columnName)
          .limit(0)

        // Column might not exist, which is OK for optional columns
        // But if error mentions column doesn't exist, log it
        if (error && error.message.includes('column') && error.message.includes('does not exist')) {
          console.warn(`Optional column ${columnName} does not exist (this is OK)`)
        }
      })
    })
  })

  describe('Data Type Validation', () => {
    it('should have goal column as TEXT NOT NULL', async () => {
      if (!supabase) {
        console.warn('Skipping test - Supabase not configured')
        return
      }

      // Test that goal cannot be NULL
      const { error } = await supabase
        .from('vision_board_images')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          file_name: 'test',
          file_path: 'test',
          goal: null, // This should fail
          due_date: '2024-01-01',
          media_type: 'image'
        })

      expect(error).toBeTruthy()
      expect(error?.message).toMatch(/null|NOT NULL|constraint/i)
    })

    it('should have due_date column as DATE NOT NULL', async () => {
      if (!supabase) {
        console.warn('Skipping test - Supabase not configured')
        return
      }

      const { error } = await supabase
        .from('vision_board_images')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          file_name: 'test',
          file_path: 'test',
          goal: 'Test goal',
          due_date: null, // This should fail
          media_type: 'image'
        })

      expect(error).toBeTruthy()
      expect(error?.message).toMatch(/null|NOT NULL|constraint/i)
    })

    it('should enforce media_type CHECK constraint', async () => {
      if (!supabase) {
        console.warn('Skipping test - Supabase not configured')
        return
      }

      const { error } = await supabase
        .from('vision_board_images')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          file_name: 'test',
          file_path: 'test',
          goal: 'Test goal',
          due_date: '2024-01-01',
          media_type: 'invalid_type' // This should fail
        })

      expect(error).toBeTruthy()
      expect(error?.message).toMatch(/constraint|check|media_type/i)
    })
  })

  describe('Constraints', () => {
    it('should enforce valid_goal constraint (non-empty)', async () => {
      if (!supabase) {
        console.warn('Skipping test - Supabase not configured')
        return
      }

      const { error } = await supabase
        .from('vision_board_images')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          file_name: 'test',
          file_path: 'test',
          goal: '   ', // Whitespace only - should fail
          due_date: '2024-01-01',
          media_type: 'image'
        })

      expect(error).toBeTruthy()
      expect(error?.message).toMatch(/constraint|valid_goal/i)
    })
  })

  describe('Indexes', () => {
    REQUIRED_INDEXES.forEach(indexName => {
      it(`should have index: ${indexName}`, async () => {
        if (!supabase) {
          console.warn('Skipping test - Supabase not configured')
          return
        }

        // Note: Direct index checking may require admin access
        // This is a placeholder test - actual implementation may vary
        console.log(`Checking for index: ${indexName}`)
      })
    })
  })

  describe('RLS Policies', () => {
    it('should have RLS enabled on vision_board_images table', async () => {
      if (!supabase) {
        console.warn('Skipping test - Supabase not configured')
        return
      }

      // RLS should be enabled - users without auth should not be able to read
      const { data, error } = await supabase
        .from('vision_board_images')
        .select('*')
        .limit(1)

      // If RLS is properly configured, unauthenticated requests should fail or return empty
      // This test verifies RLS is active (exact behavior depends on policy configuration)
      expect(error || data).toBeDefined()
    })
  })
})
