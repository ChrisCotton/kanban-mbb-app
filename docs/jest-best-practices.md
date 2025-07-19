# Jest Best Practices and Syntax Guidelines

## Table of Contents
1. [Test Structure](#test-structure)
2. [Mock Placement and Hoisting](#mock-placement-and-hoisting)
3. [Common Syntax Pitfalls](#common-syntax-pitfalls)
4. [Mock Best Practices](#mock-best-practices)
5. [Test Organization](#test-organization)
6. [Error Prevention](#error-prevention)

## Test Structure

### Proper File Structure
```typescript
// 1. Imports (all imports at the top)
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentToTest } from './ComponentToTest';

// 2. Mock declarations (immediately after imports)
jest.mock('./SomeModule', () => ({
  __esModule: true,
  default: jest.fn(),
  namedExport: jest.fn(),
}));

// 3. Mock implementations/variables (only for mocks starting with 'mock')
const mockFunction = jest.fn();

// 4. Main describe block
describe('ComponentToTest', () => {
  // 5. Setup/teardown
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 6. Nested describe blocks for organization
  describe('when condition X', () => {
    // 7. Individual test cases
    it('should do something', () => {
      // Test implementation
    });
  });
});
```

### Describe Block Nesting Rules
- **Always** have at least one main `describe` block
- **Always** close every `describe` and `it` block with proper braces
- **Never** exceed 3 levels of nesting for readability

```typescript
describe('ComponentName', () => {          // Level 1: Component name
  describe('when specific condition', () => { // Level 2: Context/scenario
    it('should perform expected action', () => { // Level 3: Test case
      // Test implementation
    });
  });
});
```

## Mock Placement and Hoisting

### Critical Rules for Mock Placement

1. **Mock calls are hoisted** - Jest moves all `jest.mock()` calls to the top of the file before any imports
2. **Variable naming matters** - Only variables starting with `mock` can be used in mock factories
3. **Timing is crucial** - Variables must be initialized when the mock factory runs

### ✅ Correct Mock Patterns

```typescript
// Pattern 1: Direct mock factory (recommended)
jest.mock('./utils', () => ({
  __esModule: true,
  default: jest.fn(),
  utilFunction: jest.fn(() => 'mocked result'),
}));

// Pattern 2: Mock variables (must start with 'mock')
const mockUtilFunction = jest.fn();
jest.mock('./utils', () => ({
  __esModule: true,
  utilFunction: () => mockUtilFunction(), // Note: wrapped in arrow function
}));

// Pattern 3: Real module with overrides
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  specificFunction: jest.fn(),
}));
```

### ❌ Common Mock Mistakes

```typescript
// WRONG: Variable doesn't start with 'mock'
const utilFunction = jest.fn();
jest.mock('./utils', () => ({
  utilFunction, // ERROR: Cannot access before initialization
}));

// WRONG: Direct reference to mock variable
const mockUtilFunction = jest.fn();
jest.mock('./utils', () => ({
  utilFunction: mockUtilFunction, // ERROR: Temporal Dead Zone
}));

// WRONG: Using imports in mock factory
import React from 'react';
jest.mock('./component', () => ({
  default: () => <div>Mock</div>, // ERROR: React not available during hoisting
}));
```

### ✅ Correct Mock Variable Usage

```typescript
// Correct: Wrap in arrow function for lazy evaluation
const mockFunction = jest.fn();
jest.mock('./module', () => ({
  namedExport: () => mockFunction(), // Evaluated when called, not when mocked
}));

// Correct: Use in mock implementation
const mockData = { id: 1, name: 'test' };
jest.mock('./module', () => ({
  getData: jest.fn(() => mockData), // Return value, not the function itself
}));
```

## Common Syntax Pitfalls

### 1. Missing Closing Braces
```typescript
// WRONG: Missing closing brace
describe('Test', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
// Missing closing brace for describe!

// CORRECT: Always match opening and closing braces
describe('Test', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
}); // ✅ Proper closing
```

### 2. Arrow Function vs Function Declaration in Mocks
```typescript
// WRONG: Arrow function as constructor
jest.mock('./Class', () => {
  return () => ({ method: jest.fn() }); // Cannot use 'new' with arrow function
});

// CORRECT: Function declaration for constructors
jest.mock('./Class', () => {
  return function() { // Regular function can be called with 'new'
    return { method: jest.fn() };
  };
});

// CORRECT: Using jest.fn().mockImplementation
jest.mock('./Class', () => {
  return jest.fn().mockImplementation(() => ({
    method: jest.fn(),
  }));
});
```

### 3. Mock Module Format
```typescript
// WRONG: Missing __esModule for ES6 modules
jest.mock('./esModule', () => ({
  default: jest.fn(),
  namedExport: jest.fn(),
}));

// CORRECT: Include __esModule for ES6 modules
jest.mock('./esModule', () => ({
  __esModule: true,
  default: jest.fn(),
  namedExport: jest.fn(),
}));
```

## Mock Best Practices

### Component Mocking
```typescript
// Mock child components to isolate unit under test
jest.mock('./ChildComponent', () => {
  return function MockChildComponent({ children, ...props }: any) {
    return (
      <div data-testid="mock-child-component" {...props}>
        {children}
      </div>
    );
  };
});

// Mock hooks
jest.mock('./useCustomHook', () => ({
  useCustomHook: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
  })),
}));
```

### API/External Service Mocking
```typescript
// Mock axios or fetch
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock external libraries
jest.mock('some-library', () => ({
  SomeClass: jest.fn().mockImplementation(() => ({
    method: jest.fn(),
  })),
  utilFunction: jest.fn(),
}));
```

## Test Organization

### Grouping Tests Logically
```typescript
describe('TaskDetailModal', () => {
  // Setup once for all tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Group by functionality
  describe('Initial Rendering', () => {
    it('displays task details correctly', () => {});
    it('shows all required fields', () => {});
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      // Additional setup for edit mode tests
    });

    it('enters edit mode when button clicked', () => {});
    it('saves changes on submit', () => {});
  });

  describe('Modal Behavior', () => {
    it('closes on escape key', () => {});
    it('closes on backdrop click', () => {});
  });
});
```

### Test Naming Conventions
```typescript
// ✅ Good: Descriptive and specific
it('displays error message when API call fails', () => {});
it('disables submit button when form is invalid', () => {});
it('calls onSave with correct data when form is submitted', () => {});

// ❌ Bad: Vague or generic
it('works correctly', () => {});
it('should test the component', () => {});
it('handles data', () => {});
```

## Error Prevention

### Lint Rules Setup
Add these ESLint rules to prevent common Jest mistakes:

```json
{
  "extends": ["plugin:jest/recommended"],
  "rules": {
    "jest/no-disabled-tests": "error",
    "jest/no-focused-tests": "error",
    "jest/no-identical-title": "error",
    "jest/prefer-to-have-length": "warn",
    "jest/valid-expect": "error",
    "jest/valid-expect-in-promise": "error",
    "jest/no-conditional-expect": "error"
  }
}
```

### IDE Setup
Configure your IDE to:
1. Show matching braces
2. Auto-close brackets/braces
3. Highlight syntax errors
4. Format on save

### Common Jest Patterns Checklist
- [ ] All imports at the top
- [ ] Mock declarations after imports
- [ ] Mock variables start with 'mock'
- [ ] Every describe/it has matching closing brace
- [ ] beforeEach/afterEach for cleanup
- [ ] Specific, descriptive test names
- [ ] One assertion per test (when possible)
- [ ] Mock external dependencies
- [ ] Clear, readable test structure

### Debugging Mock Issues
```typescript
// Check if something is mocked
console.log(jest.isMockFunction(someFunction));

// View mock calls
console.log(mockFunction.mock.calls);
console.log(mockFunction.mock.results);

// Reset specific mock
mockFunction.mockReset();

// Reset all mocks
jest.resetAllMocks();
```

## Module Configuration

### Jest Config for ES Modules
```javascript
// jest.config.js
module.exports = {
  // Handle ES modules that don't transpile well
  transformIgnorePatterns: [
    'node_modules/(?!(module-that-needs-transform)/)',
  ],
  
  // Map problematic modules to mocks
  moduleNameMapper: {
    '^remark-gfm$': '<rootDir>/__mocks__/remark-gfm.js',
    '^rehype-highlight$': '<rootDir>/__mocks__/rehype-highlight.js',
  },
  
  // Reset mocks between tests
  resetMocks: true,
  clearMocks: true,
};
```

### Mock Files Structure
```
__mocks__/
├── remark-gfm.js          // Simple: module.exports = {};
├── rehype-highlight.js    // Simple: module.exports = {};
└── complex-library.js     // Full mock implementation
```

Remember: **When in doubt, keep it simple!** Jest works best with straightforward, explicit mocks and clear test structure. 