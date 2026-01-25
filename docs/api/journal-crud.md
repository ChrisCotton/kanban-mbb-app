# Journal Entries & Transcripts CRUD API

Complete CRUD (Create, Read, Update, Delete) functionality for journal entries and transcripts.

## API Endpoints

### Create Entry
**POST** `/api/journal`

Creates a new journal entry.

**Request Body:**
```json
{
  "user_id": "uuid",
  "title": "Journal Entry Title",
  "audio_file_path": "path/to/audio.webm",
  "audio_duration": 120,
  "audio_file_size": 1024000,
  "transcription": "Optional initial transcription",
  "transcription_status": "pending",
  "use_audio_for_insights": true,
  "use_transcript_for_insights": true,
  "tags": ["tag1", "tag2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* journal entry object */ },
  "message": "Journal entry created successfully"
}
```

### Read Entries (List)
**GET** `/api/journal?user_id=uuid&limit=50&offset=0`

Gets all journal entries for a user.

**Query Parameters:**
- `user_id` (required): User ID
- `limit` (optional): Number of entries to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [ /* array of journal entries */ ],
  "count": 10
}
```

### Read Single Entry
**GET** `/api/journal/[id]`

Gets a single journal entry by ID.

**Response:**
```json
{
  "success": true,
  "data": { /* journal entry object */ }
}
```

### Update Entry
**PUT** `/api/journal/[id]`

Updates a journal entry. Can update:
- `title`
- `transcription` (transcript text)
- `transcription_status` (pending, processing, completed, failed)
- `transcription_provider`
- `use_audio_for_insights`
- `use_transcript_for_insights`
- `sentiment_score`
- `sentiment_label`
- `tags`
- `audio_file_path`
- `audio_duration`
- `audio_file_size`

**Request Body:**
```json
{
  "user_id": "uuid",
  "title": "Updated Title",
  "transcription": "Updated transcript text",
  "tags": ["updated", "tags"]
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated journal entry */ },
  "message": "Journal entry updated successfully"
}
```

### Delete Entry
**DELETE** `/api/journal/[id]?user_id=uuid`

Deletes a journal entry and its associated audio file.

**Query Parameters:**
- `user_id` (required): User ID for authorization

**Response:**
```json
{
  "success": true,
  "message": "Journal entry deleted successfully"
}
```

## Frontend Usage

### Creating an Entry
```typescript
const response = await fetch('/api/journal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: userId,
    title: 'My Journal Entry',
    // ... other fields
  })
})
```

### Reading Entries
```typescript
const response = await fetch(`/api/journal?user_id=${userId}`)
const result = await response.json()
const entries = result.data
```

### Updating an Entry
```typescript
const response = await fetch(`/api/journal/${entryId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: userId,
    title: 'Updated Title',
    transcription: 'Updated transcript'
  })
})
```

### Deleting an Entry
```typescript
const response = await fetch(`/api/journal/${entryId}?user_id=${userId}`, {
  method: 'DELETE'
})
```

## Transcript Editing

The `TranscriptEditor` component provides rich text editing for transcripts:

- **Markdown Support**: Bold, italic, headings, lists, quotes, code blocks, links
- **Preview Mode**: Toggle between edit and preview
- **Auto-save Detection**: Shows "Unsaved" indicator when changes are made
- **Keyboard Shortcuts**: 
  - `Ctrl+S` / `Cmd+S`: Save
  - `Ctrl+B` / `Cmd+B`: Bold
  - `Ctrl+I` / `Cmd+I`: Italic

### Using TranscriptEditor

```tsx
<TranscriptEditor
  entry={journalEntry}
  onSave={(title, content) => {
    // Update entry with new title and transcription
    handleEntryUpdate(entryId, { title, transcription: content })
  }}
  onCancel={() => setViewMode('list')}
  onDelete={() => handleEntryDelete(entryId)}
  embedded={true} // For side-by-side view
/>
```

## Security

- All endpoints require `user_id` for authorization
- RLS (Row Level Security) policies ensure users can only access their own entries
- DELETE operations verify ownership before deletion
- Audio files are automatically deleted when entry is deleted

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional details (development only)"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (missing/invalid parameters)
- `404`: Not Found
- `500`: Internal Server Error
