# Quick Test Commands Reference

## 🚨 BEFORE EVERY CHECK-IN: Run This First!

```bash
npm test
```

**If ANY test fails → FIX IT → Re-run → Then commit**

---

## Most Common Commands

### Full Test Suite
```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode (recommended)
npm test -- --coverage      # With coverage report
```

### Category-Related Tests (Most Common Failure)
```bash
npm test -- CategorySelector
npm test -- category
npm test -- useCategories
```

### Task-Related Tests
```bash
npm test -- TaskDetailModal
npm test -- TaskCard
npm test -- kanban
```

### Goal-Related Tests
```bash
npm test -- Goal
npm test -- goals
```

### Regression Tests
```bash
npm test -- regression
npm run test:regression:jest
```

### Integration Tests
```bash
npm test -- integration
```

---

## Quick Debugging

```bash
# Run specific test file
npm test -- path/to/test.test.tsx

# Run tests matching name pattern
npm test -- --testNamePattern="category"

# Verbose output
npm test -- --verbose

# Clear cache if tests acting weird
npm test -- --clearCache
```

---

## Pre-Commit Checklist

- [ ] `npm test` → All pass ✅
- [ ] `npm test -- CategorySelector` → Pass ✅
- [ ] `npm test -- TaskDetailModal` → Pass ✅
- [ ] No console errors
- [ ] Code compiles without errors

**THEN commit!**

---

## Emergency Skip (NOT RECOMMENDED)

```bash
git commit --no-verify  # ⚠️ DANGEROUS - fix immediately after!
```

Then immediately:
1. Run `npm test`
2. Fix failures
3. Commit fixes

---

**Remember:** Tests catch bugs BEFORE users do. Run them!
