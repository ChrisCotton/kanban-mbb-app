#!/usr/bin/env node

/**
 * Performance Monitor
 * Database performance analysis and monitoring tools
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

class PerformanceMonitor {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey)
    this.metrics = []
  }

  async runPerformanceAnalysis() {
    console.log('🚀 Starting database performance analysis...\n')
    
    const startTime = Date.now()
    
    // Core performance tests
    await this.testQueryPerformance()
    await this.testConnectionPerformance()
    await this.analyzeTableSizes()
    await this.testIndexEfficiency()
    await this.analyzeSlowQueries()
    
    const duration = Date.now() - startTime
    
    return {
      summary: {
        total_tests: this.metrics.length,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      },
      metrics: this.metrics,
      recommendations: this.generateRecommendations()
    }
  }

  async testQueryPerformance() {
    console.log('1. Testing query performance...')
    
    const queries = [
      {
        name: 'Simple Categories Select',
        test: () => this.supabase
          .from('categories')
          .select('id, name, hourly_rate')
          .limit(10)
      },
      {
        name: 'Categories with User Join',
        test: () => this.supabase
          .from('categories')
          .select('id, name, created_by')
          .limit(10)
      },
      {
        name: 'Categories Count',
        test: () => this.supabase
          .from('categories')
          .select('*', { count: 'exact', head: true })
      },
      {
        name: 'Categories with Filter',
        test: () => this.supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
          .limit(10)
      },
      {
        name: 'Complex Categories Query',
        test: () => this.supabase
          .from('categories')
          .select(`
            id,
            name,
            hourly_rate,
            is_active,
            created_at
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20)
      }
    ]

    for (const query of queries) {
      try {
        const start = Date.now()
        const { data, error } = await query.test()
        const duration = Date.now() - start
        
        if (error && error.code === '42P01') {
          this.metrics.push({
            type: 'query_performance',
            query_name: query.name,
            status: 'skipped',
            reason: 'table_missing',
            duration_ms: duration
          })
          continue
        }
        
        if (error) {
          this.metrics.push({
            type: 'query_performance',
            query_name: query.name,
            status: 'error',
            error: error.message,
            duration_ms: duration
          })
          continue
        }
        
        const performance_rating = duration < 100 ? 'excellent' :
                                 duration < 500 ? 'good' :
                                 duration < 1000 ? 'acceptable' : 'poor'
        
        this.metrics.push({
          type: 'query_performance',
          query_name: query.name,
          status: 'success',
          duration_ms: duration,
          performance_rating,
          records_returned: data?.length || 0
        })
        
      } catch (e) {
        this.metrics.push({
          type: 'query_performance',
          query_name: query.name,
          status: 'error',
          error: e.message,
          duration_ms: 0
        })
      }
    }
  }

  async testConnectionPerformance() {
    console.log('2. Testing connection performance...')
    
    const connectionTests = []
    
    // Test multiple connections in parallel
    const parallelTests = Array(5).fill().map(async (_, i) => {
      const start = Date.now()
      try {
        const { data, error } = await this.supabase
          .from('categories')
          .select('count')
          .limit(1)
        
        const duration = Date.now() - start
        
        return {
          test_id: i + 1,
          status: error ? 'error' : 'success',
          duration_ms: duration,
          error: error?.message
        }
      } catch (e) {
        return {
          test_id: i + 1,
          status: 'error',
          duration_ms: Date.now() - start,
          error: e.message
        }
      }
    })
    
    const results = await Promise.all(parallelTests)
    
    const avgDuration = results
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + r.duration_ms, 0) / results.length
    
    const successRate = (results.filter(r => r.status === 'success').length / results.length) * 100
    
    this.metrics.push({
      type: 'connection_performance',
      parallel_connections: 5,
      success_rate: successRate,
      average_duration_ms: Math.round(avgDuration),
      individual_results: results
    })
  }

  async analyzeTableSizes() {
    console.log('3. Analyzing table sizes...')
    
    const tables = ['categories', 'tasks', 'comments', 'subtasks', 'time_sessions', 'vision_board_images']
    
    for (const table of tables) {
      try {
        const start = Date.now()
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        const duration = Date.now() - start
        
        if (error && error.code === '42P01') {
          this.metrics.push({
            type: 'table_analysis',
            table_name: table,
            status: 'missing',
            count_query_duration_ms: duration
          })
          continue
        }
        
        if (error) {
          this.metrics.push({
            type: 'table_analysis',
            table_name: table,
            status: 'error',
            error: error.message,
            count_query_duration_ms: duration
          })
          continue
        }
        
        // Categorize table size
        const size_category = count === 0 ? 'empty' :
                             count < 100 ? 'small' :
                             count < 1000 ? 'medium' :
                             count < 10000 ? 'large' : 'very_large'
        
        this.metrics.push({
          type: 'table_analysis',
          table_name: table,
          status: 'success',
          record_count: count,
          size_category,
          count_query_duration_ms: duration
        })
        
      } catch (e) {
        this.metrics.push({
          type: 'table_analysis',
          table_name: table,
          status: 'error',
          error: e.message
        })
      }
    }
  }

  async testIndexEfficiency() {
    console.log('4. Testing index efficiency...')
    
    // Test queries that should benefit from indexes
    const indexTests = [
      {
        name: 'Categories by created_by (should use index)',
        test: () => this.supabase
          .from('categories')
          .select('id, name')
          .eq('created_by', 'e01f256c-b3e4-4f1d-bd65-713a9e0a12cd')
      },
      {
        name: 'Categories by is_active (should use index)',
        test: () => this.supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
      },
      {
        name: 'Categories by name (should use index)',
        test: () => this.supabase
          .from('categories')
          .select('id, hourly_rate')
          .like('name', 'Test%')
      }
    ]
    
    for (const test of indexTests) {
      try {
        const start = Date.now()
        const { data, error } = await test.test()
        const duration = Date.now() - start
        
        if (error && error.code === '42P01') {
          this.metrics.push({
            type: 'index_efficiency',
            test_name: test.name,
            status: 'skipped',
            reason: 'table_missing'
          })
          continue
        }
        
        // Fast queries suggest good indexing
        const efficiency_rating = duration < 50 ? 'excellent' :
                                 duration < 200 ? 'good' :
                                 duration < 500 ? 'acceptable' : 'poor'
        
        this.metrics.push({
          type: 'index_efficiency',
          test_name: test.name,
          status: error ? 'error' : 'success',
          duration_ms: duration,
          efficiency_rating,
          records_found: data?.length || 0,
          error: error?.message
        })
        
      } catch (e) {
        this.metrics.push({
          type: 'index_efficiency',
          test_name: test.name,
          status: 'error',
          error: e.message
        })
      }
    }
  }

  async analyzeSlowQueries() {
    console.log('5. Identifying potentially slow queries...')
    
    // Simulate analysis of common query patterns
    const queryPatterns = [
      {
        pattern: 'Full table scan on large tables',
        risk: 'high',
        example: 'SELECT * FROM large_table WITHOUT WHERE clause',
        mitigation: 'Add WHERE clauses, use LIMIT, create appropriate indexes'
      },
      {
        pattern: 'N+1 queries in relationships',
        risk: 'medium',
        example: 'Loading categories then tasks for each category separately',
        mitigation: 'Use Supabase joins or batch queries'
      },
      {
        pattern: 'Count queries on large tables',
        risk: 'medium',
        example: 'SELECT COUNT(*) FROM large_table',
        mitigation: 'Use estimated counts or cache results'
      },
      {
        pattern: 'Complex aggregations without indexes',
        risk: 'high',
        example: 'GROUP BY and ORDER BY on non-indexed columns',
        mitigation: 'Create compound indexes for common aggregation patterns'
      }
    ]
    
    this.metrics.push({
      type: 'slow_query_analysis',
      query_patterns: queryPatterns,
      recommendation: 'Monitor actual query performance in production with pg_stat_statements'
    })
  }

  generateRecommendations() {
    const recommendations = []
    
    // Analyze query performance metrics
    const queryMetrics = this.metrics.filter(m => m.type === 'query_performance')
    const slowQueries = queryMetrics.filter(m => m.performance_rating === 'poor')
    
    if (slowQueries.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'query_optimization',
        message: `${slowQueries.length} queries performing poorly (>1000ms)`,
        suggestion: 'Review query structure and add appropriate indexes'
      })
    }
    
    // Analyze connection performance
    const connectionMetrics = this.metrics.find(m => m.type === 'connection_performance')
    if (connectionMetrics && connectionMetrics.success_rate < 100) {
      recommendations.push({
        priority: 'medium',
        category: 'connection_reliability',
        message: `Connection success rate: ${connectionMetrics.success_rate}%`,
        suggestion: 'Implement connection retry logic and monitor network stability'
      })
    }
    
    // Analyze table sizes
    const tableMetrics = this.metrics.filter(m => m.type === 'table_analysis')
    const largeTables = tableMetrics.filter(m => m.size_category === 'large' || m.size_category === 'very_large')
    
    if (largeTables.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'table_optimization',
        message: `${largeTables.length} tables have significant size`,
        suggestion: 'Consider archiving old data, partitioning, or adding pagination'
      })
    }
    
    // Analyze index efficiency
    const indexMetrics = this.metrics.filter(m => m.type === 'index_efficiency')
    const inefficientIndexes = indexMetrics.filter(m => m.efficiency_rating === 'poor')
    
    if (inefficientIndexes.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'index_optimization',
        message: `${inefficientIndexes.length} queries showing poor index performance`,
        suggestion: 'Review and optimize database indexes for common query patterns'
      })
    }
    
    // General recommendations
    recommendations.push({
      priority: 'low',
      category: 'monitoring',
      message: 'Set up continuous performance monitoring',
      suggestion: 'Implement regular performance checks and alerting for degradation'
    })
    
    return recommendations
  }

  printResults() {
    console.log('\n🚀 Performance Analysis Results')
    console.log('=' .repeat(60))
    
    // Group metrics by type
    const metricsByType = {}
    this.metrics.forEach(metric => {
      if (!metricsByType[metric.type]) {
        metricsByType[metric.type] = []
      }
      metricsByType[metric.type].push(metric)
    })
    
    // Print each category
    Object.keys(metricsByType).forEach(type => {
      console.log(`\n📊 ${type.toUpperCase().replace(/_/g, ' ')}`)
      console.log('-'.repeat(40))
      
      metricsByType[type].forEach(metric => {
        switch (metric.type) {
          case 'query_performance':
            const emoji = metric.performance_rating === 'excellent' ? '🚀' :
                         metric.performance_rating === 'good' ? '✅' :
                         metric.performance_rating === 'acceptable' ? '⚠️' : '❌'
            console.log(`${emoji} ${metric.query_name}: ${metric.duration_ms}ms (${metric.performance_rating})`)
            break
            
          case 'connection_performance':
            console.log(`🔗 Parallel connections: ${metric.success_rate}% success rate, ${metric.average_duration_ms}ms avg`)
            break
            
          case 'table_analysis':
            if (metric.status === 'success') {
              console.log(`📋 ${metric.table_name}: ${metric.record_count} records (${metric.size_category})`)
            } else {
              console.log(`📋 ${metric.table_name}: ${metric.status}`)
            }
            break
            
          case 'index_efficiency':
            if (metric.status === 'success') {
              const indexEmoji = metric.efficiency_rating === 'excellent' ? '⚡' :
                               metric.efficiency_rating === 'good' ? '✅' :
                               metric.efficiency_rating === 'acceptable' ? '⚠️' : '🐌'
              console.log(`${indexEmoji} ${metric.test_name}: ${metric.duration_ms}ms (${metric.efficiency_rating})`)
            }
            break
        }
      })
    })
    
    // Print recommendations
    const recommendations = this.generateRecommendations()
    if (recommendations.length > 0) {
      console.log('\n💡 Performance Recommendations')
      console.log('-'.repeat(40))
      
      recommendations.forEach(rec => {
        const emoji = rec.priority === 'high' ? '🚨' :
                     rec.priority === 'medium' ? '⚠️' : 'ℹ️'
        console.log(`${emoji} ${rec.message}`)
        console.log(`   💡 ${rec.suggestion}`)
        console.log()
      })
    }
  }
}

module.exports = PerformanceMonitor

// If run directly
if (require.main === module) {
  const monitor = new PerformanceMonitor()
  
  monitor.runPerformanceAnalysis()
    .then((results) => {
      monitor.printResults()
      process.exit(0)
    })
    .catch((error) => {
      console.error('Performance analysis failed:', error.message)
      process.exit(1)
    })
} 