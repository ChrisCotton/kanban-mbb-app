#!/usr/bin/env node

/**
 * Database Data Validation CLI
 * Comprehensive data integrity validation
 */

const DataValidator = require('../database/validation/data-validator')

async function main() {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose') || args.includes('-v')
  const jsonOutput = args.includes('--json')
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Data Validation Tool

Usage: npm run db:validate [options]

Options:
  --verbose, -v    Show detailed validation output
  --json          Output results as JSON
  --help, -h      Show this help message

Examples:
  npm run db:validate
  npm run db:validate --verbose
  npm run db:validate --json
    `)
    process.exit(0)
  }
  
  try {
    const validator = new DataValidator()
    
    if (!jsonOutput) {
      console.log('🔍 Database Data Validation')
      console.log('=' .repeat(50))
      console.log()
    }
    
    const results = await validator.runFullValidation()
    
    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2))
    } else {
      validator.printResults()
      
      if (verbose && results.issues.length > 0) {
        console.log('\n📝 Detailed Issue Analysis')
        console.log('-'.repeat(40))
        results.issues.forEach((issue, index) => {
          console.log(`\n${index + 1}. ${issue.message}`)
          console.log(`   Type: ${issue.type}`)
          console.log(`   Category: ${issue.category}`)
          if (issue.details) {
            console.log(`   Details: ${JSON.stringify(issue.details, null, 4)}`)
          }
        })
      }
      
      // Summary
      const healthScore = results.summary.health_score
      console.log(`\n🏥 Overall Database Health: ${healthScore}%`)
      
      if (healthScore === 100) {
        console.log('🎉 Excellent! Your database integrity is perfect.')
      } else if (healthScore >= 80) {
        console.log('✅ Good! Minor issues detected, but overall health is solid.')
      } else if (healthScore >= 60) {
        console.log('⚠️  Warning! Several integrity issues need attention.')
      } else {
        console.log('🚨 Critical! Significant data integrity problems detected.')
      }
      
      if (results.issues.length > 0) {
        console.log(`\n💡 Next steps:`)
        console.log(`   1. Run: npm run db:cleanup (dry run)`)
        console.log(`   2. Review cleanup suggestions`)
        console.log(`   3. Run: npm run db:cleanup --live (to fix issues)`)
      }
    }
    
    // Exit with appropriate code
    const exitCode = results.summary.errors > 0 ? 1 : 0
    process.exit(exitCode)
    
  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: error.message }, null, 2))
    } else {
      console.error('❌ Validation failed:', error.message)
      if (verbose) {
        console.error(error.stack)
      }
    }
    process.exit(1)
  }
}

if (require.main === module) {
  main()
} 