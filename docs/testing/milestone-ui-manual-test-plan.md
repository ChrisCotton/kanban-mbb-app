# Milestone UI Manual Test Plan

## Overview
This document outlines the manual testing procedures for the Milestone UI feature within the Goal Detail Panel. The milestone feature allows users to create, view, toggle, and manage milestones for goals with `milestone_based` progress type.

## Prerequisites
- User account with authentication
- At least one goal with `progress_type: 'milestone_based'`
- Access to the Goal Detail Panel (accessible from Goals Header Strip or Kanban Board)

## Test Environment Setup
1. Ensure the development server is running
2. Log in to the application
3. Navigate to the Dashboard or Kanban Board
4. Have test data ready:
   - At least one goal with `milestone_based` progress type
   - At least one goal with a different progress type (for negative testing)

---

## Test Cases

### TC-1: Milestone Section Visibility

**Objective:** Verify that the Milestones section only appears for milestone-based goals.

**Steps:**
1. Open a goal with `progress_type: 'milestone_based'` in the Goal Detail Panel
2. Scroll to the Milestones section
3. Close the panel
4. Open a goal with a different progress type (e.g., `percentage_based` or `manual`)
5. Check if the Milestones section is visible

**Expected Results:**
- ✅ Milestones section is visible for milestone-based goals
- ✅ Milestones section is NOT visible for non-milestone-based goals
- ✅ Section header displays "Milestones" with proper styling

**Test Data:**
- Goal 1: `progress_type: 'milestone_based'`
- Goal 2: `progress_type: 'percentage_based'`

---

### TC-2: Empty Milestones State

**Objective:** Verify the empty state when a goal has no milestones.

**Steps:**
1. Open a milestone-based goal that has no milestones
2. Locate the Milestones section
3. Observe the empty state message

**Expected Results:**
- ✅ "No milestones yet" message is displayed
- ✅ Message is styled with italic gray text
- ✅ "+ Add Milestone" button is visible and enabled

**Test Data:**
- Goal with `progress_type: 'milestone_based'` and `milestones: []`

---

### TC-3: Create Milestone - Basic Flow

**Objective:** Verify creating a new milestone using the prompt dialog.

**Steps:**
1. Open a milestone-based goal
2. Click the "+ Add Milestone" button
3. Enter a milestone title in the prompt (e.g., "Complete research phase")
4. Click OK
5. Observe the milestone list

**Expected Results:**
- ✅ Prompt dialog appears when clicking "+ Add Milestone"
- ✅ New milestone appears in the list immediately (optimistic update)
- ✅ Milestone is displayed with unchecked checkbox
- ✅ Milestone title matches the entered text
- ✅ Milestone persists after page refresh

**Test Data:**
- Milestone title: "Complete research phase"

---

### TC-4: Create Milestone - Cancel Prompt

**Objective:** Verify canceling the milestone creation prompt.

**Steps:**
1. Open a milestone-based goal
2. Click the "+ Add Milestone" button
3. Click Cancel in the prompt dialog (or press Escape)
4. Observe the milestone list

**Expected Results:**
- ✅ Prompt dialog closes without creating a milestone
- ✅ No new milestone appears in the list
- ✅ Existing milestones remain unchanged

---

### TC-5: Create Milestone - Empty Title Validation

**Objective:** Verify handling of empty or whitespace-only titles.

**Steps:**
1. Open a milestone-based goal
2. Click the "+ Add Milestone" button
3. Leave the prompt empty and click OK
4. Try again with only whitespace (e.g., "   ")
5. Observe the behavior

**Expected Results:**
- ✅ Empty title does not create a milestone
- ✅ Whitespace-only title does not create a milestone
- ✅ No error message displayed (prompt validation)
- ✅ Milestone list remains unchanged

**Test Data:**
- Empty string: ""
- Whitespace only: "   "

---

### TC-6: Create Milestone - Long Title

**Objective:** Verify handling of long milestone titles.

**Steps:**
1. Open a milestone-based goal
2. Click the "+ Add Milestone" button
3. Enter a very long title (255+ characters)
4. Click OK
5. Observe the result

**Expected Results:**
- ✅ Title is truncated or rejected if over 255 characters
- ✅ If accepted, title displays properly in the UI
- ✅ UI layout remains intact (no overflow issues)

**Test Data:**
- Long title: 300+ character string

