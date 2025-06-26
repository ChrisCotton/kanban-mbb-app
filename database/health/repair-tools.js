#!/usr/bin/env node

/**
 * Database Repair Tools
 * Automated repair functions for common database issues
 */

const { createClient } = require('@supabase/supabase-js')
const DatabaseHealthChecker = require('./health-checker')
require('dotenv').config({ path: '.env.local' })

class DatabaseRepairTools {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)
    this.healthChecker = new DatabaseHealthChecker()
  }

  async repairCategoriesTable() {
    console.log('🔧 Repairing categories table...')
    
    const repairs = []
    
    try {
      // Check if table exists
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .limit(1)

      if (error && error.code === '42P01') {
        repairs.push({
          type: 'create_table',
          status: 'manual_required',
          message: 'Categories table needs to be created',
          sql: this.getCategoriesTableSQL()
        })
        return { success: false, repairs, requiresManualIntervention: true }
      }

      // Check columns
      const expectedColumns = ['id', 'name', 'hourly_rate', 'color', 'is_active', 'created_at', 'updated_at', 'created_by', 'updated_by']
      const missingColumns = []
      
      for (const column of expectedColumns) {
        try {
          const { error: colError } = await this.supabase
            .from('categories')
            .select(column)
            .limit(1)
          
          if (colError && colError.message.includes('does not exist')) {
            missingColumns.push(column)
          }
        } catch (e) {
          missingColumns.push(column)
        }
      }

      if (missingColumns.length > 0) {
        repairs.push({
          type: 'add_missing_columns',
          status: 'manual_required',
          message: `Missing columns: ${missingColumns.join(', ')}`,
          columns: missingColumns,
          sql: missingColumns.map(col => this.getAddColumnSQL('categories', col)).join('\n')
        })
      }

      // Test basic operations
      const { data: testUsers } = await this.supabase.auth.admin.listUsers()
      if (testUsers && testUsers.users.length > 0) {
        const testUserId = testUsers.users[0].id
        
        // Test insert
        const testData = {
          name: `Test Category ${Date.now()}`,
          hourly_rate: 50.00,
          color: '#3B82F6',
          is_active: true,
          created_by: testUserId,
          updated_by: testUserId
        }

        const { data: insertResult, error: insertError } = await this.supabase
          .from('categories')
          .insert(testData)
          .select()

        if (insertError) {
          repairs.push({
            type: 'insert_test_failed',
            status: 'error',
            message: `Cannot insert into categories table: ${insertError.message}`,
            error_code: insertError.code
          })
        } else {
          repairs.push({
            type: 'insert_test',
            status: 'success',
            message: 'Categories table accepts inserts correctly'
          })

          // Clean up test record
          if (insertResult && insertResult[0]) {
            await this.supabase
              .from('categories')
              .delete()
              .eq('id', insertResult[0].id)
          }
        }
      }

      const allSuccessful = repairs.every(r => r.status === 'success')
      const requiresManual = repairs.some(r => r.status === 'manual_required')

      return {
        success: allSuccessful,
        repairs,
        requiresManualIntervention: requiresManual
      }

    } catch (error) {
      repairs.push({
        type: 'repair_failed',
        status: 'error',
        message: `Repair process failed: ${error.message}`
      })

      return {
        success: false,
        repairs,
        requiresManualIntervention: true
      }
    }
  }

  async repairApiEndpoints() {
    console.log('🔧 Checking and repairing API endpoints...')
    
    const repairs = []
    const endpoints = [
      { path: '/api/categories', method: 'GET', params: '?user_id=test' },
      { path: '/api/kanban/tasks', method: 'GET' }
    ]

    for (const endpoint of endpoints) {
      try {
        const url = `http://localhost:3000${endpoint.path}${endpoint.params || ''}`
        const response = await fetch(url, { method: endpoint.method })
        
        if (response.status === 500) {
          const errorData = await response.json()
          
          if (errorData.details && errorData.details.includes('does not exist')) {
            repairs.push({
              type: 'column_missing',
              endpoint: endpoint.path,
              status: 'manual_required',
              message: `API endpoint failing due to missing database column`,
              details: errorData.details,
              suggestion: 'Check API query against actual database schema'
            })
          } else {
            repairs.push({
              type: 'api_error',
              endpoint: endpoint.path,
              status: 'error',
              message: `API returning 500 error`,
              details: errorData.error || errorData.details
            })
          }
        } else {
          repairs.push({
            type: 'api_check',
            endpoint: endpoint.path,
            status: 'success',
            message: `API endpoint responding correctly (${response.status})`
          })
        }
      } catch (e) {
        repairs.push({
          type: 'api_unreachable',
          endpoint: endpoint.path,
          status: 'error',
          message: `Cannot reach API endpoint: ${e.message}`
        })
      }
    }

    const allSuccessful = repairs.every(r => r.status === 'success')
    const requiresManual = repairs.some(r => r.status === 'manual_required')

    return {
      success: allSuccessful,
      repairs,
      requiresManualIntervention: requiresManual
    }
  }

  async runFullRepair() {
    console.log('🛠️  Running comprehensive database repair...\n')
    
    const startTime = Date.now()
    const allRepairs = []

    // Repair categories table
    const categoriesRepair = await this.repairCategoriesTable()
    allRepairs.push({
      component: 'categories_table',
      ...categoriesRepair
    })

    // Repair API endpoints
    const apiRepair = await this.repairApiEndpoints()
    allRepairs.push({
      component: 'api_endpoints',
      ...apiRepair
    })

    const duration = Date.now() - startTime
    
    // Generate summary
    const summary = {
      total_components: allRepairs.length,
      successful: allRepairs.filter(r => r.success).length,
      failed: allRepairs.filter(r => !r.success).length,
      manual_intervention_required: allRepairs.some(r => r.requiresManualIntervention),
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }

    return {
      summary,
      repairs: allRepairs
    }
  }

  getCategoriesTableSQL() {
    return `
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate >= 0),
        color VARCHAR(7),
        icon VARCHAR(10),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES auth.users(id),
        updated_by UUID REFERENCES auth.users(id),
        user_id UUID REFERENCES auth.users(id),
        UNIQUE(name, created_by)
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
      CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
      CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);

      -- Enable RLS
      ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

      -- Create policies
      CREATE POLICY IF NOT EXISTS "Users can view their own categories" ON categories
        FOR SELECT USING (auth.uid() = created_by);

      CREATE POLICY IF NOT EXISTS "Users can insert their own categories" ON categories
        FOR INSERT WITH CHECK (auth.uid() = created_by);

      CREATE POLICY IF NOT EXISTS "Users can update their own categories" ON categories
        FOR UPDATE USING (auth.uid() = created_by);

      CREATE POLICY IF NOT EXISTS "Users can delete their own categories" ON categories
        FOR DELETE USING (auth.uid() = created_by);

      -- Create trigger for updated_at
      CREATE OR REPLACE FUNCTION update_categories_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        NEW.updated_by = auth.uid();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_categories_updated_at
        BEFORE UPDATE ON categories
        FOR EACH ROW
        EXECUTE FUNCTION update_categories_updated_at();
    `
  }

  getAddColumnSQL(tableName, columnName) {
    const columnDefinitions = {
      description: 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;',
      icon: 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(10);',
      hourly_rate_usd: 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS hourly_rate_usd DECIMAL(10,2);',
      user_id: 'ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);'
    }

    return columnDefinitions[columnName] || `-- Unknown column: ${columnName}`
  }

  printRepairResults(results) {
    console.log('🛠️  Database Repair Results')
    console.log('=' .repeat(50))
    
    const summary = results.summary
    console.log(`Total Components: ${summary.total_components}`)
    console.log(`Successful: ✅ ${summary.successful}`)
    console.log(`Failed: ❌ ${summary.failed}`)
    console.log(`Manual Intervention Required: ${summary.manual_intervention_required ? '⚠️  Yes' : '✅ No'}`)
    console.log(`Duration: ${summary.duration_ms}ms`)
    console.log()

    // Detailed results
    results.repairs.forEach(componentRepair => {
      console.log(`📦 ${componentRepair.component.toUpperCase()}`)
      console.log(`   Status: ${componentRepair.success ? '✅ Success' : '❌ Failed'}`)
      
      componentRepair.repairs.forEach(repair => {
        const emoji = repair.status === 'success' ? '✅' : 
                     repair.status === 'manual_required' ? '⚠️' : '❌'
        console.log(`   ${emoji} ${repair.type}: ${repair.message}`)
        
        if (repair.sql) {
          console.log(`       SQL: ${repair.sql.split('\n')[0]}...`)
        }
        
        if (repair.suggestion) {
          console.log(`       💡 ${repair.suggestion}`)
        }
      })
      console.log()
    })

    // Manual intervention instructions
    if (summary.manual_intervention_required) {
      console.log('📋 Manual Intervention Required')
      console.log('=' .repeat(50))
      console.log('The following steps need to be performed manually in your Supabase dashboard:')
      console.log('1. Go to https://app.supabase.com')
      console.log('2. Open your project')
      console.log('3. Go to SQL Editor')
      console.log('4. Run the SQL commands shown above')
      console.log()
    }
  }
}

module.exports = DatabaseRepairTools

// If run directly
if (require.main === module) {
  const repairTools = new DatabaseRepairTools()
  
  repairTools.runFullRepair()
    .then((results) => {
      repairTools.printRepairResults(results)
      
      const exitCode = results.summary.failed > 0 ? 1 : 0
      process.exit(exitCode)
    })
    .catch((error) => {
      console.error('Repair process failed:', error.message)
      process.exit(1)
    })
} 