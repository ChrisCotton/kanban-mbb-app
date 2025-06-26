import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface HealthCheck {
  name: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: any
  duration_ms?: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const startTime = Date.now()
  const checks: HealthCheck[] = []

  try {
    // Check 1: Database Connection
    const connectionCheck = await checkDatabaseConnection()
    checks.push(connectionCheck)

    // Check 2: Categories Table
    const categoriesCheck = await checkCategoriesTable()
    checks.push(categoriesCheck)

    // Check 3: Authentication
    const authCheck = await checkAuthentication()
    checks.push(authCheck)

    // Check 4: Core Tables
    const coreTablesCheck = await checkCoreTables()
    checks.push(...coreTablesCheck)

    const totalDuration = Date.now() - startTime
    
    // Calculate overall health
    const successCount = checks.filter(c => c.status === 'success').length
    const warningCount = checks.filter(c => c.status === 'warning').length
    const errorCount = checks.filter(c => c.status === 'error').length
    
    const healthScore = Math.round((successCount / checks.length) * 100)
    
    let overallStatus = 'healthy'
    if (errorCount > 0) overallStatus = 'critical'
    else if (warningCount > 0) overallStatus = 'warnings'

    const response = {
      overall_status: overallStatus,
      health_score: healthScore,
      timestamp: new Date().toISOString(),
      duration_ms: totalDuration,
      summary: {
        total_checks: checks.length,
        successful: successCount,
        warnings: warningCount,
        errors: errorCount
      },
      checks
    }

    const statusCode = overallStatus === 'critical' ? 503 : 200
    return res.status(statusCode).json(response)

  } catch (error) {
    return res.status(500).json({
      overall_status: 'critical',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime
    })
  }
}

async function checkDatabaseConnection(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1)
    
    const duration = Date.now() - start
    
    if (error && error.code === '42P01') {
      return {
        name: 'Database Connection',
        status: 'warning',
        message: 'Connected but categories table missing',
        details: error.message,
        duration_ms: duration
      }
    } else if (error) {
      return {
        name: 'Database Connection',
        status: 'error',
        message: 'Database connection failed',
        details: error.message,
        duration_ms: duration
      }
    } else {
      return {
        name: 'Database Connection',
        status: 'success',
        message: 'Database connection successful',
        duration_ms: duration
      }
    }
  } catch (e) {
    return {
      name: 'Database Connection',
      status: 'error',
      message: 'Connection attempt failed',
      details: e instanceof Error ? e.message : 'Unknown error',
      duration_ms: Date.now() - start
    }
  }
}

async function checkCategoriesTable(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    // Test basic query
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, hourly_rate, color, is_active')
      .limit(1)
    
    const duration = Date.now() - start
    
    if (error && error.code === '42P01') {
      return {
        name: 'Categories Table',
        status: 'error',
        message: 'Categories table does not exist',
        details: error.message,
        duration_ms: duration
      }
    } else if (error) {
      return {
        name: 'Categories Table',
        status: 'warning',
        message: 'Categories table has issues',
        details: error.message,
        duration_ms: duration
      }
    } else {
      // Check for expected columns
      const expectedColumns = ['id', 'name', 'hourly_rate', 'color', 'is_active']
      const issues = []
      
      for (const column of expectedColumns) {
        try {
          const { error: colError } = await supabase
            .from('categories')
            .select(column)
            .limit(1)
          
          if (colError && colError.message.includes('does not exist')) {
            issues.push(`Missing column: ${column}`)
          }
        } catch (e) {
          issues.push(`Cannot test column: ${column}`)
        }
      }
      
      if (issues.length > 0) {
        return {
          name: 'Categories Table',
          status: 'warning',
          message: 'Categories table schema issues',
          details: issues,
          duration_ms: duration
        }
      } else {
        return {
          name: 'Categories Table',
          status: 'success',
          message: 'Categories table is healthy',
          details: { record_sample_count: data?.length || 0 },
          duration_ms: duration
        }
      }
    }
  } catch (e) {
    return {
      name: 'Categories Table',
      status: 'error',
      message: 'Failed to check categories table',
      details: e instanceof Error ? e.message : 'Unknown error',
      duration_ms: Date.now() - start
    }
  }
}

async function checkAuthentication(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const { data, error } = await supabase.auth.admin.listUsers()
    
    const duration = Date.now() - start
    
    if (error) {
      return {
        name: 'Authentication System',
        status: 'error',
        message: 'Cannot access auth system',
        details: error.message,
        duration_ms: duration
      }
    } else {
      return {
        name: 'Authentication System',
        status: 'success',
        message: `Auth system working`,
        details: { user_count: data.users.length },
        duration_ms: duration
      }
    }
  } catch (e) {
    return {
      name: 'Authentication System',
      status: 'error',
      message: 'Auth system check failed',
      details: e instanceof Error ? e.message : 'Unknown error',
      duration_ms: Date.now() - start
    }
  }
}

async function checkCoreTables(): Promise<HealthCheck[]> {
  const tables = ['tasks', 'comments', 'subtasks']
  const checks: HealthCheck[] = []
  
  for (const table of tables) {
    const start = Date.now()
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      const duration = Date.now() - start
      
      if (error && error.code === '42P01') {
        checks.push({
          name: `Table: ${table}`,
          status: 'warning',
          message: `Table '${table}' does not exist`,
          details: error.message,
          duration_ms: duration
        })
      } else if (error) {
        checks.push({
          name: `Table: ${table}`,
          status: 'warning',
          message: `Table '${table}' has issues`,
          details: error.message,
          duration_ms: duration
        })
      } else {
        checks.push({
          name: `Table: ${table}`,
          status: 'success',
          message: `Table '${table}' is accessible`,
          details: { record_sample_count: data?.length || 0 },
          duration_ms: duration
        })
      }
    } catch (e) {
      checks.push({
        name: `Table: ${table}`,
        status: 'error',
        message: `Failed to check table '${table}'`,
        details: e instanceof Error ? e.message : 'Unknown error',
        duration_ms: Date.now() - start
      })
    }
  }
  
  return checks
} 