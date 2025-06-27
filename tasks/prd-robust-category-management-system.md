# Product Requirements Document: Robust Category Management System Redesign

## Introduction/Overview

The current category management system suffers from database schema inconsistencies and brittle design patterns that prevent users from successfully creating and managing task categories. This redesign aims to create a robust, error-free category management system that supports full CRUD operations, task assignment, and hourly rate tracking for Mental Bank Balance (MBB) calculations.

**Problem Statement**: The existing system has inconsistent column naming (`hourly_rate` vs `hourly_rate_usd` vs `p_hourly_rate_usd`) causing database errors and preventing category creation, leading to user frustration and broken functionality.

**Solution Goal**: Implement a consistent, robust category management system that eliminates database errors, provides seamless CRUD operations, and integrates effectively with the MBB system for time tracking and billing calculations.

## Goals

1. **Eliminate Database Errors**: Fix schema inconsistencies to ensure 100% success rate for category CRUD operations
2. **Improve User Experience**: Provide intuitive category management with clear feedback and error handling
3. **Enable Accurate Time Tracking**: Support precise hourly rate tracking for MBB calculations
4. **Ensure Data Consistency**: Maintain referential integrity between categories and tasks
5. **Reduce System Complexity**: Simplify the category model to prevent future maintenance issues

## User Stories

**As a user, I want to:**
- Create new task categories with custom hourly rates so that I can organize my work and track billing accurately
- Edit existing categories to update names and hourly rates when my work focus or rates change
- Delete categories I no longer need, even if they have been assigned to completed tasks
- View all my categories with their current task counts and hourly rates in one place
- Assign a single category to my tasks to enable proper time tracking and billing
- See my accumulated earnings per category based on time spent and hourly rates

**As a system user, I want to:**
- Have confidence that category operations will succeed without database errors
- Understand why an operation failed if it does fail, with clear error messages
- See immediate feedback when categories are created, updated, or deleted

## Functional Requirements

### Core Category Management
1. **Create Category**: The system must allow users to create new categories with a name and hourly rate (USD)
2. **Read Categories**: The system must display all user categories with name, hourly rate, and task count
3. **Update Category**: The system must allow editing of category name and hourly rate
4. **Delete Category**: The system must allow deletion of categories, including those assigned to existing tasks
5. **Validate Category Data**: The system must validate category names (non-empty, reasonable length) and hourly rates (positive numbers)

### Database Schema Consistency
6. **Standardized Column Naming**: The system must use consistent column naming across all category-related tables
7. **Proper Data Types**: The system must use appropriate data types for all category fields (text for names, decimal for rates)
8. **Referential Integrity**: The system must maintain proper foreign key relationships between categories and tasks

### Task-Category Integration
9. **Optional Assignment**: The system must allow tasks to exist without categories (nullable foreign key)
10. **Single Category per Task**: The system must enforce one category maximum per task
11. **Category Display in Tasks**: The system must show the assigned category name and rate in task views
12. **Task Count Tracking**: The system must accurately count and display the number of tasks per category

### Mental Bank Balance Integration
13. **Rate Calculation**: The system must calculate accumulated balance as (category hourly rate × time spent)
14. **Balance Aggregation**: The system must support aggregating earnings by category for reporting
15. **Currency Consistency**: The system must handle all rates in USD with proper decimal precision

### User Interface Requirements
16. **Category List View**: The system must display categories in a clean, sortable table/list format
17. **Category Creation Modal**: The system must provide an intuitive modal for creating new categories
18. **Category Edit Interface**: The system must allow in-place editing or modal-based editing of categories
19. **Confirmation Dialogs**: The system must show confirmation dialogs for destructive operations (delete)
20. **Error Feedback**: The system must display clear, actionable error messages for failed operations

### API Requirements
21. **RESTful Endpoints**: The system must provide standard REST endpoints for category CRUD operations
22. **Proper HTTP Status Codes**: The system must return appropriate status codes for all operations
23. **Error Response Format**: The system must return consistent error response formats
24. **Request Validation**: The system must validate all incoming requests and reject invalid data

