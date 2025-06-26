#!/usr/bin/env node

/**
 * Data Cleanup Tools
 * Automated and guided cleanup for data integrity issues
 */

const { createClient } = require('@supabase/supabase-js')
const DataValidator = require('./data-validator')
require('dotenv').config({ path: '.env.local' })

class DataCleanup {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)
    this.validator = new DataValidator()
    this.cleanupResults = []
  }

  async runAutomatedCleanup(dryRun = true) {
    console.log(`🧹 Starting ${dryRun ? 'DRY RUN' : 'LIVE'} data cleanup...\n`)
    
    const startTime = Date.now()
    
    // First, run validation to identify issues
    const validationResults = await this.validator.runFullValidation()
    
    if (validationResults.issues.length === 0) {
      console.log('✅ No data issues found - nothing to clean up!')
      return { success: true, cleaned: 0, issues: [] }
    }

    console.log(`Found ${validationResults.issues.length} issues to address...\n`)

    // Process each type of issue
    await this.cleanupOrphanedRecords(validationResults.issues, dryRun)
    await this.cleanupDuplicateData(validationResults.issues, dryRun)
    await this.cleanupInvalidData(validationResults.issues, dryRun)
    await this.cleanupInconsistentTimestamps(validationResults.issues, dryRun)
    await this.cleanupInactiveData(validationResults.issues, dryRun)

    const duration = Date.now() - startTime
    
    const summary = {
      mode: dryRun ? 'dry_run' : 'live_cleanup',
      duration_ms: duration,
      total_issues_found: validationResults.issues.length,
      cleanups_performed: this.cleanupResults.length,
      success: true,
      timestamp: new Date().toISOString()
    }

    return {
      summary,
      cleanups: this.cleanupResults,
      original_issues: validationResults.issues
    }
  }

  async cleanupOrphanedRecords(issues, dryRun) {
    const orphanedIssues = issues.filter(issue => 
      issue.category === 'referential_integrity' && 
      issue.type === 'error'
    )

    if (orphanedIssues.length === 0) return

    console.log(`🔗 Cleaning up ${orphanedIssues.length} referential integrity issues...`)

    for (const issue of orphanedIssues) {
      try {
        const { child_table, child_column, orphaned_count } = issue.details

        if (dryRun) {
          this.cleanupResults.push({
            type: 'orphaned_records',
            action: 'would_delete',
            table: child_table,
            column: child_column,
            affected_rows: orphaned_count,
            description: `Would delete ${orphaned_count} orphaned records from ${child_table}`
          })
        } else {
          // For live cleanup, we need to be very careful
          // This is a simplified approach - in production you'd want more sophisticated logic
          console.log(`⚠️  Live orphaned record cleanup not implemented for safety`)
          console.log(`   Manual intervention required for ${child_table}.${child_column}`)
          
          this.cleanupResults.push({
            type: 'orphaned_records',
            action: 'manual_required',
            table: child_table,
            column: child_column,
            affected_rows: orphaned_count,
            description: `Manual cleanup required for ${orphaned_count} orphaned records`
          })
        }
      } catch (e) {
        this.cleanupResults.push({
          type: 'orphaned_records',
          action: 'failed',
          error: e.message
        })
      }
    }
  }

  async cleanupDuplicateData(issues, dryRun) {
    const duplicateIssues = issues.filter(issue => 
      issue.category === 'duplicates' && 
      issue.type === 'error'
    )

    if (duplicateIssues.length === 0) return

    console.log(`🔄 Cleaning up ${duplicateIssues.length} duplicate data issues...`)

    for (const issue of duplicateIssues) {
      try {
        if (issue.message.includes('category')) {
          await this.cleanupDuplicateCategories(issue, dryRun)
        }
      } catch (e) {
        this.cleanupResults.push({
          type: 'duplicates',
          action: 'failed',
          error: e.message
        })
      }
    }
  }

  async cleanupDuplicateCategories(issue, dryRun) {
    const { duplicate_count } = issue.details

    if (dryRun) {
      this.cleanupResults.push({
        type: 'duplicate_categories',
        action: 'would_merge',
        affected_rows: duplicate_count,
        description: `Would merge ${duplicate_count} duplicate categories (keep newest, merge references)`
      })
      return
    }

    // Find actual duplicates
    const { data: categories } = await this.supabase
      .from('categories')
      .select('id, name, created_by, created_at')
      .order('created_at', { ascending: false })

    const duplicateGroups = {}
    
    categories?.forEach(cat => {
      const key = `${cat.name}:${cat.created_by}`
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = []
      }
      duplicateGroups[key].push(cat)
    })

    let mergedCount = 0
    
    for (const [key, group] of Object.entries(duplicateGroups)) {
      if (group.length > 1) {
        // Keep the newest, mark others for deletion
        const [keep, ...duplicates] = group
        
        console.log(`🔄 Merging duplicates for ${key}, keeping ${keep.id}`)
        
        // Update task references to point to the kept category
        for (const duplicate of duplicates) {
          const { error: updateError } = await this.supabase
            .from('tasks')
            .update({ category_id: keep.id })
            .eq('category_id', duplicate.id)

          if (updateError) {
            console.error(`Failed to update tasks for duplicate ${duplicate.id}:`, updateError)
            continue
          }

          // Delete the duplicate category
          const { error: deleteError } = await this.supabase
            .from('categories')
            .delete()
            .eq('id', duplicate.id)

          if (deleteError) {
            console.error(`Failed to delete duplicate ${duplicate.id}:`, deleteError)
          } else {
            mergedCount++
          }
        }
      }
    }

    this.cleanupResults.push({
      type: 'duplicate_categories',
      action: 'merged',
      affected_rows: mergedCount,
      description: `Merged ${mergedCount} duplicate categories`
    })
  }

  async cleanupInvalidData(issues, dryRun) {
    const invalidIssues = issues.filter(issue => 
      issue.category === 'constraints' || 
      issue.category === 'data_types'
    )

    if (invalidIssues.length === 0) return

    console.log(`🔧 Cleaning up ${invalidIssues.length} data validation issues...`)

    for (const issue of invalidIssues) {
      try {
        if (issue.message.includes('negative hourly rates')) {
          await this.fixNegativeRates(issue, dryRun)
        } else if (issue.message.includes('invalid color format')) {
          await this.fixInvalidColors(issue, dryRun)
        } else if (issue.message.includes('length limit')) {
          await this.fixLongNames(issue, dryRun)
        }
      } catch (e) {
        this.cleanupResults.push({
          type: 'invalid_data',
          action: 'failed',
          error: e.message
        })
      }
    }
  }

  async fixNegativeRates(issue, dryRun) {
    const { violations_count } = issue.details

    if (dryRun) {
      this.cleanupResults.push({
        type: 'negative_rates',
        action: 'would_fix',
        affected_rows: violations_count,
        description: `Would set ${violations_count} negative hourly rates to 0.00`
      })
      return
    }

    const { data: updated, error } = await this.supabase
      .from('categories')
      .update({ hourly_rate: 0.00 })
      .lt('hourly_rate', 0)
      .select('id, name')

    if (error) {
      throw error
    }

    this.cleanupResults.push({
      type: 'negative_rates',
      action: 'fixed',
      affected_rows: updated?.length || 0,
      description: `Fixed ${updated?.length || 0} negative hourly rates`
    })
  }

  async fixInvalidColors(issue, dryRun) {
    const { invalid_count } = issue.details

    if (dryRun) {
      this.cleanupResults.push({
        type: 'invalid_colors',
        action: 'would_fix',
        affected_rows: invalid_count,
        description: `Would reset ${invalid_count} invalid color values to default`
      })
      return
    }

    const { data: updated, error } = await this.supabase
      .from('categories')
      .update({ color: '#3B82F6' }) // Default blue
      .not('color', 'is', null)
      .not('color', 'like', '#%')
      .select('id, name')

    if (error) {
      throw error
    }

    this.cleanupResults.push({
      type: 'invalid_colors',
      action: 'fixed',
      affected_rows: updated?.length || 0,
      description: `Fixed ${updated?.length || 0} invalid color formats`
    })
  }

  async fixLongNames(issue, dryRun) {
    const { violations_count } = issue.details

    if (dryRun) {
      this.cleanupResults.push({
        type: 'long_names',
        action: 'would_truncate',
        affected_rows: violations_count,
        description: `Would truncate ${violations_count} category names to 100 characters`
      })
      return
    }

    // Get long names and truncate them
    const { data: longNames } = await this.supabase
      .from('categories')
      .select('id, name')
      .gt('name', 'length', 100)

    let fixedCount = 0

    for (const category of longNames || []) {
      const truncatedName = category.name.substring(0, 97) + '...'
      
      const { error } = await this.supabase
        .from('categories')
        .update({ name: truncatedName })
        .eq('id', category.id)

      if (!error) {
        fixedCount++
      }
    }

    this.cleanupResults.push({
      type: 'long_names',
      action: 'truncated',
      affected_rows: fixedCount,
      description: `Truncated ${fixedCount} category names to fit length limit`
    })
  }

  async cleanupInconsistentTimestamps(issues, dryRun) {
    const timestampIssues = issues.filter(issue => 
      issue.category === 'data_consistency' && 
      issue.message.includes('timestamp')
    )

    if (timestampIssues.length === 0) return

    console.log(`⏰ Cleaning up ${timestampIssues.length} timestamp issues...`)

    for (const issue of timestampIssues) {
      try {
        const { inconsistent_count } = issue.details

        if (dryRun) {
          this.cleanupResults.push({
            type: 'inconsistent_timestamps',
            action: 'would_fix',
            affected_rows: inconsistent_count,
            description: `Would fix ${inconsistent_count} records with created_at > updated_at`
          })
        } else {
          // Fix by setting updated_at = created_at for these records
          const tables = ['categories', 'tasks', 'comments', 'subtasks']
          let totalFixed = 0

          for (const table of tables) {
            const { data: fixed, error } = await this.supabase
              .from(table)
              .update({ updated_at: 'created_at' })
              .gt('created_at', 'updated_at')
              .select('id')

            if (!error) {
              totalFixed += fixed?.length || 0
            }
          }

          this.cleanupResults.push({
            type: 'inconsistent_timestamps',
            action: 'fixed',
            affected_rows: totalFixed,
            description: `Fixed ${totalFixed} inconsistent timestamps`
          })
        }
      } catch (e) {
        this.cleanupResults.push({
          type: 'inconsistent_timestamps',
          action: 'failed',
          error: e.message
        })
      }
    }
  }

  async cleanupInactiveData(issues, dryRun) {
    const inactiveIssues = issues.filter(issue => 
      issue.message.includes('inactive') && 
      issue.category === 'data_consistency'
    )

    if (inactiveIssues.length === 0) return

    console.log(`💤 Analyzing ${inactiveIssues.length} inactive data issues...`)

    for (const issue of inactiveIssues) {
      try {
        if (issue.message.includes('categories')) {
          const { categories_count } = issue.details

          this.cleanupResults.push({
            type: 'inactive_categories_with_tasks',
            action: 'manual_review_required',
            affected_rows: categories_count,
            description: `${categories_count} inactive categories still have tasks - manual review recommended`,
            suggestion: 'Either reactivate categories or reassign tasks to active categories'
          })
        }
      } catch (e) {
        this.cleanupResults.push({
          type: 'inactive_data',
          action: 'failed',
          error: e.message
        })
      }
    }
  }

  printCleanupResults() {
    console.log('\n🧹 Data Cleanup Results')
    console.log('=' .repeat(60))
    
    if (this.cleanupResults.length === 0) {
      console.log('No cleanup operations performed.')
      return
    }

    // Group by type
    const resultsByType = {}
    this.cleanupResults.forEach(result => {
      if (!resultsByType[result.type]) {
        resultsByType[result.type] = []
      }
      resultsByType[result.type].push(result)
    })

    Object.keys(resultsByType).forEach(type => {
      console.log(`\n📋 ${type.toUpperCase().replace(/_/g, ' ')}`)
      console.log('-'.repeat(40))
      
      resultsByType[type].forEach(result => {
        const emoji = result.action.includes('failed') ? '❌' : 
                     result.action.includes('would') ? '🔍' : 
                     result.action.includes('manual') ? '⚠️' : '✅'
        
        console.log(`${emoji} ${result.description}`)
        
        if (result.affected_rows !== undefined) {
          console.log(`   Affected rows: ${result.affected_rows}`)
        }
        
        if (result.suggestion) {
          console.log(`   💡 ${result.suggestion}`)
        }
        
        if (result.error) {
          console.log(`   Error: ${result.error}`)
        }
        
        console.log()
      })
    })
  }

  async optimizeDatabase() {
    console.log('🚀 Running database optimization...')
    
    const optimizations = []
    
    try {
      // Analyze table statistics (simulated - would need direct DB access for real ANALYZE)
      const tables = ['categories', 'tasks', 'comments', 'subtasks']
      
      for (const table of tables) {
        const { count } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        optimizations.push({
          type: 'table_stats',
          table,
          record_count: count,
          suggestion: count > 10000 ? 'Consider archiving old records' : 'Table size is optimal'
        })
      }
      
      // Check for missing indexes (would need direct DB access for real analysis)
      optimizations.push({
        type: 'index_analysis',
        suggestion: 'Run EXPLAIN ANALYZE on frequent queries to identify missing indexes'
      })
      
      console.log('\n📊 Database Optimization Report')
      console.log('=' .repeat(50))
      
      optimizations.forEach(opt => {
        console.log(`📈 ${opt.type}: ${opt.suggestion}`)
        if (opt.table) {
          console.log(`   Table: ${opt.table}, Records: ${opt.record_count}`)
        }
      })
      
      return optimizations
      
    } catch (e) {
      console.error('Optimization analysis failed:', e.message)
      return []
    }
  }
}

module.exports = DataCleanup

// If run directly
if (require.main === module) {
  const cleanup = new DataCleanup()
  const dryRun = !process.argv.includes('--live')
  
  if (!dryRun) {
    console.log('⚠️  WARNING: Running in LIVE mode - data will be modified!')
    console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...')
    
    setTimeout(() => {
      runCleanup()
    }, 5000)
  } else {
    runCleanup()
  }
  
  async function runCleanup() {
    try {
      const results = await cleanup.runAutomatedCleanup(dryRun)
      cleanup.printCleanupResults()
      
      if (dryRun) {
        console.log('\n💡 This was a dry run. Use --live flag to perform actual cleanup.')
      }
      
      await cleanup.optimizeDatabase()
      
      process.exit(0)
    } catch (error) {
      console.error('Cleanup failed:', error.message)
      process.exit(1)
    }
  }
} 