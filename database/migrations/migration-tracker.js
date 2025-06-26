#!/usr/bin/env node

/**
 * Migration Tracker
 * Tracks which migrations have been applied and provides rollback capabilities
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

class MigrationTracker {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)
    this.migrationTableName = '_migration_history'
  }

  async ensureMigrationTable() {
    // Create migration tracking table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationTableName} (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT,
        rollback_sql TEXT,
        checksum VARCHAR(64)
      );
      
      CREATE INDEX IF NOT EXISTS idx_migration_history_name ON ${this.migrationTableName}(migration_name);
      CREATE INDEX IF NOT EXISTS idx_migration_history_applied_at ON ${this.migrationTableName}(applied_at);
    `

    try {
      // Try to create the table using a simple insert/select test
      const { data, error } = await this.supabase
        .from(this.migrationTableName)
        .select('*')
        .limit(1)

      if (error && error.code === '42P01') {
        console.log('📋 Creating migration tracking table...')
        // Table doesn't exist, we need to create it
        // Since we can't execute raw SQL easily, we'll note this for manual creation
        console.log('⚠️  Migration table needs to be created manually in Supabase dashboard:')
        console.log(createTableSQL)
        return false
      }

      return true
    } catch (e) {
      console.error('Failed to ensure migration table exists:', e.message)
      return false
    }
  }

  async recordMigration(migrationName, success = true, errorMessage = null, rollbackSql = null, checksum = null) {
    try {
      const { data, error } = await this.supabase
        .from(this.migrationTableName)
        .insert({
          migration_name: migrationName,
          success,
          error_message: errorMessage,
          rollback_sql: rollbackSql,
          checksum
        })
        .select()

      if (error) {
        console.error('Failed to record migration:', error.message)
        return false
      }

      return data[0]
    } catch (e) {
      console.error('Failed to record migration:', e.message)
      return false
    }
  }

  async getMigrationHistory() {
    try {
      const { data, error } = await this.supabase
        .from(this.migrationTableName)
        .select('*')
        .order('applied_at', { ascending: true })

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          return []
        }
        throw error
      }

      return data || []
    } catch (e) {
      console.error('Failed to get migration history:', e.message)
      return []
    }
  }

  async isMigrationApplied(migrationName) {
    try {
      const { data, error } = await this.supabase
        .from(this.migrationTableName)
        .select('success')
        .eq('migration_name', migrationName)
        .maybeSingle()

      if (error && error.code !== '42P01') {
        throw error
      }

      return data ? data.success : false
    } catch (e) {
      console.error('Failed to check migration status:', e.message)
      return false
    }
  }

  async getAppliedMigrations() {
    const history = await this.getMigrationHistory()
    return history
      .filter(m => m.success)
      .map(m => m.migration_name)
      .sort()
  }

  async getFailedMigrations() {
    const history = await this.getMigrationHistory()
    return history.filter(m => !m.success)
  }

  async getMigrationStatus() {
    const history = await this.getMigrationHistory()
    const applied = history.filter(m => m.success)
    const failed = history.filter(m => !m.success)

    return {
      total_migrations: history.length,
      successful: applied.length,
      failed: failed.length,
      last_migration: history.length > 0 ? history[history.length - 1] : null,
      applied_migrations: applied.map(m => m.migration_name),
      failed_migrations: failed.map(m => ({
        name: m.migration_name,
        error: m.error_message,
        applied_at: m.applied_at
      }))
    }
  }

  async validateMigrationIntegrity() {
    // Check if all expected migrations are applied
    const fs = require('fs')
    const path = require('path')
    
    const migrationsDir = path.join(__dirname, '..', 'migrations')
    
    if (!fs.existsSync(migrationsDir)) {
      return {
        valid: false,
        error: 'Migrations directory not found'
      }
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    const appliedMigrations = await this.getAppliedMigrations()
    
    const missing = migrationFiles.filter(file => 
      !appliedMigrations.some(applied => 
        applied.includes(file.replace('.sql', ''))
      )
    )

    const orphaned = appliedMigrations.filter(applied =>
      !migrationFiles.some(file => 
        applied.includes(file.replace('.sql', ''))
      )
    )

    return {
      valid: missing.length === 0 && orphaned.length === 0,
      total_files: migrationFiles.length,
      applied_count: appliedMigrations.length,
      missing_migrations: missing,
      orphaned_migrations: orphaned,
      migration_files: migrationFiles,
      applied_migrations: appliedMigrations
    }
  }

  async generateMigrationReport() {
    const status = await this.getMigrationStatus()
    const integrity = await this.validateMigrationIntegrity()

    return {
      status,
      integrity,
      timestamp: new Date().toISOString(),
      recommendations: this.generateRecommendations(status, integrity)
    }
  }

  generateRecommendations(status, integrity) {
    const recommendations = []

    if (!integrity.valid) {
      if (integrity.missing_migrations.length > 0) {
        recommendations.push({
          type: 'action_required',
          message: `${integrity.missing_migrations.length} migrations need to be applied`,
          details: integrity.missing_migrations
        })
      }

      if (integrity.orphaned_migrations.length > 0) {
        recommendations.push({
          type: 'warning',
          message: `${integrity.orphaned_migrations.length} applied migrations have no corresponding files`,
          details: integrity.orphaned_migrations
        })
      }
    }

    if (status.failed > 0) {
      recommendations.push({
        type: 'critical',
        message: `${status.failed} migrations failed to apply`,
        details: status.failed_migrations
      })
    }

    if (status.total_migrations === 0) {
      recommendations.push({
        type: 'info',
        message: 'No migrations have been applied yet',
        details: 'Consider running initial database setup'
      })
    }

    return recommendations
  }

  printMigrationReport() {
    this.generateMigrationReport()
      .then(report => {
        console.log('📋 Migration Status Report')
        console.log('=' .repeat(50))
        
        const status = report.status
        console.log(`Total Migrations: ${status.total_migrations}`)
        console.log(`Successful: ✅ ${status.successful}`)
        console.log(`Failed: ❌ ${status.failed}`)
        
        if (status.last_migration) {
          console.log(`Last Migration: ${status.last_migration.migration_name}`)
          console.log(`Applied At: ${status.last_migration.applied_at}`)
        }

        console.log()
        console.log('🔍 Integrity Check')
        console.log(`Valid: ${report.integrity.valid ? '✅' : '❌'}`)
        console.log(`Migration Files: ${report.integrity.total_files}`)
        console.log(`Applied Count: ${report.integrity.applied_count}`)

        if (report.integrity.missing_migrations.length > 0) {
          console.log('\n⚠️  Missing Migrations:')
          report.integrity.missing_migrations.forEach(m => console.log(`   - ${m}`))
        }

        if (report.integrity.orphaned_migrations.length > 0) {
          console.log('\n⚠️  Orphaned Migrations:')
          report.integrity.orphaned_migrations.forEach(m => console.log(`   - ${m}`))
        }

        if (report.recommendations.length > 0) {
          console.log('\n💡 Recommendations:')
          report.recommendations.forEach(rec => {
            const emoji = rec.type === 'critical' ? '🚨' : 
                         rec.type === 'action_required' ? '⚡' :
                         rec.type === 'warning' ? '⚠️' : 'ℹ️'
            console.log(`${emoji} ${rec.message}`)
            if (Array.isArray(rec.details)) {
              rec.details.forEach(detail => console.log(`     - ${detail}`))
            } else if (rec.details) {
              console.log(`     ${rec.details}`)
            }
          })
        }
      })
      .catch(error => {
        console.error('Failed to generate migration report:', error.message)
      })
  }
}

module.exports = MigrationTracker

// If run directly
if (require.main === module) {
  const tracker = new MigrationTracker()
  tracker.printMigrationReport()
} 