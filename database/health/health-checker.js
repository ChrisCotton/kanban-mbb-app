#!/usr/bin/env node

/**
 * Database Health Checker
 * Comprehensive system to verify database health and schema integrity
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

class DatabaseHealthChecker {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)
    this.results = []
    this.errors = []
  }

  // Expected table schemas
  getExpectedSchemas() {
    return {
      categories: {
        required_columns: ['id', 'name', 'hourly_rate', 'color', 'is_active', 'created_at', 'updated_at', 'created_by', 'updated_by'],
        optional_columns: ['description', 'icon', 'user_id'],
        constraints: ['categories_name_user_unique'],
        indexes: ['idx_categories_name', 'idx_categories_active', 'idx_categories_created_by']
      },
      tasks: {
        required_columns: ['id', 'title', 'description', 'status', 'priority', 'created_at', 'updated_at'],
        optional_columns: ['due_date', 'category_id', 'assigned_to'],
        constraints: [],
        indexes: []
      },
      comments: {
        required_columns: ['id', 'task_id', 'content', 'created_at', 'created_by'],
        optional_columns: ['updated_at'],
        constraints: [],
        indexes: []
      },
      subtasks: {
        required_columns: ['id', 'task_id', 'title', 'completed', 'created_at'],
        optional_columns: ['due_date', 'updated_at'],
        constraints: [],
        indexes: []
      }
    }
  }

  async checkConnection() {
    const check = { name: 'Database Connection', status: 'checking' }
    
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('count')
        .limit(1)
      
      if (error && error.code === '42P01') {
        check.status = 'warning'
        check.message = 'Categories table does not exist'
        check.details = error.message
      } else if (error) {
        check.status = 'error'
        check.message = 'Database connection failed'
        check.details = error.message
      } else {
        check.status = 'success'
        check.message = 'Database connection successful'
      }
    } catch (e) {
      check.status = 'error'
      check.message = 'Database connection failed'
      check.details = e.message
    }
    
    this.results.push(check)
    return check
  }

  async checkAuthentication() {
    const check = { name: 'Authentication System', status: 'checking' }
    
    try {
      const { data, error } = await this.supabase.auth.admin.listUsers()
      
      if (error) {
        check.status = 'error'
        check.message = 'Cannot access auth system'
        check.details = error.message
      } else {
        check.status = 'success'
        check.message = `Auth system working (${data.users.length} users)`
        check.user_count = data.users.length
      }
    } catch (e) {
      check.status = 'error'
      check.message = 'Auth system check failed'
      check.details = e.message
    }
    
    this.results.push(check)
    return check
  }

  async checkTableExists(tableName) {
    const check = { name: `Table: ${tableName}`, status: 'checking' }
    
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error && error.code === '42P01') {
        check.status = 'error'
        check.message = `Table '${tableName}' does not exist`
        check.details = error.message
      } else if (error) {
        check.status = 'warning'
        check.message = `Table '${tableName}' exists but has issues`
        check.details = error.message
      } else {
        check.status = 'success'
        check.message = `Table '${tableName}' exists and accessible`
        check.record_count = data ? data.length : 0
      }
    } catch (e) {
      check.status = 'error'
      check.message = `Failed to check table '${tableName}'`
      check.details = e.message
    }
    
    this.results.push(check)
    return check
  }

  async checkTableSchema(tableName) {
    const expectedSchema = this.getExpectedSchemas()[tableName]
    if (!expectedSchema) return null

    const check = { name: `Schema: ${tableName}`, status: 'checking' }
    const issues = []
    const foundColumns = []

    try {
      // Test each required column
      for (const column of expectedSchema.required_columns) {
        try {
          const { error } = await this.supabase
            .from(tableName)
            .select(column)
            .limit(1)
          
          if (!error) {
            foundColumns.push(column)
          } else {
            issues.push(`Missing required column: ${column}`)
          }
        } catch (e) {
          issues.push(`Cannot test column ${column}: ${e.message}`)
        }
      }

      // Test optional columns
      for (const column of expectedSchema.optional_columns || []) {
        try {
          const { error } = await this.supabase
            .from(tableName)
            .select(column)
            .limit(1)
          
          if (!error) {
            foundColumns.push(column)
          }
        } catch (e) {
          // Optional columns can be missing
        }
      }

      if (issues.length === 0) {
        check.status = 'success'
        check.message = `Schema for '${tableName}' is correct`
      } else if (issues.length < expectedSchema.required_columns.length) {
        check.status = 'warning'
        check.message = `Schema for '${tableName}' has issues`
      } else {
        check.status = 'error'
        check.message = `Schema for '${tableName}' is severely broken`
      }

      check.found_columns = foundColumns
      check.issues = issues
      check.expected_columns = [...expectedSchema.required_columns, ...(expectedSchema.optional_columns || [])]

    } catch (e) {
      check.status = 'error'
      check.message = `Failed to check schema for '${tableName}'`
      check.details = e.message
    }

    this.results.push(check)
    return check
  }

  async checkRLSPolicies(tableName) {
    const check = { name: `RLS Policies: ${tableName}`, status: 'checking' }
    
    try {
      // Try to query with and without authentication to test RLS
      const { data: publicData, error: publicError } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (publicError && publicError.message.includes('RLS')) {
        check.status = 'success'
        check.message = `RLS is enabled for '${tableName}'`
      } else if (publicError) {
        check.status = 'warning'
        check.message = `RLS status unclear for '${tableName}'`
        check.details = publicError.message
      } else {
        check.status = 'warning'
        check.message = `RLS may not be properly configured for '${tableName}'`
      }
    } catch (e) {
      check.status = 'error'
      check.message = `Failed to check RLS for '${tableName}'`
      check.details = e.message
    }

    this.results.push(check)
    return check
  }

  async checkApiEndpoints() {
    const endpoints = [
      { path: '/api/health', method: 'GET' },
      { path: '/api/categories', method: 'GET', params: '?user_id=test' },
      { path: '/api/kanban/tasks', method: 'GET' }
    ]

    for (const endpoint of endpoints) {
      const check = { name: `API: ${endpoint.method} ${endpoint.path}`, status: 'checking' }
      
      try {
        const url = `http://localhost:3000${endpoint.path}${endpoint.params || ''}`
        const response = await fetch(url, { method: endpoint.method })
        
        if (response.status === 500) {
          check.status = 'error'
          check.message = '500 Internal Server Error'
          const errorData = await response.json()
          check.details = errorData.error || errorData.details
        } else if (response.status >= 400) {
          check.status = 'warning'
          check.message = `HTTP ${response.status}`
          const errorData = await response.json()
          check.details = errorData.error || errorData.message
        } else {
          check.status = 'success'
          check.message = `HTTP ${response.status}`
        }
      } catch (e) {
        check.status = 'error'
        check.message = 'Endpoint unreachable'
        check.details = e.message
      }

      this.results.push(check)
    }
  }

  async runFullHealthCheck() {
    console.log('🏥 Starting comprehensive database health check...\n')
    
    const startTime = Date.now()
    
    // Core connectivity
    await this.checkConnection()
    await this.checkAuthentication()
    
    // Table existence
    const tables = Object.keys(this.getExpectedSchemas())
    for (const table of tables) {
      await this.checkTableExists(table)
      await this.checkTableSchema(table)
      await this.checkRLSPolicies(table)
    }
    
    // API endpoints
    await this.checkApiEndpoints()
    
    const duration = Date.now() - startTime
    
    // Summary
    const summary = this.generateSummary()
    summary.duration_ms = duration
    
    return {
      summary,
      details: this.results,
      errors: this.errors
    }
  }

  generateSummary() {
    const total = this.results.length
    const success = this.results.filter(r => r.status === 'success').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const errors = this.results.filter(r => r.status === 'error').length
    
    let overallStatus = 'healthy'
    if (errors > 0) overallStatus = 'critical'
    else if (warnings > 0) overallStatus = 'warnings'
    
    return {
      overall_status: overallStatus,
      total_checks: total,
      successful: success,
      warnings,
      errors,
      health_score: Math.round((success / total) * 100)
    }
  }

  printResults() {
    const summary = this.generateSummary()
    
    console.log('📊 Health Check Results')
    console.log('=' .repeat(50))
    console.log(`Overall Status: ${this.getStatusEmoji(summary.overall_status)} ${summary.overall_status.toUpperCase()}`)
    console.log(`Health Score: ${summary.health_score}%`)
    console.log(`Total Checks: ${summary.total_checks}`)
    console.log(`✅ Success: ${summary.successful}`)
    console.log(`⚠️  Warnings: ${summary.warnings}`)
    console.log(`❌ Errors: ${summary.errors}`)
    console.log()
    
    // Detailed results
    this.results.forEach(result => {
      const emoji = this.getStatusEmoji(result.status)
      console.log(`${emoji} ${result.name}: ${result.message}`)
      if (result.details) {
        console.log(`   ${result.details}`)
      }
      if (result.issues && result.issues.length > 0) {
        result.issues.forEach(issue => console.log(`   - ${issue}`))
      }
    })
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'success': case 'healthy': return '✅'
      case 'warning': case 'warnings': return '⚠️'
      case 'error': case 'critical': return '❌'
      default: return '🔄'
    }
  }
}

module.exports = DatabaseHealthChecker

// If run directly
if (require.main === module) {
  const healthChecker = new DatabaseHealthChecker()
  
  healthChecker.runFullHealthCheck()
    .then((results) => {
      healthChecker.printResults()
      
      const exitCode = results.summary.overall_status === 'critical' ? 1 : 0
      process.exit(exitCode)
    })
    .catch((error) => {
      console.error('Health check failed:', error.message)
      process.exit(1)
    })
} 