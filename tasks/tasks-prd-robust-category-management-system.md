## Relevant Files

- `database/migrations/013_standardize_categories_schema.sql` - New migration to fix schema inconsistencies and standardize column naming
- `pages/api/categories/index.ts` - Categories API endpoint requiring updates for consistent column naming
- `pages/api/categories/[id].ts` - Individual category API endpoint for update/delete operations
- `lib/database/kanban-queries.ts` - Database query functions that need column name updates
- `components/ui/CategoryManager.tsx` - Main category management component requiring updates
- `components/ui/CategorySelector.tsx` - Category selection component for task assignment
- `components/kanban/TaskCard.tsx` - Task card component to display category information
- `components/kanban/TaskModal.tsx` - Task modal for category assignment and editing
- `hooks/useCategories.ts` - Custom hook for category management operations
- `lib/mental-bank-integration.ts` - MBB integration for earnings calculations
- `pages/categories.js` - Category management page requiring UI/UX improvements
- `pages/api/categories/index.test.ts` - Unit tests for categories API
- `components/ui/CategoryManager.test.tsx` - Unit tests for CategoryManager component
- `hooks/useCategories.test.ts` - Unit tests for useCategories hook
- `lib/database/kanban-queries.test.ts` - Unit tests for database query functions

### Notes

- Database migrations should be run in sequence and tested thoroughly before production
- All API endpoints must be updated to use consistent column naming (`hourly_rate_usd`)
- Frontend components need updates to handle new error states and loading states
- Tests should cover both success and error scenarios for all CRUD operations
- Use `npx jest [optional/path/to/test/file]` to run tests after implementation

## Tasks

- [ ] 1.0 **Phase 1: Database Schema Standardization and Critical Fixes**
  - [ ] 1.1 Create migration script to standardize categories table schema with `hourly_rate_usd` column naming
  - [ ] 1.2 Audit existing database to identify all inconsistent column references across tables
  - [ ] 1.3 Update categories table to use consistent `hourly_rate_usd DECIMAL(10,2)` column type
  - [ ] 1.4 Fix foreign key relationships between categories and tasks tables
  - [ ] 1.5 Add proper database constraints and indexes for performance and data integrity
  - [ ] 1.6 Create rollback migration script in case of issues
  - [ ] 1.7 Test migration script on development database
  - [ ] 1.8 Update time_sessions table to reference correct category schema

- [ ] 2.0 **Phase 2: API Endpoints and Core Functionality Implementation**
  - [ ] 2.1 Update `/api/categories/index.ts` to use consistent `hourly_rate_usd` column naming
  - [ ] 2.2 Fix POST endpoint request body validation to match database schema
  - [ ] 2.3 Update GET endpoint to return task count for each category
  - [ ] 2.4 Create `/api/categories/[id].ts` endpoint for individual category operations (PUT, DELETE)
  - [ ] 2.5 Implement proper error handling with user-friendly messages
  - [ ] 2.6 Add request validation middleware for all category endpoints
  - [ ] 2.7 Update database query functions in `lib/database/kanban-queries.ts`
  - [ ] 2.8 Ensure all API responses follow consistent format structure

- [ ] 3.0 **Phase 3: Frontend Components and User Experience Enhancements**
  - [ ] 3.1 Update `hooks/useCategories.ts` to handle new API response format
  - [ ] 3.2 Fix category creation form in `components/ui/CategoryManager.tsx`
  - [ ] 3.3 Add loading states and error handling to category creation modal
  - [ ] 3.4 Implement category editing functionality with inline editing or modal
  - [ ] 3.5 Add category deletion with confirmation dialog
  - [ ] 3.6 Update `components/ui/CategorySelector.tsx` for task assignment
  - [ ] 3.7 Display task count and hourly rate in category list view
  - [ ] 3.8 Update `components/kanban/TaskCard.tsx` to show category information
  - [ ] 3.9 Update `components/kanban/TaskModal.tsx` for category assignment in tasks
  - [ ] 3.10 Improve overall UI/UX of categories page with dark theme consistency

- [ ] 4.0 **Phase 4: MBB Integration and System Optimization**
  - [ ] 4.1 Update `lib/mental-bank-integration.ts` to use standardized category rates
  - [ ] 4.2 Implement earnings calculation: (category hourly rate × time spent)
  - [ ] 4.3 Add category-based earnings aggregation for reporting
  - [ ] 4.4 Update time tracking to capture category rates at session start
  - [ ] 4.5 Create category performance analytics and insights
  - [ ] 4.6 Optimize database queries for category-related operations
  - [ ] 4.7 Implement caching strategy for frequently accessed category data
  - [ ] 4.8 Add database indexes for optimal query performance

- [ ] 5.0 **Phase 5: Testing and Quality Assurance**
  - [ ] 5.1 Create unit tests for `/api/categories/index.ts` endpoint
  - [ ] 5.2 Create unit tests for `/api/categories/[id].ts` endpoint
  - [ ] 5.3 Write tests for `hooks/useCategories.ts` custom hook
  - [ ] 5.4 Add component tests for `CategoryManager.tsx`
  - [ ] 5.5 Add component tests for `CategorySelector.tsx`
  - [ ] 5.6 Test database migration scripts on test database
  - [ ] 5.7 Create integration tests for category CRUD operations
  - [ ] 5.8 Test category-task assignment functionality end-to-end
  - [ ] 5.9 Verify MBB calculations with category rates are accurate
  - [ ] 5.10 Perform load testing on category-related database operations
  - [ ] 5.11 Test error scenarios and edge cases (network failures, invalid data)
  - [ ] 5.12 Verify all success metrics from PRD are achievable 