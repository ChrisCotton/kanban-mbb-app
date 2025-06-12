# End-to-End Testing with Playwright

This directory contains end-to-end (E2E) and regression tests for the MBB Kanban application using [Playwright](https://playwright.dev/).

## Overview

Our testing strategy includes:
- **Smoke Tests**: Basic functionality checks to ensure the app loads and works
- **E2E Tests**: Full user journey testing for core Kanban features
- **Regression Tests**: Prevent bugs from reoccurring after fixes
- **Authentication Tests**: User sign-in/sign-up flows (when implemented)

## Directory Structure

```
tests/
├── e2e/                    # Test files
│   ├── smoke.spec.ts       # Basic app functionality
│   ├── kanban-basic.spec.ts # Core Kanban features
│   ├── regression.spec.ts  # Regression tests
│   └── auth.spec.ts        # Authentication tests
├── utils/                  # Test utilities and helpers
│   └── test-helpers.ts     # Reusable test functions
├── fixtures/               # Test data and fixtures
└── README.md              # This file
```

## Getting Started

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npm run playwright:install
   ```

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run specific test suites
npm run test:smoke
npm run test:regression

# Run specific test file
npx playwright test tests/e2e/kanban-basic.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Configuration

The tests are configured in `playwright.config.ts` with:
- **Base URL**: http://localhost:3000
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Testing**: Chrome Mobile, Safari Mobile
- **Auto-start**: Development server before tests
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On retry

## Writing Tests

### Test Helpers

Use the helper classes in `utils/test-helpers.ts`:

```typescript
import { KanbanHelpers } from '../utils/test-helpers';

test('example test', async ({ page }) => {
  const kanban = new KanbanHelpers(page);
  
  // Navigate to app
  await kanban.navigateToHome();
  
  // Create a task
  await kanban.createTask('Test Task', 'Description', 'high');
  
  // Verify task exists
  await kanban.verifyTaskInColumn('Test Task', 'todo');
});
```

### Data Test IDs

When adding new features, include `data-testid` attributes for reliable element selection:

```jsx
// Good
<button data-testid="add-task-button">Add Task</button>
<div data-testid="kanban-column" data-status="todo">...</div>
<div data-testid="task-card">...</div>

// Avoid relying on classes or text content alone
<button className="btn-primary">Add Task</button>  // Fragile
```

### Test Naming Convention

- **Smoke tests**: `app loads without errors`, `navigation works correctly`
- **Feature tests**: `should create a new task`, `should move task between columns`
- **Regression tests**: `regression: task data persists after page reload`

## Best Practices

### 1. Test Independence
Each test should be independent and not rely on other tests:

```typescript
test.beforeEach(async ({ page }) => {
  // Setup fresh state for each test
  await helpers.navigateToHome();
});
```

### 2. Stable Selectors
Use `data-testid` attributes instead of CSS classes or text content:

```typescript
// Good
await page.click('[data-testid="add-task-button"]');

// Fragile
await page.click('.btn-primary');
await page.click('text=Add Task');
```

### 3. Wait for Network
Always wait for network requests to complete:

```typescript
await kanban.createTask('Title');
await kanban.waitForNetworkIdle(); // Important!
```

### 4. Error Handling
Tests should handle errors gracefully:

```typescript
test('should handle network errors', async ({ page }) => {
  await page.context().setOffline(true);
  // Test offline behavior
  await page.context().setOffline(false);
});
```

## Debugging Tests

### Visual Debugging
```bash
# Run with UI mode to see tests execute
npm run test:e2e:ui

# Run in headed mode to see browser
npm run test:e2e:headed

# Debug specific test
npx playwright test --debug tests/e2e/kanban-basic.spec.ts
```

### Screenshots and Videos
Failed tests automatically capture:
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`
- Traces: `test-results/traces/`

### Console Logs
View console output during tests:

```typescript
test('debug test', async ({ page }) => {
  page.on('console', msg => console.log('Browser:', msg.text()));
  // Your test code
});
```

## CI/CD Integration

Tests can be run in CI environments with:

```bash
# Headless mode (default)
npm run test:e2e

# Generate reports
npx playwright test --reporter=html,junit
```

The configuration automatically:
- Starts the dev server
- Waits for it to be ready
- Runs tests against localhost:3000
- Generates reports

## Common Issues

### 1. Element Not Found
```typescript
// Wait for element to be visible
await page.waitForSelector('[data-testid="element"]', { state: 'visible' });

// Or use expect with timeout
await expect(page.locator('[data-testid="element"]')).toBeVisible();
```

### 2. Timing Issues
```typescript
// Wait for network to settle
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => window.dataLoaded === true);
```

### 3. Authentication State
```typescript
// Clear auth state between tests
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.context().clearPermissions();
});
```

## Test Data Management

For tests that create data:

1. Use unique identifiers: `Test Task ${Date.now()}`
2. Clean up after tests when possible
3. Use test database in CI environments
4. Consider using fixtures for complex test data

## Updating Tests

When adding new features:

1. Add `data-testid` attributes to new components
2. Update helper functions in `test-helpers.ts`
3. Add tests to appropriate spec files
4. Run tests locally before committing
5. Update this README if needed

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-test)
- [Debugging Guide](https://playwright.dev/docs/debug) 