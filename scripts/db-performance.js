#!/usr/bin/env node

/**
 * Database Performance Monitor CLI
 * Database performance analysis and monitoring
 */

const PerformanceMonitor = require('../database/validation/performance-monitor')

async function main() {
  const args = process.argv.slice(2)
  const jsonOutput = args.includes('--json')
  const verbose = args.includes('--verbose') || args.includes('-v')
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Performance Monitor

Usage: npm run db:performance [options]

Options:
  --verbose, -v   Show detailed performance metrics
  --json          Output results as JSON
  --help, -h      Show this help message

Examples:
  npm run db:performance
  npm run db:performance --verbose
  npm run db:performance --json
    `)
    process.exit(0)
  }
  
  try {
    const monitor = new PerformanceMonitor()
    
    if (!jsonOutput) {
      console.log('🚀 Database Performance Analysis')
      console.log('=' .repeat(50))
      console.log()
    }
    
    const results = await monitor.runPerformanceAnalysis()
    
    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2))
    } else {
      monitor.printResults()
      
      // Performance summary
      const queryMetrics = results.metrics.filter(m => m.type === 'query_performance' && m.status === 'success')
      const avgQueryTime = queryMetrics.reduce((sum, m) => sum + m.duration_ms, 0) / queryMetrics.length || 0
      
      const connectionMetric = results.metrics.find(m => m.type === 'connection_performance')
      const connectionSuccess = connectionMetric ? connectionMetric.success_rate : 0
      
      console.log(`\n⚡ Performance Summary`)
      console.log('-'.repeat(30))
      console.log(`Average Query Time: ${Math.round(avgQueryTime)}ms`)
      console.log(`Connection Success Rate: ${connectionSuccess}%`)
      console.log(`Total Tests: ${results.summary.total_tests}`)
      console.log(`Analysis Duration: ${results.summary.duration_ms}ms`)
      
      // Performance rating
      const performanceScore = avgQueryTime < 200 && connectionSuccess >= 100 ? 'Excellent' :
                              avgQueryTime < 500 && connectionSuccess >= 95 ? 'Good' :
                              avgQueryTime < 1000 && connectionSuccess >= 90 ? 'Acceptable' : 'Needs Improvement'
      
      console.log(`\n🏆 Overall Performance: ${performanceScore}`)
      
      if (verbose && results.recommendations.length > 0) {
        console.log(`\n📋 Detailed Recommendations`)
        console.log('-'.repeat(40))
        results.recommendations.forEach((rec, index) => {
          console.log(`\n${index + 1}. [${rec.priority.toUpperCase()}] ${rec.category}`)
          console.log(`   ${rec.message}`)
          console.log(`   💡 ${rec.suggestion}`)
        })
      }
      
      if (results.recommendations.length > 0) {
        console.log(`\n💡 Quick Actions:`)
        const highPriority = results.recommendations.filter(r => r.priority === 'high')
        if (highPriority.length > 0) {
          console.log(`   🚨 ${highPriority.length} high-priority performance issues found`)
          console.log(`   📊 Consider database optimization and query review`)
        }
        console.log(`   📈 Monitor performance regularly with this tool`)
        console.log(`   🔧 Use EXPLAIN ANALYZE for slow queries in production`)
      }
    }
    
    process.exit(0)
    
  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: error.message }, null, 2))
    } else {
      console.error('❌ Performance analysis failed:', error.message)
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