# Z-Index Hierarchy Documentation

**Last Updated:** 2026-01-14

## Z-Index Stacking Order (Bottom → Top)

To prevent UI element overlap and ensure proper layering, we maintain a strict z-index hierarchy:

### Layer 1: Base Layout (z-10)
- **Components:** Layout structure, navigation
- **Z-Index:** `z-10`
- **Purpose:** Base application structure

### Layer 2: Standard UI Elements (z-20 - z-40)
- **Components:** Dropdowns, tooltips, popovers
- **Z-Index:** `z-20` to `z-40`
- **Purpose:** Interactive UI components

### Layer 3: Timer Controls (z-60 - z-70)
- **Components:** TimerRow dropdowns, timer controls
- **Z-Index:** 
  - Backdrop: `z-[60]`
  - Dropdown: `z-[70]`
- **File:** `components/timer/TimerRow.tsx`
- **Purpose:** Timer management UI that needs to overlay kanban board

### Layer 4: Task Modals (z-80)
- **Components:** TaskDetailModal, TaskModal
- **Z-Index:** `z-[80]`
- **File:** `components/kanban/TaskDetailModal.tsx`
- **Purpose:** Task viewing and editing - must be above all other UI

### Layer 5: Confirmation Dialogs (z-90)
- **Components:** Confirmation modals within TaskDetailModal
- **Z-Index:** `z-[90]`
- **File:** `components/kanban/TaskDetailModal.tsx`
- **Purpose:** Critical user decisions - must be top-most layer

## Rules for Adding New Components

1. **Standard dropdowns/tooltips:** Use `z-20` to `z-40`
2. **Full-screen overlays:** Use `z-50`
3. **Specialized overlays (timers, etc.):** Use `z-60` to `z-70`
4. **Primary modals:** Use `z-80`
5. **Nested/confirmation modals:** Use `z-90` or higher

## Testing Z-Index Changes

When modifying z-index values, test these scenarios:
- ✅ Open task detail modal with active timers running
- ✅ Open dropdowns within modals
- ✅ Trigger confirmation dialogs within modals
- ✅ Interact with navigation while modals are open
- ✅ Ensure mobile responsive behavior

## Related Fixes

- **2026-01-14:** Fixed TimerRow dropdown z-index conflict (set to z-[70])
- **2026-01-14:** Fixed TaskDetailModal obscuring edit buttons (set to z-[80])
- **2026-01-14:** Fixed ConfirmationModal within TaskDetailModal (set to z-[90])

---

**Important:** Always document z-index changes in this file to maintain the hierarchy!
