#!/usr/bin/env node

/**
 * Database Data Cleanup CLI
 * Automated data cleanup and optimization
 */

const DataCleanup = require('../database/validation/data-cleanup')

async function main() {
  const args = process.argv.slice(2)
  const live = args.includes('--live')
  const optimize = args.includes('--optimize')
  const jsonOutput = args.includes('--json')
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Data Cleanup Tool

Usage: npm run db:cleanup [options]

Options:
  --live          Perform actual cleanup (default is dry run)
  --optimize      Run database optimization after cleanup
  --json          Output results as JSON
  --help, -h      Show this help message

Examples:
  npm run db:cleanup                    # Dry run - shows what would be cleaned
  npm run db:cleanup --live             # Actually perform cleanup
  npm run db:cleanup --live --optimize  # Cleanup and optimize
  npm run db:cleanup --json             # JSON output
    `)
    process.exit(0)
  }
  
  try {
    const cleanup = new DataCleanup()
    
    if (!jsonOutput) {
      const mode = live ? 'LIVE CLEANUP' : 'DRY RUN'
      console.log(`🧹 Database Data Cleanup - ${mode}`)
      console.log('=' .repeat(50))
      
      if (!live) {
        console.log('💡 This is a dry run. Use --live to perform actual cleanup.')
        console.log()
      } else {
        console.log('⚠️  WARNING: This will modify your database!')
        console.log('Press Ctrl+C to cancel or wait 3 seconds to continue...')
        console.log()
        
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    
    const results = await cleanup.runAutomatedCleanup(!live) // Pass true for dry run
    
    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2))
    } else {
      cleanup.printCleanupResults()
      
      // Show summary
      const summary = results.summary
      console.log(`\n📊 Cleanup Summary`)
      console.log('-'.repeat(30))
      console.log(`Mode: ${summary.mode}`)
      console.log(`Issues Found: ${summary.total_issues_found}`)
      console.log(`Operations: ${summary.cleanups_performed}`)
      console.log(`Duration: ${summary.duration_ms}ms`)
      
      if (!live && summary.cleanups_performed > 0) {
        console.log(`\n💡 To perform these cleanups, run:`)
        console.log(`   npm run db:cleanup --live`)
      }
    }
    
    // Run optimization if requested
    if (optimize && live) {
      if (!jsonOutput) {
        console.log('\n' + '='.repeat(50))
      }
      
      const optimizations = await cleanup.optimizeDatabase()
      
      if (jsonOutput) {
        console.log(JSON.stringify({ cleanup: results, optimization: optimizations }, null, 2))
      }
    }
    
    process.exit(0)
    
  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: error.message }, null, 2))
    } else {
      console.error('❌ Cleanup failed:', error.message)
    }
    process.exit(1)
  }
}

if (require.main === module) {
  main()
} 