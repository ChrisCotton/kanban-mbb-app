# Product Requirements Document: Database Repair & Migration System

## Introduction/Overview

The MBB Kanban application is experiencing critical database connectivity and migration issues that prevent core functionality from working properly. Users are encountering 500 Internal Server Errors when accessing categories and other database-dependent features. This PRD outlines a comprehensive solution to establish a robust, reliable database system that works consistently across all environments and prevents future database-related issues.

**Problem Statement**: The current database system has multiple failure points including missing table columns, failed migrations, environment configuration issues, and unreliable API endpoints that cause a poor user experience.

**Goal**: Create a bulletproof database system with automated repairs, comprehensive testing, and foolproof environment setup that ensures 100% reliability for all database operations.

## Goals

1. **Immediate Fix**: Resolve all current database schema issues (specifically the missing `description` column in categories table)
2. **Environment Reliability**: Ensure `.env.local` is always properly loaded and never causes authentication failures
3. **Migration System**: Build a robust migration system that can detect, repair, and verify database schema automatically
4. **API Stability**: Eliminate all 500 errors from database-related API endpoints
5. **Developer Experience**: Create foolproof setup process for new developers and environments
6. **Data Integrity**: Implement comprehensive data consistency checks and repairs
7. **Monitoring**: Build automated health checks that detect issues before they affect users

## User Stories

1. **As a developer**, I want to run `npm run db:setup` and have my entire database configured correctly, so that I can start developing immediately without database issues.

2. **As a developer**, I want all migrations to run automatically and reliably, so that I never have to manually fix database schema issues.

3. **As a user**, I want to access the categories page without errors, so that I can manage my task categories effectively.

4. **As a developer**, I want comprehensive database health checks, so that I can identify and fix issues before they affect users.

5. **As a team member**, I want consistent database setup across all environments, so that features work the same way for everyone.

6. **As a developer**, I want automatic detection and repair of common database issues, so that I don't waste time debugging schema problems.

## Functional Requirements

### 1. Environment Configuration System
1.1. The system MUST automatically detect and load `.env.local` from the project root
1.2. The system MUST validate all required environment variables on startup
1.3. The system MUST provide clear error messages for missing or invalid environment variables
1.4. The system MUST remove `.env.local` from `.cursorignore` if it exists there
1.5. The system MUST create a backup mechanism for environment variables

### 2. Database Schema Repair System
2.1. The system MUST detect missing columns in existing tables
2.2. The system MUST automatically apply missing migrations
2.3. The system MUST verify that all table schemas match the expected structure
2.4. The system MUST repair the categories table `description` column issue immediately
2.5. The system MUST handle migration dependencies and ordering correctly

### 3. Migration Management System
3.1. The system MUST track which migrations have been applied
3.2. The system MUST provide rollback capabilities for failed migrations
3.3. The system MUST validate migration syntax before execution
3.4. The system MUST support both incremental and full database setup
3.5. The system MUST provide detailed logging for all migration operations

### 4. API Error Handling & Recovery
4.1. The system MUST eliminate all 500 errors from categories API endpoints
4.2. The system MUST provide graceful error handling with user-friendly messages
4.3. The system MUST implement retry logic for transient database failures
4.4. The system MUST validate API payloads before database operations
4.5. The system MUST provide detailed error logging for debugging

### 5. Health Check & Monitoring System
5.1. The system MUST provide a `/api/health/database` endpoint that checks all database connections
5.2. The system MUST verify that all required tables exist and have correct schemas
5.3. The system MUST test basic CRUD operations on all major tables
5.4. The system MUST validate RLS (Row Level Security) policies are working correctly
5.5. The system MUST provide a dashboard showing database health status

### 6. Data Consistency & Integrity
6.1. The system MUST verify foreign key relationships are intact
6.2. The system MUST check for orphaned records and provide repair options
6.3. The system MUST validate that all required indexes exist
6.4. The system MUST ensure user data isolation through proper RLS policies
6.5. The system MUST provide data validation for all database operations

### 7. Developer Tools & Commands
7.1. The system MUST provide `npm run db:setup` command for complete database initialization
7.2. The system MUST provide `npm run db:health` command for comprehensive health checks
7.3. The system MUST provide `npm run db:repair` command for automatic issue resolution
7.4. The system MUST provide `npm run db:migrate` command for applying specific migrations
7.5. The system MUST provide `npm run db:reset` command for complete database reset

