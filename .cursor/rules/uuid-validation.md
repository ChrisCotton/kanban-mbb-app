# UUID Validation and Safety Rules

## Overview
This rule ensures all UUID usage in the codebase follows strict validation patterns to prevent runtime errors and security vulnerabilities.

## Core Principles

### 1. UUID Format Validation
- **NEVER** use hardcoded string literals that look like UUIDs without validation
- **ALWAYS** validate UUID format before database operations
- **ALWAYS** use proper UUID generation functions

### 2. UUID Generation
```typescript
// ✅ CORRECT - Use crypto.randomUUID() for new UUIDs
const newId = crypto.randomUUID()

// ✅ CORRECT - Use Supabase's gen_random_uuid() in SQL
INSERT INTO tasks (id, title) VALUES (gen_random_uuid(), 'Task title')

// ❌ WRONG - Never hardcode UUID-like strings
const badId = "12345678-1234-1234-1234-123456789012"
const badId2 = "test-user-local" 
const badId3 = "some-fake-uuid"
```

### 3. UUID Validation Function
```typescript
// Required utility function - add to lib/utils/uuid.ts
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function validateUUID(uuid: string, fieldName: string = 'UUID'): string {
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${fieldName} format: ${uuid}`)
  }
  return uuid
}
```

### 4. API Parameter Validation
```typescript
// ✅ CORRECT - Always validate UUID parameters
export default async function handler(req: Request) {
  const { user_id, task_id } = req.body
  
  // Validate all UUID parameters
  if (user_id && !isValidUUID(user_id)) {
    return res.status(400).json({ error: 'Invalid user_id format' })
  }
  
  if (task_id && !isValidUUID(task_id)) {
    return res.status(400).json({ error: 'Invalid task_id format' })
  }
}

// ❌ WRONG - Never pass unvalidated UUIDs to database
const result = await createTask({ user_id: req.body.user_id }) // Dangerous!
```

### 5. Database Query Safety
```typescript
// ✅ CORRECT - Validate before database operations
async function createTask(data: CreateTaskData) {
  if (data.user_id) {
    validateUUID(data.user_id, 'user_id')
  }
  
  // Safe to proceed with validated UUID
  return await supabase.from('tasks').insert(data)
}

// ❌ WRONG - Direct database operations with unvalidated UUIDs
async function badCreateTask(data: any) {
  return await supabase.from('tasks').insert(data) // Dangerous!
}
```

### 6. Frontend UUID Handling
```typescript
// ✅ CORRECT - Validate UUIDs from URL params, props, etc.
function TaskDetailPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    if (!isValidUUID(params.id)) {
      router.push('/404')
      return
    }
    
    // Safe to use validated UUID
    fetchTask(params.id)
  }, [params.id])
}

// ❌ WRONG - Using unvalidated UUID from URL
function BadTaskDetailPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    fetchTask(params.id) // Could be invalid UUID!
  }, [params.id])
}
```

### 7. Test Data Guidelines
```typescript
// ✅ CORRECT - Use proper UUID generation in tests
const testUserId = crypto.randomUUID()
const testTaskId = crypto.randomUUID()

// ✅ CORRECT - Use known valid UUIDs for consistent tests
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const MOCK_TASK_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// ❌ WRONG - Invalid test UUIDs
const badTestId = "test-user-123"
const badTestId2 = "fake-uuid"
```

### 8. Error Messages
```typescript
// ✅ CORRECT - Clear, helpful error messages
if (!isValidUUID(userId)) {
  throw new Error(`Invalid user ID format. Expected UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000), got: ${userId}`)
}

// ❌ WRONG - Vague error messages
if (!isValidUUID(userId)) {
  throw new Error('Invalid user ID')
}
```

## Implementation Checklist

### Required Files
- [ ] `lib/utils/uuid.ts` - UUID validation utilities
- [ ] Update all API endpoints with UUID validation
- [ ] Update all database query functions with validation
- [ ] Update all React components that handle UUIDs

### Validation Points
- [ ] API route parameters (`req.params.id`)
- [ ] API request body fields (`req.body.user_id`, etc.)
- [ ] URL route parameters (`params.id` in Next.js)
- [ ] Props passed between components
- [ ] localStorage/sessionStorage UUID values
- [ ] External API responses containing UUIDs

### Testing Requirements
- [ ] Unit tests for UUID validation functions
- [ ] API tests with invalid UUID inputs
- [ ] Frontend tests with malformed URL parameters
- [ ] Error boundary tests for UUID validation failures

## Common UUID Patterns to Watch For

### ❌ Anti-Patterns to Avoid
```typescript
// NEVER do these:
const userId = "test-user"
const userId = "12345"
const userId = "user-123-abc"
const userId = req.params.id // Without validation
const userId = localStorage.getItem('userId') // Without validation
```

### ✅ Safe Patterns to Follow
```typescript
// ALWAYS do these:
const userId = crypto.randomUUID()
const userId = validateUUID(req.params.id)
const userId = isValidUUID(storedId) ? storedId : null
```

## Emergency UUID Debugging

If you encounter UUID errors:

1. **Check the error message** - Does it mention "invalid input syntax for type uuid"?
2. **Trace the UUID source** - Where did the invalid UUID come from?
3. **Add validation** - Use `validateUUID()` at the entry point
4. **Test thoroughly** - Ensure validation catches all edge cases

## IDE Integration

Add this to your VSCode settings for UUID detection:
```json
{
  "editor.rulers": [80, 120],
  "search.useIgnoreFiles": false,
  "search.exclude": {
    "**/node_modules": true
  },
  "files.associations": {
    "*.uuid": "plaintext"
  }
}
```

Remember: **Prevention is better than debugging!** Always validate UUIDs at system boundaries. 