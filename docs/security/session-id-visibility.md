# Session ID Visibility - Security Documentation

## Overview

Session IDs (UUIDs) are visible in network requests and API responses. This document explains why this is expected behavior and what security measures are in place.

## Expected Behavior

### Session IDs in API Responses ✅
Session IDs appear in API responses because they are **required** for client operations:
- **Starting a session**: Returns session ID for tracking
- **Stopping a session**: Requires session ID to identify which session to end
- **Updating a session**: Requires session ID to identify which session to update
- **Deleting a session**: Requires session ID to identify which session to delete

This is standard REST API behavior and is **not a security issue**.

### Session IDs in Network Requests ✅
Session IDs appear in:
- **Request URLs**: `/api/time-sessions/{sessionId}` - Required for REST operations
- **Request Bodies**: When stopping/updating sessions - Required for operations
- **Response Bodies**: When fetching session data - Required for client state management

This is **normal and expected** for REST APIs.

## Security Measures

### ✅ Session IDs NOT Exposed in Error Messages
- Error messages returned to clients do not contain session IDs
- Server-side logging may include session IDs (for debugging), but these are not sent to clients
- In production mode, error details are minimized or omitted

### ✅ Access Control
- All API endpoints verify `user_id` matches the authenticated user
- Users can only access their own session IDs
- Row Level Security (RLS) policies enforce user isolation at the database level

### ✅ Session ID Validation
- All session IDs are validated as UUIDs before processing
- Invalid session IDs return 400 Bad Request
- Session IDs are verified to belong to the requesting user

## What to Monitor

If you see session IDs in:
- ✅ **Network tab requests/responses**: Normal - needed for API operations
- ✅ **Browser DevTools (for your own sessions)**: Normal - needed for client operations
- ❌ **Public error messages**: Should be investigated
- ❌ **Client-side console logs**: Should be minimized in production

## Conclusion

Session ID visibility in network requests is **expected and necessary** for the application to function. The security measures ensure that:
1. Users can only access their own session IDs
2. Session IDs are not exposed in error messages
3. All operations are authenticated and authorized

If you have concerns about specific instances of session ID exposure, please report them with details.