---

### TC-7: Milestone List Display

**Objective:** Verify milestones are displayed correctly in a list.

**Steps:**
1. Open a milestone-based goal with multiple milestones
2. Observe the milestone list
3. Check the order of milestones
4. Verify styling and layout

**Expected Results:**
- ✅ Milestones are displayed in a vertical list
- ✅ Milestones are sorted by `display_order` (ascending)
- ✅ Each milestone has:
  - ColorDot component (small size)
  - Checkbox input
  - Title text
  - Proper spacing between items
- ✅ List has hover effects (gray background on hover)
- ✅ List items have rounded borders

**Test Data:**
- Goal with 3-5 milestones with different `display_order` values

---

### TC-8: Toggle Milestone - Mark Complete

**Objective:** Verify marking a milestone as complete.

**Steps:**
1. Open a milestone-based goal with at least one incomplete milestone
2. Click the checkbox for an incomplete milestone
3. Observe the visual changes
4. Refresh the page
5. Verify the milestone remains checked

**Expected Results:**
- ✅ Checkbox becomes checked immediately (optimistic update)
- ✅ Milestone title becomes strikethrough
- ✅ Text color changes to gray (completed state)
- ✅ `is_complete` is set to `true` in the database
- ✅ State persists after page refresh
- ✅ Goal progress percentage updates (if applicable)

**Test Data:**
- Milestone with `is_complete: false`

---

### TC-9: Toggle Milestone - Mark Incomplete

**Objective:** Verify unmarking a completed milestone.

**Steps:**
1. Open a milestone-based goal with at least one completed milestone
2. Click the checkbox for a completed milestone
3. Observe the visual changes
4. Refresh the page
5. Verify the milestone remains unchecked

**Expected Results:**
- ✅ Checkbox becomes unchecked immediately (optimistic update)
- ✅ Strikethrough is removed from milestone title
- ✅ Text color returns to normal (dark text)
- ✅ `is_complete` is set to `false` in the database
- ✅ State persists after page refresh
- ✅ Goal progress percentage updates (if applicable)

**Test Data:**
- Milestone with `is_complete: true`

---

### TC-10: Multiple Milestone Toggles

**Objective:** Verify toggling multiple milestones in sequence.

**Steps:**
1. Open a milestone-based goal with multiple milestones
2. Toggle the first milestone (complete)
3. Toggle the second milestone (complete)
4. Toggle the first milestone again (incomplete)
5. Observe all milestones

**Expected Results:**
- ✅ Each toggle updates immediately
- ✅ Visual state reflects the correct completion status
- ✅ No race conditions or state conflicts
- ✅ All changes persist after refresh

**Test Data:**
- Goal with 3 milestones, all initially incomplete

---

### TC-11: Milestone Visual States

**Objective:** Verify visual styling for different milestone states.

**Steps:**
1. Open a milestone-based goal with both complete and incomplete milestones
2. Compare the visual appearance of:
   - Incomplete milestones
   - Complete milestones
3. Hover over each milestone
4. Verify ColorDot appearance

**Expected Results:**
- ✅ Incomplete milestones:
  - Normal text color (dark gray/white)
  - No strikethrough
  - Unchecked checkbox
- ✅ Complete milestones:
  - Gray text color
  - Strikethrough text
  - Checked checkbox
- ✅ Hover effect applies to both states
- ✅ ColorDot displays correctly for both states

**Test Data:**
- Goal with mix of complete and incomplete milestones

---

### TC-12: Progress Calculation Integration

**Objective:** Verify that milestone completion affects goal progress.

**Steps:**
1. Open a milestone-based goal with 4 milestones (all incomplete)
2. Note the current progress percentage
3. Complete 1 milestone (25% should be complete)
4. Verify progress updates
5. Complete 2 more milestones (75% should be complete)
6. Verify progress updates
7. Complete the last milestone (100% should be complete)
8. Verify progress updates

**Expected Results:**
- ✅ Progress percentage updates automatically when milestones are toggled
- ✅ Progress = (completed milestones / total milestones) * 100
- ✅ Progress bar visual updates accordingly
- ✅ Progress color coding updates (red/yellow/green)

**Test Data:**
- Goal with exactly 4 milestones

---

### TC-13: Error Handling - Network Failure

**Objective:** Verify error handling when network requests fail.

