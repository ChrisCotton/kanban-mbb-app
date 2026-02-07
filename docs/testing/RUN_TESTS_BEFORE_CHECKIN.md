# Running Full Regression Test Suite Before Check-In

## 🚨 CRITICAL: Always Run Tests Before Committing

**TDD Principle:** Tests should catch regressions BEFORE they reach production. Always run the full test suite before every check-in to prevent breaking basic functionality.

## Quick Start

```bash
# Run ALL tests (unit + integration + regression)
npm test

# Run tests in watch mode (recommended during development)
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Test Suite Structure

### 1. Unit Tests (`__tests__/`)
- **Location:** `__tests__/` directory
- **Purpose:** Test individual components and functions in isolation
- **Run:** `npm test -- __tests__/`

### 2. Component Tests (`src/components/**/__tests__/`)
- **Location:** Component-specific test directories
- **Purpose:** Test React components
- **Run:** `npm test -- src/components`

### 3. Integration Tests (`__tests__/integration/`)
- **Location:** `__tests__/integration/`
- **Purpose:** Test multiple components working together
- **Run:** `npm test -- __tests__/integration`

### 4. Regression Tests (`__tests__/regression/`)
- **Location:** `__tests__/regression/`
- **Purpose:** Prevent previously fixed bugs from reoccurring
- **Run:** `npm test -- __tests__/regression`

### 5. API Tests (`__tests__/api/`)
- **Location:** `__tests__/api/`
- **Purpose:** Test API endpoints
- **Run:** `npm test -- __tests__/api`

## Pre-Check-In Checklist

### ✅ Step 1: Run Full Test Suite
```bash
npm test
```

**Expected:** All tests pass (green checkmarks)

### ✅ Step 2: Check for Specific Regression Tests

**Category Loading:**
```bash
npm test -- CategorySelector
npm test -- category
```

**Task Detail Modal:**
```bash
npm test -- TaskDetailModal
```

**Goal Functionality:**
```bash
npm test -- Goal
npm test -- goals
```

### ✅ Step 3: Run Integration Tests
```bash
npm test -- integration
```

### ✅ Step 4: Check Test Coverage
```bash
npm test -- --coverage
```

**Minimum Coverage:** Aim for >80% coverage on modified files

## Common Test Commands

### Run Specific Test File
```bash
npm test -- path/to/test/file.test.tsx
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="category"
npm test -- --testNamePattern="TaskDetailModal"
```

### Run Tests in Specific Directory
```bash
npm test -- components/ui
npm test -- __tests__/api
```

### Run Tests with Verbose Output
```bash
npm test -- --verbose
```

### Run Tests and Update Snapshots (if needed)
```bash
npm test -- -u
```

## Watch Mode (Recommended During Development)

```bash
# Watch all files
npm test -- --watch

# Watch only changed files
npm test -- --watch --onlyChanged

# Watch with coverage
npm test -- --watch --coverage
```

## CI/CD Integration

Tests automatically run on:
- **Pre-commit hooks** (if configured)
- **Pull Request** (via GitHub Actions)
- **Before merge to main**

**DO NOT** skip tests even if CI will run them - catch issues locally first!

## Fixing Broken Tests

### 1. Read the Error Message
- Check which test failed
- Read the error message carefully
- Check the stack trace

### 2. Run the Specific Test
```bash
npm test -- path/to/failing/test.test.tsx
```

### 3. Fix the Issue
- Fix the code, not the test (unless test is wrong)
- Ensure the fix doesn't break other tests

### 4. Re-run Tests
```bash
npm test
```

### 5. Verify All Tests Pass
```bash
npm test
```

## Common Test Failures and Fixes

### Category Loading Issues
**Symptoms:** Tests fail with "Category not found" or "Loading..." stuck
**Fix:** Check `useCategories` hook and CategorySelector component
**Test:** `npm test -- CategorySelector`

### Task Update Issues
**Symptoms:** Tests fail when updating task properties
**Fix:** Check API endpoint handles all fields (especially `category_id`)
**Test:** `npm test -- TaskDetailModal`

### Goal Functionality Issues
**Symptoms:** Goal-related tests fail
**Fix:** Check goals store and API endpoints
**Test:** `npm test -- goals`

## Test Configuration Files

- **Jest Config:** `jest.config.js`
- **Jest Setup:** `jest.setup.js`
- **Integration Config:** `jest.integration.config.js`

## Debugging Tests

### Run Single Test with Debug Output
```bash
npm test -- --testNamePattern="specific test name" --verbose
```

### Debug in VS Code
1. Set breakpoint in test file
2. Open Debug panel
3. Select "Jest: Current File"
4. Press F5

### Console Logging
```javascript
// In test file
console.log('Debug info:', variable)
```

## Performance

### Run Tests in Parallel (default)
```bash
npm test
```

### Run Tests Sequentially (if needed)
```bash
npm test -- --runInBand
```

## Best Practices

1. ✅ **Run tests BEFORE writing code** (TDD)
2. ✅ **Run tests AFTER making changes**
3. ✅ **Run tests BEFORE committing**
4. ✅ **Run tests BEFORE pushing**
5. ✅ **Fix failing tests immediately**
6. ✅ **Don't skip tests** (even if "it's just a small change")
7. ✅ **Write tests for new features**
8. ✅ **Update tests when changing behavior**

## Emergency: Skip Tests (NOT RECOMMENDED)

**⚠️ ONLY in emergencies, and fix immediately after:**

```bash
# Skip tests (DANGEROUS - only for emergencies)
git commit --no-verify
```

**Then immediately:**
1. Run tests locally
2. Fix any failures
3. Create follow-up commit with fixes

## Test Maintenance

### Update Snapshots
```bash
npm test -- -u
```

### Clear Jest Cache
```bash
npm test -- --clearCache
```

## Getting Help

If tests are failing and you can't figure out why:

1. **Check recent changes:** `git log --oneline -10`
2. **Check test output:** Look for error messages
3. **Run specific test:** `npm test -- path/to/test`
4. **Check CI logs:** If PR is open, check GitHub Actions
5. **Ask for help:** Don't commit broken tests!

## Summary

**Before EVERY check-in:**
```bash
npm test
```

**If ANY test fails:**
1. ❌ DO NOT commit
2. 🔍 Investigate the failure
3. 🔧 Fix the issue
4. ✅ Re-run tests
5. ✅ Verify all pass
6. ✅ Then commit

---

**Remember:** Tests are your safety net. They catch bugs BEFORE users do. Run them religiously!