## Non-Goals (Out of Scope)

- Creating new database tables or major schema changes beyond fixing existing issues
- Migrating to a different database provider (staying with Supabase)
- Implementing database performance optimizations (focus is on reliability)
- Building a GUI for database management (CLI tools are sufficient)
- Implementing real-time database monitoring dashboards

## Design Considerations

### File Structure
```
database/
├── health/
│   ├── health-checker.js
│   └── repair-tools.js
├── migrations/
│   ├── migration-tracker.js
│   └── migration-runner.js
├── setup/
│   ├── environment-validator.js
│   └── initial-setup.js
└── utils/
    ├── connection-tester.js
    └── schema-validator.js

scripts/
├── db-setup.js
├── db-health.js
├── db-repair.js
└── db-migrate.js
```

### Environment Variable Validation
- Check for all required Supabase keys
- Validate URL formats and connectivity
- Provide specific error messages for each missing variable
- Create template `.env.local.example` file

### Error Handling Strategy
- Implement circuit breaker pattern for database connections
- Use exponential backoff for retries
- Provide detailed error codes for different failure types
- Log all errors with sufficient context for debugging

## Technical Considerations

### Dependencies
- Maintain compatibility with existing Supabase client configuration
- Use existing Next.js API route structure
- Integrate with current authentication system
- Work with existing RLS policies

### Database Compatibility
- Support Supabase PostgreSQL features
- Work with existing table structures
- Maintain backward compatibility with current data
- Handle Supabase-specific extensions and functions

### Performance Requirements
- Health checks should complete within 5 seconds
- Migration operations should provide progress feedback
- Database setup should complete within 30 seconds for fresh install
- API endpoints should respond within 2 seconds under normal conditions

## Success Metrics

### Immediate Success Criteria (Must be achieved)
1. **Zero 500 Errors**: All existing API endpoints return appropriate status codes (200, 400, 401, 403, 404) but never 500
2. **Complete Categories Functionality**: Users can view, create, edit, and delete categories without any errors
3. **Environment Setup Success**: Any developer can run setup commands and have a working database in under 2 minutes
4. **Migration Reliability**: All migrations run successfully on first attempt with 100% success rate
5. **Health Check Coverage**: Health checks detect and report on all critical database components

### Long-term Success Criteria
1. **Developer Onboarding**: New team members can set up the database without any manual intervention
2. **Environment Consistency**: Features work identically across local, dev, staging, and production environments
3. **Data Integrity**: Zero data corruption or consistency issues detected by automated checks
4. **System Reliability**: 99.9% uptime for database-dependent features
5. **Issue Prevention**: Proactive detection and auto-repair of 90% of potential database issues

## Implementation Phases

### Phase 1: Immediate Fixes (Week 1)
- Fix `.env.local` loading and remove from `.cursorignore`
- Repair categories table schema (add missing `description` column)
- Fix migration script file path resolution
- Eliminate current 500 errors

### Phase 2: Robust Infrastructure (Week 2)
- Implement comprehensive health checking system
- Build migration tracking and verification
- Create automated repair tools
- Add proper error handling to all API endpoints

### Phase 3: Developer Experience (Week 3)
- Create CLI commands for database management
- Build environment validation system
- Implement automated setup process
- Add comprehensive documentation

### Phase 4: Monitoring & Maintenance (Week 4)
- Deploy health monitoring across all environments
- Implement proactive issue detection
- Create performance monitoring
- Add automated backup verification

## Open Questions

1. Should we implement database connection pooling for better performance?
2. Do we need to support multiple Supabase projects for different environments?
3. Should health checks run automatically on application startup?
4. What level of automatic repair should be attempted vs. requiring manual intervention?
5. Should we implement database schema versioning beyond just migration tracking?

## Definition of Done

This feature will be considered complete when:
- [ ] All 6 success criteria from the "Immediate Success Criteria" section are met
- [ ] All functional requirements (1.1 through 7.5) are implemented and tested
- [ ] Categories page works without any errors in all supported environments
- [ ] New developers can set up the database with a single command
- [ ] Automated tests verify all database operations work correctly
- [ ] Documentation is updated with new setup and troubleshooting procedures 