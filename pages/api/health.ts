import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { createApiHandler, createHealthResponse } from '../../lib/api-error-handler'

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

async function healthHandler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now()
  const checks: HealthCheck[] = []

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
  const coreTablesChecks = await checkCoreTables()
  checks.push(...coreTablesChecks)

  const totalDuration = Date.now() - startTime
  
  // Create health response
  const response = createHealthResponse(checks, 'Database Health Check')
  response.duration_ms = totalDuration
  
  // Set appropriate status code
  const statusCode = response.overall_status === 'critical' ? 503 : 
                    response.overall_status === 'degraded' ? 200 : 200

  return res.status(statusCode).json(response)
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
        details: { error_code: error.code, suggestion: 'Run database migrations' },
        duration_ms: duration
      }
    } else if (error) {
      return {
        name: 'Database Connection',
        status: 'error',
        message: 'Database connection failed',
        details: { error_code: error.code, error_message: error.message },
        duration_ms: duration
      }
    } else {
      return {
        name: 'Database Connection',
        status: 'success',
        message: 'Database connection successful',
        details: { connection_time_ms: duration },
        duration_ms: duration
      }
    }
  } catch (e) {
    return {
      name: 'Database Connection',
      status: 'error',
      message: 'Connection attempt failed',
      details: { error: e instanceof Error ? e.message : 'Unknown error' },
      duration_ms: Date.now() - start
    }
  }
}

async function checkCategoriesTable(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    // Test the exact query that the API uses
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, hourly_rate, color, is_active, created_at, updated_at, created_by, updated_by')
      .limit(1)
    
    const duration = Date.now() - start
    
    if (error && error.code === '42P01') {
      return {
        name: 'Categories Table',
        status: 'error',
        message: 'Categories table does not exist',
        details: { 
          error_code: error.code,
          suggestion: 'Run migration 007_create_categories_table.sql'
        },
        duration_ms: duration
      }
    } else if (error && error.code === '42703') {
      // Column doesn't exist
      const missingColumn = error.message.match(/column "(\w+)"/)?.[1]
      return {
        name: 'Categories Table',
        status: 'error',
        message: 'Categories table schema mismatch',
        details: { 
          error_code: error.code,
          missing_column: missingColumn,
          error_message: error.message,
          suggestion: 'Check database schema against API expectations'
        },
        duration_ms: duration
      }
    } else if (error) {
      return {
        name: 'Categories Table',
        status: 'warning',
        message: 'Categories table has issues',
        details: { 
          error_code: error.code,
          error_message: error.message
        },
        duration_ms: duration
      }
    } else {
      return {
        name: 'Categories Table',
        status: 'success',
        message: 'Categories table is healthy',
        details: { 
          record_sample_count: data?.length || 0,
          schema_check: 'passed'
        },
        duration_ms: duration
      }
    }
  } catch (e) {
    return {
      name: 'Categories Table',
      status: 'error',
      message: 'Failed to check categories table',
      details: { error: e instanceof Error ? e.message : 'Unknown error' },
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
        details: { 
          error_message: error.message,
          suggestion: 'Check service role key permissions'
        },
        duration_ms: duration
      }
    } else {
      return {
        name: 'Authentication System',
        status: 'success',
        message: 'Auth system operational',
        details: { 
          user_count: data.users.length,
          auth_provider: 'supabase'
        },
        duration_ms: duration
      }
    }
  } catch (e) {
    return {
      name: 'Authentication System',
      status: 'error',
      message: 'Auth system check failed',
      details: { error: e instanceof Error ? e.message : 'Unknown error' },
      duration_ms: Date.now() - start
    }
  }
}

async function checkCoreTables(): Promise<HealthCheck[]> {
  const tables = ['tasks', 'comments', 'subtasks', 'time_sessions', 'vision_board_images']
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
          details: { 
            error_code: error.code,
            suggestion: `Consider running migration for ${table} table`
          },
          duration_ms: duration
        })
      } else if (error) {
        checks.push({
          name: `Table: ${table}`,
          status: 'warning',
          message: `Table '${table}' has issues`,
          details: { 
            error_code: error.code,
            error_message: error.message
          },
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
        details: { error: e instanceof Error ? e.message : 'Unknown error' },
        duration_ms: Date.now() - start
      })
    }
  }
  
  return checks
}

export default createApiHandler(healthHandler, { 
  allowedMethods: ['GET'],
  requireAuth: false 
}) 