**Steps:**
1. Open a milestone-based goal
2. Open browser DevTools → Network tab
3. Set network throttling to "Offline"
4. Try to create a new milestone
5. Try to toggle an existing milestone
6. Restore network connection
7. Observe behavior

**Expected Results:**
- ✅ Optimistic updates are reverted on failure
- ✅ Error is logged to console
- ✅ User sees appropriate error feedback (if implemented)
- ✅ UI returns to previous state
- ✅ After network restore, operations work normally

---

### TC-14: Error Handling - Invalid Goal

**Objective:** Verify error handling for milestones on non-existent goals.

**Steps:**
1. Open a milestone-based goal
2. Note the goal ID
3. Manually delete the goal from the database (or via API)
4. Try to create a milestone
5. Try to toggle a milestone
6. Observe error handling

**Expected Results:**
- ✅ Error message is displayed/logged
- ✅ Optimistic updates are reverted
- ✅ User is notified of the error
- ✅ UI remains stable (no crashes)

---

### TC-15: Concurrent User Actions

**Objective:** Verify behavior when multiple milestones are toggled rapidly.

**Steps:**
1. Open a milestone-based goal with multiple milestones
2. Rapidly click checkboxes for different milestones (5-10 clicks in quick succession)
3. Observe the UI updates
4. Wait for all operations to complete
5. Refresh the page
6. Verify final state matches expected state

**Expected Results:**
- ✅ All toggles are processed correctly
- ✅ No duplicate updates or race conditions
- ✅ Final state matches the number of clicks
- ✅ UI remains responsive during rapid actions
- ✅ All changes persist correctly

**Test Data:**
- Goal with 5 milestones

---

### TC-16: Milestone Section Layout and Responsiveness

**Objective:** Verify the layout and responsiveness of the milestone section.

**Steps:**
1. Open a milestone-based goal with many milestones (10+)
2. Verify the section layout
3. Scroll within the Goal Detail Panel
4. Check milestone items are properly spaced
5. Test on different screen sizes (if responsive)

**Expected Results:**
- ✅ Milestones section fits within the panel width (480px)
- ✅ Long milestone titles wrap properly (no overflow)
- ✅ Section scrolls correctly if there are many milestones
- ✅ Spacing between milestones is consistent
- ✅ "+ Add Milestone" button is always visible and accessible

**Test Data:**
- Goal with 10-15 milestones

---

### TC-17: Dark Mode Support

**Objective:** Verify milestone UI works correctly in dark mode.

**Steps:**
1. Enable dark mode in the application
2. Open a milestone-based goal
3. Verify milestone section appearance
4. Create a new milestone
5. Toggle milestones
6. Verify all visual states

**Expected Results:**
- ✅ All text is readable in dark mode
- ✅ Borders and backgrounds use dark mode colors
- ✅ Hover effects work correctly
- ✅ Completed/incomplete states are distinguishable
- ✅ ColorDot displays correctly

---

### TC-18: Accessibility - Keyboard Navigation

**Objective:** Verify keyboard accessibility for milestone interactions.

**Steps:**
1. Open a milestone-based goal
2. Use Tab key to navigate to "+ Add Milestone" button
3. Press Enter/Space to activate
4. Use Tab to navigate between milestone checkboxes
5. Use Space to toggle checkboxes
6. Verify focus indicators

**Expected Results:**
- ✅ "+ Add Milestone" button is keyboard accessible
- ✅ All checkboxes are keyboard accessible
- ✅ Focus indicators are visible
- ✅ Space key toggles checkboxes
- ✅ Tab order is logical

---

### TC-19: Accessibility - Screen Reader

**Objective:** Verify screen reader compatibility.

**Steps:**
1. Enable screen reader (VoiceOver/NVDA/JAWS)
2. Open a milestone-based goal
3. Navigate through milestones section
4. Verify announcements

**Expected Results:**
- ✅ Section heading is announced
- ✅ Each milestone checkbox is announced with title
- ✅ Completion status is announced
- ✅ Button labels are clear
- ✅ Empty state is announced

---

### TC-20: Milestone Persistence Across Sessions

**Objective:** Verify milestones persist correctly across browser sessions.

**Steps:**
1. Open a milestone-based goal
2. Create 2-3 new milestones
3. Toggle some milestones
4. Close the browser
5. Reopen browser and log in
6. Open the same goal
7. Verify all milestones and their states

