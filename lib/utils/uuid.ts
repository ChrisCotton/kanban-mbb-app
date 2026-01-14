/**
 * UUID Validation and Generation Utilities
 * 
 * This module provides safe UUID handling to prevent runtime errors
 * and security vulnerabilities related to invalid UUID formats.
 */

/**
 * Validates if a string is a properly formatted UUID (v4)
 * 
 * @param uuid - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 * 
 * @example
 * ```typescript
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUUID('test-user-local') // false
 * isValidUUID('12345') // false
 * ```
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false
  }
  
  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validates a UUID and throws an error if invalid
 * 
 * @param uuid - The UUID string to validate
 * @param fieldName - Optional field name for better error messages
 * @returns The validated UUID string
 * @throws Error if the UUID is invalid
 * 
 * @example
 * ```typescript
 * validateUUID('550e8400-e29b-41d4-a716-446655440000') // returns the UUID
 * validateUUID('invalid-uuid', 'user_id') // throws Error: Invalid user_id format
 * ```
 */
export function validateUUID(uuid: string, fieldName: string = 'UUID'): string {
  if (!isValidUUID(uuid)) {
    throw new Error(
      `Invalid ${fieldName} format. Expected UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000), got: ${uuid}`
    )
  }
  return uuid
}

/**
 * Safely validates a UUID and returns null if invalid
 * Useful for optional UUID fields or when you want to handle invalid UUIDs gracefully
 * 
 * @param uuid - The UUID string to validate
 * @returns The validated UUID string or null if invalid
 * 
 * @example
 * ```typescript
 * safeValidateUUID('550e8400-e29b-41d4-a716-446655440000') // returns the UUID
 * safeValidateUUID('invalid-uuid') // returns null
 * ```
 */
export function safeValidateUUID(uuid: string | null | undefined): string | null {
  if (!uuid || typeof uuid !== 'string') {
    return null
  }
  
  return isValidUUID(uuid) ? uuid : null
}

/**
 * Generates a new UUID using the browser's crypto.randomUUID() or Node.js equivalent
 * 
 * @returns A newly generated UUID string
 * 
 * @example
 * ```typescript
 * const newId = generateUUID() // '550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function generateUUID(): string {
  // Use crypto.randomUUID() if available (modern browsers and Node 14.17+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Validates multiple UUIDs at once
 * 
 * @param uuids - Object with UUID fields to validate
 * @returns Object with validation results
 * @throws Error if any UUID is invalid
 * 
 * @example
 * ```typescript
 * validateUUIDs({
 *   user_id: '550e8400-e29b-41d4-a716-446655440000',
 *   task_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
 * })
 * ```
 */
export function validateUUIDs(uuids: Record<string, string | null | undefined>): Record<string, string> {
  const validated: Record<string, string> = {}
  
  for (const [key, uuid] of Object.entries(uuids)) {
    if (uuid !== null && uuid !== undefined) {
      validated[key] = validateUUID(uuid, key)
    }
  }
  
  return validated
}

/**
 * Type guard to check if a value is a valid UUID
 * Useful for TypeScript type narrowing
 * 
 * @param value - The value to check
 * @returns true if the value is a valid UUID string
 */
export function isUUID(value: unknown): value is string {
  return typeof value === 'string' && isValidUUID(value)
}

/**
 * Common valid UUIDs for testing purposes
 * Use these in tests instead of hardcoding invalid UUIDs
 */
export const TEST_UUIDS = {
  USER_1: '550e8400-e29b-41d4-a716-446655440000',
  USER_2: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  TASK_1: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  TASK_2: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  CATEGORY_1: '6ba7b813-9dad-11d1-80b4-00c04fd430c8',
  CATEGORY_2: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
} as const 