## Non-Goals (Out of Scope)

- **Hierarchical Categories**: No parent/child category relationships or nested structures
- **Multi-Currency Support**: Only USD currency support (no EUR, GBP, etc.)
- **Category Sharing**: No sharing categories between different users
- **Category Templates**: No predefined category templates or suggestions
- **Category Archives**: No soft-delete or archive functionality for categories
- **Bulk Operations**: No bulk category creation, editing, or deletion
- **Category Permissions**: No role-based access control for categories
- **Category History**: No audit trail or version history for category changes

## Design Considerations

### Database Schema
- Use `hourly_rate_usd` as the standard column name across all tables
- Implement proper decimal precision (e.g., DECIMAL(10,2)) for monetary values
- Add database constraints for data validation
- Include created_at and updated_at timestamps for audit purposes

### User Interface
- Maintain consistency with existing MBB dashboard design patterns
- Use the current dark theme and color scheme
- Implement responsive design for mobile and desktop use
- Provide loading states and optimistic updates where appropriate

### API Design
- Follow existing API patterns in the codebase
- Implement proper error handling and logging
- Use consistent response formats across all endpoints
- Include proper request validation middleware

## Technical Considerations

### Database Migration
- Create migration scripts to standardize existing column names
- Handle data migration for existing categories with different column names
- Ensure zero-downtime migration process
- Include rollback procedures for migration failures

### Integration Points
- Categories API (`/api/categories/*`)
- Tasks API (`/api/kanban/tasks/*`) for category assignment
- MBB calculation system for earnings aggregation
- Frontend components: CategoryManager, CategorySelector, TaskCard, TaskModal

### Error Handling
- Implement comprehensive error handling for database operations
- Provide user-friendly error messages for common failures
- Log technical errors for debugging while showing simple messages to users
- Handle edge cases like network failures and concurrent modifications

## Success Metrics

### Technical Metrics
- **Category Creation Success Rate**: 100% (up from current ~0% due to schema errors)
- **API Response Time**: <200ms for category operations
- **Error Rate**: <1% for all category CRUD operations
- **Database Query Performance**: All category queries complete in <50ms

### User Experience Metrics
- **Task Categorization Rate**: >70% of tasks assigned to categories
- **Category Management Engagement**: Users actively create and manage multiple categories
- **Support Ticket Reduction**: 90% reduction in category-related error reports
- **Time Tracking Accuracy**: Improved accuracy in MBB calculations due to proper category assignment

### Business Metrics
- **User Retention**: Maintain or improve retention rates due to improved functionality
- **Feature Adoption**: Increased usage of MBB tracking features
- **Data Quality**: Improved consistency in time tracking and billing data

## Open Questions

1. **Migration Strategy**: Should we migrate existing categories with inconsistent column names automatically or require manual review?
2. **Default Categories**: Should the system provide any default/starter categories for new users?
3. **Rate Limits**: Should there be limits on the number of categories a user can create?
4. **Category Name Uniqueness**: Should category names be unique per user or allow duplicates?
5. **Deletion Confirmation**: What level of confirmation is needed for category deletion (simple confirm vs. typing category name)?
6. **Task Reassignment**: When a category is deleted, should tasks be automatically unassigned or offer bulk reassignment to another category?

## Implementation Priority

### Phase 1 (Critical - Database Fix)
- Fix database schema inconsistencies
- Migrate existing data
- Ensure basic CRUD operations work

### Phase 2 (Core Functionality)
- Implement robust API endpoints
- Update frontend components
- Add proper error handling

### Phase 3 (User Experience)
- Enhance UI/UX
- Add confirmation dialogs
- Implement task count tracking

### Phase 4 (Integration & Polish)
- Complete MBB integration
- Performance optimization
- Comprehensive testing 