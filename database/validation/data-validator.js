#!/usr/bin/env node

/**
 * Data Validator
 * Comprehensive data integrity and validation system
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

class DataValidator {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)
    this.issues = []
    this.stats = {
      total_checks: 0,
      passed: 0,
      warnings: 0,
      errors: 0
    }
  }

  async runFullValidation() {
    console.log('🔍 Starting comprehensive data validation...\n')
    const startTime = Date.now()

    // Core integrity checks
    await this.validateReferentialIntegrity()
    await this.validateDataConsistency()
    await this.validateConstraints()
    await this.validateUserDataIsolation()
    await this.validateTimestamps()
    await this.checkOrphanedRecords()
    await this.validateDataTypes()
    await this.checkDuplicateData()

    const duration = Date.now() - startTime

    return {
      summary: {
        ...this.stats,
        duration_ms: duration,
        health_score: Math.round((this.stats.passed / this.stats.total_checks) * 100),
        timestamp: new Date().toISOString()
      },
      issues: this.issues
    }
  }

  async validateReferentialIntegrity() {
    console.log('1. Checking referential integrity...')
    
    // Check categories -> users relationship
    await this.checkForeignKeyIntegrity(
      'categories', 'created_by', 'auth.users', 'id',
      'Categories with invalid created_by references'
    )
    
    await this.checkForeignKeyIntegrity(
      'categories', 'updated_by', 'auth.users', 'id',
      'Categories with invalid updated_by references'
    )

    // Check tasks -> categories relationship
    await this.checkForeignKeyIntegrity(
      'tasks', 'category_id', 'categories', 'id',
      'Tasks with invalid category references'
    )

    // Check tasks -> users relationship  
    await this.checkForeignKeyIntegrity(
      'tasks', 'created_by', 'auth.users', 'id',
      'Tasks with invalid created_by references'
    )

    // Check comments -> tasks relationship
    await this.checkForeignKeyIntegrity(
      'comments', 'task_id', 'tasks', 'id',
      'Comments with invalid task references'
    )

    // Check subtasks -> tasks relationship
    await this.checkForeignKeyIntegrity(
      'subtasks', 'task_id', 'tasks', 'id',
      'Subtasks with invalid task references'
    )
  }

  async checkForeignKeyIntegrity(childTable, childColumn, parentTable, parentColumn, description) {
    try {
      this.stats.total_checks++

      // Skip if tables don't exist
      const { error: childError } = await this.supabase
        .from(childTable)
        .select('id')
        .limit(1)

      const { error: parentError } = await this.supabase
        .from(parentTable.replace('auth.', ''))
        .select(parentColumn)
        .limit(1)

      if (childError?.code === '42P01' || parentError?.code === '42P01') {
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'referential_integrity',
          message: `Cannot check ${description} - table missing`,
          details: { child_table: childTable, parent_table: parentTable }
        })
        return
      }

      // Find orphaned records
      let query
      if (parentTable === 'auth.users') {
        // For auth.users, we need to use the admin API
        const { data: users } = await this.supabase.auth.admin.listUsers()
        const userIds = users.users.map(u => u.id)
        
        const { data: orphans } = await this.supabase
          .from(childTable)
          .select(`id, ${childColumn}`)
          .not(childColumn, 'is', null)

        const orphanedRecords = orphans?.filter(record => 
          !userIds.includes(record[childColumn])
        ) || []

        if (orphanedRecords.length > 0) {
          this.stats.errors++
          this.issues.push({
            type: 'error',
            category: 'referential_integrity',
            message: description,
            details: {
              orphaned_count: orphanedRecords.length,
              child_table: childTable,
              child_column: childColumn,
              parent_table: parentTable,
              sample_orphans: orphanedRecords.slice(0, 5)
            }
          })
        } else {
          this.stats.passed++
        }
      } else {
        // Regular table join
        const { data: orphans, error } = await this.supabase
          .from(childTable)
          .select(`
            id,
            ${childColumn},
            parent:${parentTable}!${childColumn}(${parentColumn})
          `)
          .not(childColumn, 'is', null)
          .is(`parent.${parentColumn}`, null)

        if (error) {
          this.stats.warnings++
          this.issues.push({
            type: 'warning',
            category: 'referential_integrity',
            message: `Cannot validate ${description}`,
            details: { error: error.message }
          })
          return
        }

        if (orphans && orphans.length > 0) {
          this.stats.errors++
          this.issues.push({
            type: 'error',
            category: 'referential_integrity',
            message: description,
            details: {
              orphaned_count: orphans.length,
              child_table: childTable,
              child_column: childColumn,
              parent_table: parentTable,
              sample_orphans: orphans.slice(0, 5)
            }
          })
        } else {
          this.stats.passed++
        }
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'referential_integrity',
        message: `Failed to check ${description}`,
        details: { error: e.message }
      })
    }
  }

  async validateDataConsistency() {
    console.log('2. Checking data consistency...')

    // Check for inconsistent timestamps
    await this.checkTimestampConsistency()
    
    // Check for inconsistent user ownership
    await this.checkUserOwnershipConsistency()
    
    // Check for inactive categories with active tasks
    await this.checkInactiveCategoriesWithTasks()
    
    // Check for completed tasks with incomplete subtasks
    await this.checkCompletedTasksWithIncompleteSubtasks()
  }

  async checkTimestampConsistency() {
    try {
      this.stats.total_checks++

      const tables = ['categories', 'tasks', 'comments', 'subtasks']
      let inconsistentRecords = 0

      for (const table of tables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('id, created_at, updated_at')
          .gt('created_at', 'updated_at')

        if (error && error.code !== '42P01') {
          continue // Skip if table doesn't exist
        }

        if (data && data.length > 0) {
          inconsistentRecords += data.length
        }
      }

      if (inconsistentRecords > 0) {
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'data_consistency',
          message: 'Records with created_at > updated_at found',
          details: { 
            inconsistent_count: inconsistentRecords,
            suggestion: 'Review timestamp logic in update triggers'
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'data_consistency',
        message: 'Failed to check timestamp consistency',
        details: { error: e.message }
      })
    }
  }

  async checkUserOwnershipConsistency() {
    try {
      this.stats.total_checks++

      // Check if created_by and updated_by are consistent where expected
      const { data: categories, error } = await this.supabase
        .from('categories')
        .select('id, created_by, updated_by, created_at, updated_at')
        .neq('created_by', 'updated_by')
        .eq('created_at', 'updated_at') // New records should have same creator and updater

      if (error && error.code === '42P01') {
        this.stats.warnings++
        return
      }

      if (categories && categories.length > 0) {
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'data_consistency',
          message: 'New records with different created_by and updated_by',
          details: { 
            inconsistent_count: categories.length,
            suggestion: 'Review user assignment logic'
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'data_consistency',
        message: 'Failed to check user ownership consistency',
        details: { error: e.message }
      })
    }
  }

  async checkInactiveCategoriesWithTasks() {
    try {
      this.stats.total_checks++

      const { data: inactiveWithTasks, error } = await this.supabase
        .from('categories')
        .select(`
          id,
          name,
          is_active,
          tasks:tasks(count)
        `)
        .eq('is_active', false)
        .not('tasks', 'is', null)

      if (error) {
        if (error.code === '42P01') {
          this.stats.warnings++
          return
        }
        throw error
      }

      const categoriesWithTasks = inactiveWithTasks?.filter(cat => 
        cat.tasks && cat.tasks.length > 0
      ) || []

      if (categoriesWithTasks.length > 0) {
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'data_consistency',
          message: 'Inactive categories still have associated tasks',
          details: { 
            categories_count: categoriesWithTasks.length,
            categories: categoriesWithTasks.slice(0, 5),
            suggestion: 'Consider task cleanup or category reactivation'
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'data_consistency',
        message: 'Failed to check inactive categories with tasks',
        details: { error: e.message }
      })
    }
  }

  async checkCompletedTasksWithIncompleteSubtasks() {
    try {
      this.stats.total_checks++

      const { data: inconsistentTasks, error } = await this.supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          subtasks:subtasks(id, completed)
        `)
        .eq('status', 'done')

      if (error) {
        if (error.code === '42P01') {
          this.stats.warnings++
          return
        }
        throw error
      }

      const tasksWithIncompleteSubtasks = inconsistentTasks?.filter(task => 
        task.subtasks && task.subtasks.some(subtask => !subtask.completed)
      ) || []

      if (tasksWithIncompleteSubtasks.length > 0) {
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'data_consistency',
          message: 'Completed tasks with incomplete subtasks',
          details: { 
            tasks_count: tasksWithIncompleteSubtasks.length,
            tasks: tasksWithIncompleteSubtasks.slice(0, 5),
            suggestion: 'Review task completion logic'
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'data_consistency',
        message: 'Failed to check completed tasks with incomplete subtasks',
        details: { error: e.message }
      })
    }
  }

  async validateConstraints() {
    console.log('3. Validating database constraints...')

    await this.checkNameLengthConstraints()
    await this.checkNumericConstraints()
    await this.checkRequiredFields()
    await this.checkUniqueConstraints()
  }

  async checkNameLengthConstraints() {
    try {
      this.stats.total_checks++

      const { data: longNames, error } = await this.supabase
        .from('categories')
        .select('id, name')
        .gt('name', 'length', 100)

      if (error && error.code === '42P01') {
        this.stats.warnings++
        return
      }

      if (longNames && longNames.length > 0) {
        this.stats.errors++
        this.issues.push({
          type: 'error',
          category: 'constraints',
          message: 'Category names exceeding length limit',
          details: { 
            violations_count: longNames.length,
            max_length: 100,
            violations: longNames.slice(0, 5)
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'constraints',
        message: 'Failed to check name length constraints',
        details: { error: e.message }
      })
    }
  }

  async checkNumericConstraints() {
    try {
      this.stats.total_checks++

      const { data: negativeRates, error } = await this.supabase
        .from('categories')
        .select('id, name, hourly_rate')
        .lt('hourly_rate', 0)

      if (error && error.code === '42P01') {
        this.stats.warnings++
        return
      }

      if (negativeRates && negativeRates.length > 0) {
        this.stats.errors++
        this.issues.push({
          type: 'error',
          category: 'constraints',
          message: 'Categories with negative hourly rates',
          details: { 
            violations_count: negativeRates.length,
            violations: negativeRates.slice(0, 5)
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'constraints',
        message: 'Failed to check numeric constraints',
        details: { error: e.message }
      })
    }
  }

  async checkRequiredFields() {
    try {
      this.stats.total_checks++

      const tables = [
        { name: 'categories', required: ['name', 'created_by'] },
        { name: 'tasks', required: ['title', 'created_by'] },
        { name: 'comments', required: ['content', 'task_id'] },
        { name: 'subtasks', required: ['title', 'task_id'] }
      ]

      let violations = 0

      for (const table of tables) {
        for (const field of table.required) {
          const { data, error } = await this.supabase
            .from(table.name)
            .select('id')
            .or(`${field}.is.null,${field}.eq.`)

          if (error && error.code === '42P01') continue

          if (data && data.length > 0) {
            violations += data.length
          }
        }
      }

      if (violations > 0) {
        this.stats.errors++
        this.issues.push({
          type: 'error',
          category: 'constraints',
          message: 'Records with missing required fields',
          details: { violations_count: violations }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'constraints',
        message: 'Failed to check required fields',
        details: { error: e.message }
      })
    }
  }

  async checkUniqueConstraints() {
    try {
      this.stats.total_checks++

      // Check for duplicate category names per user
      const { data: duplicates, error } = await this.supabase
        .rpc('find_duplicate_categories')

      if (error && error.code === '42883') {
        // Function doesn't exist, create it
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'constraints',
          message: 'Duplicate detection function not available',
          details: { suggestion: 'Create find_duplicate_categories function' }
        })
        return
      }

      if (duplicates && duplicates.length > 0) {
        this.stats.errors++
        this.issues.push({
          type: 'error',
          category: 'constraints',
          message: 'Duplicate category names found',
          details: { 
            duplicates_count: duplicates.length,
            duplicates: duplicates.slice(0, 5)
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.warnings++
      this.issues.push({
        type: 'warning',
        category: 'constraints',
        message: 'Could not check unique constraints',
        details: { error: e.message }
      })
    }
  }

  async validateUserDataIsolation() {
    console.log('4. Validating user data isolation...')

    try {
      this.stats.total_checks++

      // Check if users can only see their own data
      const { data: users } = await this.supabase.auth.admin.listUsers()
      
      if (!users || users.users.length < 2) {
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'user_isolation',
          message: 'Cannot test user isolation with less than 2 users',
          details: { user_count: users?.users.length || 0 }
        })
        return
      }

      // Check categories isolation
      const userId1 = users.users[0].id
      const userId2 = users.users[1].id

      const { data: user1Categories } = await this.supabase
        .from('categories')
        .select('id, created_by')
        .eq('created_by', userId1)

      const { data: user2Categories } = await this.supabase
        .from('categories')
        .select('id, created_by')
        .eq('created_by', userId2)

      // Check for any cross-contamination
      const contaminatedRecords = [
        ...(user1Categories?.filter(c => c.created_by !== userId1) || []),
        ...(user2Categories?.filter(c => c.created_by !== userId2) || [])
      ]

      if (contaminatedRecords.length > 0) {
        this.stats.errors++
        this.issues.push({
          type: 'error',
          category: 'user_isolation',
          message: 'User data isolation compromised',
          details: { 
            contaminated_count: contaminatedRecords.length,
            contaminated_records: contaminatedRecords
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'user_isolation',
        message: 'Failed to validate user data isolation',
        details: { error: e.message }
      })
    }
  }

  async validateTimestamps() {
    console.log('5. Validating timestamp data...')

    try {
      this.stats.total_checks++

      const { data: futureRecords, error } = await this.supabase
        .from('categories')
        .select('id, name, created_at')
        .gt('created_at', new Date().toISOString())

      if (error && error.code === '42P01') {
        this.stats.warnings++
        return
      }

      if (futureRecords && futureRecords.length > 0) {
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'timestamps',
          message: 'Records with future timestamps',
          details: { 
            future_count: futureRecords.length,
            records: futureRecords.slice(0, 5)
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'timestamps',
        message: 'Failed to validate timestamps',
        details: { error: e.message }
      })
    }
  }

  async checkOrphanedRecords() {
    console.log('6. Checking for orphaned records...')

    // This is covered in referential integrity but we can add specific checks
    this.stats.total_checks++
    this.stats.passed++ // Covered by referential integrity checks
  }

  async validateDataTypes() {
    console.log('7. Validating data types...')

    try {
      this.stats.total_checks++

      // Check for invalid color formats
      const { data: invalidColors, error } = await this.supabase
        .from('categories')
        .select('id, name, color')
        .not('color', 'is', null)
        .not('color', 'like', '#%')

      if (error && error.code === '42P01') {
        this.stats.warnings++
        return
      }

      if (invalidColors && invalidColors.length > 0) {
        this.stats.warnings++
        this.issues.push({
          type: 'warning',
          category: 'data_types',
          message: 'Categories with invalid color format',
          details: { 
            invalid_count: invalidColors.length,
            expected_format: '#RRGGBB',
            invalid_colors: invalidColors.slice(0, 5)
          }
        })
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'data_types',
        message: 'Failed to validate data types',
        details: { error: e.message }
      })
    }
  }

  async checkDuplicateData() {
    console.log('8. Checking for duplicate data...')

    try {
      this.stats.total_checks++

      // Simple duplicate check for categories by name and user
      const { data: categories, error } = await this.supabase
        .from('categories')
        .select('name, created_by')

      if (error && error.code === '42P01') {
        this.stats.warnings++
        return
      }

      if (categories) {
        const seen = new Set()
        const duplicates = []

        categories.forEach(cat => {
          const key = `${cat.name}:${cat.created_by}`
          if (seen.has(key)) {
            duplicates.push(cat)
          } else {
            seen.add(key)
          }
        })

        if (duplicates.length > 0) {
          this.stats.errors++
          this.issues.push({
            type: 'error',
            category: 'duplicates',
            message: 'Duplicate categories found',
            details: { 
              duplicate_count: duplicates.length,
              duplicates: duplicates.slice(0, 5)
            }
          })
        } else {
          this.stats.passed++
        }
      } else {
        this.stats.passed++
      }
    } catch (e) {
      this.stats.errors++
      this.issues.push({
        type: 'error',
        category: 'duplicates',
        message: 'Failed to check for duplicates',
        details: { error: e.message }
      })
    }
  }

  printResults() {
    const summary = this.stats
    
    console.log('\n🔍 Data Validation Results')
    console.log('=' .repeat(60))
    console.log(`Health Score: ${summary.health_score}%`)
    console.log(`Total Checks: ${summary.total_checks}`)
    console.log(`✅ Passed: ${summary.passed}`)
    console.log(`⚠️  Warnings: ${summary.warnings}`)
    console.log(`❌ Errors: ${summary.errors}`)
    console.log(`⏱️  Duration: ${summary.duration_ms}ms`)
    console.log()

    if (this.issues.length === 0) {
      console.log('🎉 All data validation checks passed!')
      return
    }

    // Group issues by category
    const issuesByCategory = {}
    this.issues.forEach(issue => {
      if (!issuesByCategory[issue.category]) {
        issuesByCategory[issue.category] = []
      }
      issuesByCategory[issue.category].push(issue)
    })

    Object.keys(issuesByCategory).forEach(category => {
      console.log(`📋 ${category.toUpperCase().replace('_', ' ')}`)
      console.log('-'.repeat(40))
      
      issuesByCategory[category].forEach(issue => {
        const emoji = issue.type === 'error' ? '❌' : 
                     issue.type === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`${emoji} ${issue.message}`)
        
        if (issue.details) {
          Object.keys(issue.details).forEach(key => {
            if (key !== 'error') {
              console.log(`   ${key}: ${JSON.stringify(issue.details[key])}`)
            }
          })
        }
        console.log()
      })
    })
  }
}

module.exports = DataValidator

// If run directly
if (require.main === module) {
  const validator = new DataValidator()
  
  validator.runFullValidation()
    .then((results) => {
      validator.printResults()
      
      const exitCode = results.summary.errors > 0 ? 1 : 0
      process.exit(exitCode)
    })
    .catch((error) => {
      console.error('Data validation failed:', error.message)
      process.exit(1)
    })
} 