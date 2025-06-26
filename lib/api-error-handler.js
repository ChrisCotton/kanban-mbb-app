/**
 * API Error Handler
 * Comprehensive error handling for Next.js API routes
 */

class ApiError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

class DatabaseError extends ApiError {
  constructor(error, context = 'database operation') {
    let message = 'Database error occurred'
    let statusCode = 500
    let details = error.message

    // Specific error handling for common Supabase/PostgreSQL errors
    if (error.code === '42P01') {
      message = 'Table does not exist'
      statusCode = 500
      details = `Required database table is missing. Context: ${context}`
    } else if (error.code === '42703') {
      message = 'Column does not exist'
      statusCode = 500
      details = `Database schema mismatch. Context: ${context}`
    } else if (error.code === '23505') {
      message = 'Duplicate entry'
      statusCode = 409
      details = `Resource already exists. Context: ${context}`
    } else if (error.code === '23503') {
      message = 'Foreign key constraint violation'
      statusCode = 400
      details = `Referenced resource does not exist. Context: ${context}`
    } else if (error.code === '23514') {
      message = 'Check constraint violation'
      statusCode = 400
      details = `Data validation failed. Context: ${context}`
    } else if (error.message.includes('RLS')) {
      message = 'Access denied'
      statusCode = 403
      details = `Row Level Security policy prevented access. Context: ${context}`
    } else if (error.message.includes('permission denied')) {
      message = 'Permission denied'
      statusCode = 403
      details = `Insufficient permissions. Context: ${context}`
    }

    super(message, statusCode, error.code, details)
    this.originalError = error
    this.context = context
  }
}

class ValidationError extends ApiError {
  constructor(field, value, requirement) {
    super(
      `Validation failed for field '${field}'`,
      400,
      'VALIDATION_ERROR',
      `Field '${field}' with value '${value}' failed validation: ${requirement}`
    )
    this.field = field
    this.value = value
    this.requirement = requirement
  }
}

class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR', 'Valid authentication token required')
  }
}

class AuthorizationError extends ApiError {
  constructor(resource = 'resource') {
    super(
      `Access denied to ${resource}`,
      403,
      'AUTHZ_ERROR',
      `User does not have permission to access ${resource}`
    )
  }
}

class NotFoundError extends ApiError {
  constructor(resource = 'resource') {
    super(
      `${resource} not found`,
      404,
      'NOT_FOUND',
      `The requested ${resource} could not be found`
    )
  }
}

function handleApiError(error, req, res, context = 'API request') {
  console.error(`API Error in ${context}:`, {
    error: error.message,
    code: error.code,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // If it's already an ApiError, use its properties
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      context,
      timestamp: new Date().toISOString()
    })
  }

  // Handle database errors
  if (error.code && typeof error.code === 'string') {
    const dbError = new DatabaseError(error, context)
    return res.status(dbError.statusCode).json({
      success: false,
      error: dbError.message,
      code: dbError.code,
      details: dbError.details,
      context,
      timestamp: new Date().toISOString()
    })
  }

  // Handle general errors
  const statusCode = error.statusCode || 500
  const message = statusCode === 500 ? 'Internal server error' : error.message

  return res.status(statusCode).json({
    success: false,
    error: message,
    details: statusCode === 500 ? 'An unexpected error occurred' : error.message,
    context,
    timestamp: new Date().toISOString()
  })
}

function createApiHandler(handler, options = {}) {
  const { allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'], requireAuth = false } = options

  return async (req, res) => {
    try {
      // Method validation
      if (!allowedMethods.includes(req.method)) {
        res.setHeader('Allow', allowedMethods)
        throw new ApiError(`Method ${req.method} not allowed`, 405, 'METHOD_NOT_ALLOWED')
      }

      // Authentication check
      if (requireAuth && !req.headers.authorization) {
        throw new AuthenticationError()
      }

      // Call the actual handler
      return await handler(req, res)

    } catch (error) {
      return handleApiError(error, req, res, `${req.method} ${req.url}`)
    }
  }
}

function validateRequired(data, requiredFields) {
  const missing = []
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field)
    }
  }
  
  if (missing.length > 0) {
    throw new ValidationError(
      missing.join(', '),
      'missing',
      `Required fields: ${missing.join(', ')}`
    )
  }
}

function validateTypes(data, typeMap) {
  for (const [field, expectedType] of Object.entries(typeMap)) {
    if (data[field] !== undefined) {
      const actualType = typeof data[field]
      if (actualType !== expectedType) {
        throw new ValidationError(
          field,
          data[field],
          `Expected ${expectedType}, got ${actualType}`
        )
      }
    }
  }
}

// Health check utilities
function createHealthResponse(checks, context = 'API Health Check') {
  const successful = checks.filter(check => check.status === 'success').length
  const warnings = checks.filter(check => check.status === 'warning').length
  const errors = checks.filter(check => check.status === 'error').length
  
  const healthScore = Math.round((successful / checks.length) * 100)
  
  let overallStatus = 'healthy'
  if (errors > 0) overallStatus = 'critical'
  else if (warnings > 0) overallStatus = 'degraded'
  
  return {
    success: overallStatus !== 'critical',
    overall_status: overallStatus,
    health_score: healthScore,
    context,
    timestamp: new Date().toISOString(),
    summary: {
      total_checks: checks.length,
      successful,
      warnings,
      errors
    },
    checks
  }
}

module.exports = {
  ApiError,
  DatabaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  handleApiError,
  createApiHandler,
  validateRequired,
  validateTypes,
  createHealthResponse
} 