**Expected Results:**
- ✅ All created milestones are present
- ✅ Completion states match previous session
- ✅ Order is preserved
- ✅ No duplicate milestones

---

## Edge Cases and Negative Testing

### EC-1: Milestone on Archived Goal
- **Steps:** Try to create/toggle milestones on an archived goal
- **Expected:** Milestones section may not be visible or actions may be disabled

### EC-2: Milestone on Completed Goal
- **Steps:** Try to create/toggle milestones on a completed goal
- **Expected:** Behavior should be consistent (may allow or prevent based on business rules)

### EC-3: Very Long Milestone Title
- **Steps:** Create milestone with 255+ character title
- **Expected:** Should be rejected or truncated appropriately

### EC-4: Special Characters in Title
- **Steps:** Create milestone with special characters (emoji, HTML, SQL injection attempts)
- **Expected:** Should handle gracefully, sanitize if needed

### EC-5: Rapid Create/Delete Cycles
- **Steps:** Create and immediately try to delete milestones rapidly
- **Expected:** Should handle race conditions correctly

---

## Test Execution Checklist

Use this checklist to track test execution:

- [ ] TC-1: Milestone Section Visibility
- [ ] TC-2: Empty Milestones State
- [ ] TC-3: Create Milestone - Basic Flow
- [ ] TC-4: Create Milestone - Cancel Prompt
- [ ] TC-5: Create Milestone - Empty Title Validation
- [ ] TC-6: Create Milestone - Long Title
- [ ] TC-7: Milestone List Display
- [ ] TC-8: Toggle Milestone - Mark Complete
- [ ] TC-9: Toggle Milestone - Mark Incomplete
- [ ] TC-10: Multiple Milestone Toggles
- [ ] TC-11: Milestone Visual States
- [ ] TC-12: Progress Calculation Integration
- [ ] TC-13: Error Handling - Network Failure
- [ ] TC-14: Error Handling - Invalid Goal
- [ ] TC-15: Concurrent User Actions
- [ ] TC-16: Milestone Section Layout and Responsiveness
- [ ] TC-17: Dark Mode Support
- [ ] TC-18: Accessibility - Keyboard Navigation
- [ ] TC-19: Accessibility - Screen Reader
- [ ] TC-20: Milestone Persistence Across Sessions
- [ ] EC-1: Milestone on Archived Goal
- [ ] EC-2: Milestone on Completed Goal
- [ ] EC-3: Very Long Milestone Title
- [ ] EC-4: Special Characters in Title
- [ ] EC-5: Rapid Create/Delete Cycles

---

## Known Limitations / Future Enhancements

Based on code review, the following features are not yet implemented but may be added:

1. **Milestone Edit Functionality**: Currently, milestones cannot be edited after creation (only created and toggled)
2. **Milestone Delete Functionality**: Delete functionality exists in the API but is not exposed in the UI
3. **Milestone Reorder**: Reorder API exists but drag-and-drop UI is not implemented
4. **Better Create UI**: Currently uses browser `prompt()` - should be replaced with a proper modal/form
5. **Milestone Due Dates**: Not currently supported
6. **Milestone Descriptions**: Not currently supported

---

## Test Data Preparation

### SQL Scripts for Test Data

```sql
-- Create a milestone-based goal for testing
INSERT INTO goals (id, user_id, title, description, progress_type, status, target_date)
VALUES (
  'test-goal-milestone-1',
  '<your-user-id>',
  'Test Milestone Goal',
  'Goal for testing milestone functionality',
  'milestone_based',
  'active',
  '2026-12-31'
);

-- Create milestones for testing
INSERT INTO goal_milestones (goal_id, title, display_order, is_complete)
VALUES
  ('test-goal-milestone-1', 'Milestone 1', 0, false),
  ('test-goal-milestone-1', 'Milestone 2', 1, false),
  ('test-goal-milestone-1', 'Milestone 3', 2, true),
  ('test-goal-milestone-1', 'Milestone 4', 3, false);
```

---

## Reporting Issues

When reporting issues, include:
1. Test case number (e.g., TC-3)
2. Steps to reproduce
3. Expected vs actual results
4. Screenshots (if applicable)
5. Browser/OS information
6. Console errors (if any)
7. Network request/response details (if relevant)

---

## Revision History

- **2026-01-30**: Initial test plan created
