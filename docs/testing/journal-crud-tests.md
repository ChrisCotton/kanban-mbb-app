# Journal CRUD Unit Tests

Comprehensive unit tests for journal entries and transcripts CRUD functionality.

## Test Files Created

### API Tests

1. **`__tests__/api/journal/index.test.ts`**
   - Tests for GET `/api/journal` (list entries)
   - Tests for POST `/api/journal` (create entry)
   - Tests error handling and validation
   - **8 test cases**

2. **`__tests__/api/journal/[id].test.ts`**
   - Tests for GET `/api/journal/[id]` (get single entry)
   - Tests for PUT `/api/journal/[id]` (update entry)
   - Tests for DELETE `/api/journal/[id]` (delete entry)
   - Tests audio file cleanup on delete
   - Tests field filtering and validation
   - **15+ test cases**

3. **`__tests__/api/journal/transcribe.test.ts`**
   - Tests for POST `/api/journal/transcribe`
   - Tests OpenAI Whisper transcription
   - Tests API key handling (user profile vs environment)
   - Tests error handling
   - Tests placeholder when API key missing
   - **8+ test cases**

### Component Tests

4. **`__tests__/components/journal/TranscriptEditor.test.tsx`**
   - Tests embedded mode rendering
   - Tests full mode rendering
   - Tests edit/preview toggle
   - Tests markdown formatting
   - Tests keyboard shortcuts (Ctrl+S, Ctrl+B, Ctrl+I)
   - Tests unsaved changes detection
   - Tests save/cancel/delete callbacks
   - **10+ test cases**

5. **`__tests__/components/journal/JournalView.crud.test.tsx`**
   - Tests entry listing (READ)
   - Tests entry creation (CREATE)
   - Tests entry updates (UPDATE)
   - Tests entry deletion (DELETE)
   - Tests error handling
   - Tests UI state updates
   - **10+ test cases**

## Test Coverage

### CRUD Operations Covered

✅ **CREATE**
- Create journal entry via POST
- Handle missing user_id
- Handle database errors
- Default title generation

✅ **READ**
- List all entries for user
- Get single entry by ID
- Pagination support
- Handle missing entries (404)
- Handle database errors

✅ **UPDATE**
- Update title
- Update transcription
- Update tags
- Update AI insight flags
- Field filtering (only allowed fields)
- User ownership verification
- Handle update errors

✅ **DELETE**
- Delete entry
- Delete associated audio file
- Handle missing audio files
- User confirmation
- Handle delete errors

### Transcript Editing

✅ **TranscriptEditor Component**
- Embedded mode
- Full mode
- Edit/Preview toggle
- Markdown formatting
- Keyboard shortcuts
- Unsaved changes detection
- Save functionality
- Delete functionality

### Error Handling

✅ **API Error Handling**
- Missing parameters (400)
- Not found (404)
- Database errors (500)
- Method not allowed (405)
- Invalid field updates

✅ **Frontend Error Handling**
- Failed API calls
- Network errors
- User feedback messages
- State recovery

## Running Tests

```bash
# Run all journal tests
npm test -- __tests__/api/journal
npm test -- __tests__/components/journal

# Run specific test file
npm test -- __tests__/api/journal/index.test.ts
npm test -- __tests__/api/journal/\[id\].test.ts
npm test -- __tests__/components/journal/TranscriptEditor.test.tsx

# Run with coverage
npm test -- --coverage __tests__/api/journal
```

## Test Structure

Each test file follows this structure:

1. **Setup & Mocks**
   - Mock Supabase client
   - Mock fetch (for API calls)
   - Mock React components

2. **Test Cases**
   - Happy path scenarios
   - Error scenarios
   - Edge cases
   - Validation tests

3. **Assertions**
   - API response structure
   - Database calls
   - Error messages
   - UI state updates

## Key Test Scenarios

### API Tests

- ✅ Valid requests return success
- ✅ Missing required fields return 400
- ✅ Non-existent entries return 404
- ✅ Database errors return 500
- ✅ Unsupported methods return 405
- ✅ Field filtering works correctly
- ✅ User ownership verified
- ✅ Audio files cleaned up on delete

### Component Tests

- ✅ Components render correctly
- ✅ User interactions trigger API calls
- ✅ State updates after operations
- ✅ Error messages displayed
- ✅ Confirmations work
- ✅ Markdown formatting works
- ✅ Keyboard shortcuts work

## Mock Data

Tests use consistent mock data:
- Test user ID: `'test-user-123'`
- Test entry IDs: `'entry-1'`, `'entry-2'`, etc.
- Mock timestamps: ISO date strings
- Mock audio files: Blob objects

## Notes

- All tests use Jest and React Testing Library
- Supabase client is mocked to avoid real database calls
- Fetch is mocked to avoid real HTTP requests
- Tests are isolated and don't depend on each other
- Each test cleans up mocks in `beforeEach`
