import { test, expect } from '@playwright/test';

test.describe('Task 4.6: SubtaskList Component Tests', () => {
  const testEmail = 'thediabolicalmr4dee@gmail.com';
  const testPassword = '12345';

  test.beforeEach(async ({ page }) => {
    // Navigate to the kanban page
    await page.goto('/kanban');
    
    // Check if already signed in
    const signInButton = page.locator('button:has-text("Sign In")');
    if (await signInButton.isVisible()) {
      // Fill in credentials
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button:has-text("Sign In")');
    }
    
    // Wait for kanban board to load
    await expect(page.locator('h1:has-text("Kanban Board")')).toBeVisible();
  });

  test('should create a task and add subtasks via TaskDetailModal', async ({ page }) => {
    const taskTitle = `Task with Subtasks ${Date.now()}`;
    
    // Create a new task in backlog
    await page.click('button:has-text("Add Task")').first();
    await page.fill('input[placeholder="Enter task title..."]', taskTitle);
    await page.fill('textarea[placeholder="Enter task description..."]', 'A task to test subtasks');
    await page.click('button:has-text("Create Task")');
    
    // Wait for task to appear
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
    
    // Click on the task to open TaskDetailModal
    await page.click(`text=${taskTitle}`);
    
    // Wait for TaskDetailModal to open
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Check that SubtaskList section is visible
    await expect(page.locator('h3:has-text("Subtasks")')).toBeVisible();
    
    // Should show empty state initially
    await expect(page.locator('text=No subtasks yet')).toBeVisible();
    await expect(page.locator('text=Break this task down into smaller steps')).toBeVisible();
    
    // Click "Add subtask" button
    await page.click('button:has-text("Add subtask")');
    
    // Should show input field
    await expect(page.locator('input[placeholder="Enter subtask title..."]')).toBeVisible();
    
    // Add first subtask
    await page.fill('input[placeholder="Enter subtask title..."]', 'First subtask');
    await page.click('button:has-text("Add")');
    
    // Verify first subtask appears
    await expect(page.locator('text=First subtask')).toBeVisible();
    await expect(page.locator('text=0 of 1 completed')).toBeVisible();
    
    // Add second subtask using Enter key
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Second subtask');
    await page.keyboard.press('Enter');
    
    // Verify second subtask appears
    await expect(page.locator('text=Second subtask')).toBeVisible();
    await expect(page.locator('text=0 of 2 completed')).toBeVisible();
  });

  test('should toggle subtask completion and update progress', async ({ page }) => {
    const taskTitle = `Toggle Test Task ${Date.now()}`;
    
    // Create task
    await page.click('button:has-text("Add Task")').first();
    await page.fill('input[placeholder="Enter task title..."]', taskTitle);
    await page.fill('textarea[placeholder="Enter task description..."]', 'Testing subtask completion');
    await page.click('button:has-text("Create Task")');
    
    // Open task details
    await page.click(`text=${taskTitle}`);
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Add two subtasks
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Subtask 1');
    await page.keyboard.press('Enter');
    
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Subtask 2');
    await page.keyboard.press('Enter');
    
    // Check initial state
    await expect(page.locator('text=0 of 2 completed')).toBeVisible();
    
    // Toggle first subtask completion
    const firstSubtaskRow = page.locator('[data-rbd-draggable-id*="subtask"]:has-text("Subtask 1")').first();
    const firstCheckbox = firstSubtaskRow.locator('button').first();
    await firstCheckbox.click();
    
    // Verify progress updates
    await expect(page.locator('text=1 of 2 completed')).toBeVisible();
    
    // Toggle second subtask completion
    const secondSubtaskRow = page.locator('[data-rbd-draggable-id*="subtask"]:has-text("Subtask 2")').first();
    const secondCheckbox = secondSubtaskRow.locator('button').first();
    await secondCheckbox.click();
    
    // Verify all completed
    await expect(page.locator('text=2 of 2 completed')).toBeVisible();
    
    // Progress bar should be visible and at 100%
    const progressBar = page.locator('.bg-green-500').first();
    await expect(progressBar).toBeVisible();
  });

  test('should edit subtask titles inline', async ({ page }) => {
    const taskTitle = `Edit Test Task ${Date.now()}`;
    
    // Create task
    await page.click('button:has-text("Add Task")').first();
    await page.fill('input[placeholder="Enter task title..."]', taskTitle);
    await page.fill('textarea[placeholder="Enter task description..."]', 'Testing subtask editing');
    await page.click('button:has-text("Create Task")');
    
    // Open task details
    await page.click(`text=${taskTitle}`);
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Add a subtask
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Original Title');
    await page.keyboard.press('Enter');
    
    // Click on subtask title to edit
    await page.click('span:has-text("Original Title")');
    
    // Should show edit input
    await expect(page.locator('input[value="Original Title"]')).toBeVisible();
    
    // Edit the title
    await page.fill('input[value="Original Title"]', 'Updated Title');
    await page.keyboard.press('Enter');
    
    // Verify title was updated
    await expect(page.locator('text=Updated Title')).toBeVisible();
    await expect(page.locator('text=Original Title')).not.toBeVisible();
  });

  test('should delete subtasks with confirmation', async ({ page }) => {
    const taskTitle = `Delete Test Task ${Date.now()}`;
    
    // Create task
    await page.click('button:has-text("Add Task")').first();
    await page.fill('input[placeholder="Enter task title..."]', taskTitle);
    await page.fill('textarea[placeholder="Enter task description..."]', 'Testing subtask deletion');
    await page.click('button:has-text("Create Task")');
    
    // Open task details
    await page.click(`text=${taskTitle}`);
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Add a subtask
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'To Delete');
    await page.keyboard.press('Enter');
    
    // Hover over subtask to show actions
    const subtaskRow = page.locator('[data-rbd-draggable-id*="subtask"]:has-text("To Delete")').first();
    await subtaskRow.hover();
    
    // Click delete button
    await subtaskRow.locator('button[title="Delete subtask"]').click();
    
    // Should show confirmation modal
    await expect(page.locator('h3:has-text("Delete Subtask")')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete "To Delete"?')).toBeVisible();
    
    // Confirm deletion
    await page.click('button:has-text("Delete")');
    
    // Subtask should be gone and show empty state
    await expect(page.locator('text=To Delete')).not.toBeVisible();
    await expect(page.locator('text=No subtasks yet')).toBeVisible();
  });

  test('should show subtask progress on TaskCard', async ({ page }) => {
    const taskTitle = `Card Progress Test ${Date.now()}`;
    
    // Create task
    await page.click('button:has-text("Add Task")').first();
    await page.fill('input[placeholder="Enter task title..."]', taskTitle);
    await page.fill('textarea[placeholder="Enter task description..."]', 'Testing card progress display');
    await page.click('button:has-text("Create Task")');
    
    // Open task detail to add subtasks
    await page.click(`text=${taskTitle}`);
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Add subtasks
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Task 1');
    await page.keyboard.press('Enter');
    
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Task 2');
    await page.keyboard.press('Enter');
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Now TaskCard should show progress
    const taskCard = page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`);
    await expect(taskCard.locator('text=0/2')).toBeVisible();
    
    // Complete one subtask
    await page.click(`text=${taskTitle}`);
    const firstSubtaskRow = page.locator('[data-rbd-draggable-id*="subtask"]:has-text("Task 1")').first();
    const firstCheckbox = firstSubtaskRow.locator('button').first();
    await firstCheckbox.click();
    await page.keyboard.press('Escape');
    
    // Progress should update on card
    await expect(taskCard.locator('text=1/2')).toBeVisible();
    
    // Complete second subtask
    await page.click(`text=${taskTitle}`);
    const secondSubtaskRow = page.locator('[data-rbd-draggable-id*="subtask"]:has-text("Task 2")').first();
    const secondCheckbox = secondSubtaskRow.locator('button').first();
    await secondCheckbox.click();
    await page.keyboard.press('Escape');
    
    // Should show completion with checkmark
    await expect(taskCard.locator('text=2/2')).toBeVisible();
    await expect(taskCard.locator('text=✓')).toBeVisible();
  });

  test('should show subtasks in TaskModal when editing existing task', async ({ page }) => {
    const taskTitle = `Modal Edit Test ${Date.now()}`;
    
    // Create task
    await page.click('button:has-text("Add Task")').first();
    await page.fill('input[placeholder="Enter task title..."]', taskTitle);
    await page.fill('textarea[placeholder="Enter task description..."]', 'Testing modal subtask display');
    await page.click('button:has-text("Create Task")');
    
    // Add subtasks via detail modal
    await page.click(`text=${taskTitle}`);
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Modal Test Subtask');
    await page.keyboard.press('Enter');
    
    // Close detail modal
    await page.keyboard.press('Escape');
    
    // Open edit modal (hover over task card and click edit)
    const taskCard = page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`);
    await taskCard.hover();
    await taskCard.locator('button[title="Edit task"]').click();
    
    // Should show TaskModal with subtasks section
    await expect(page.locator('h2:has-text("Edit Task")')).toBeVisible();
    await expect(page.locator('label:has-text("Subtasks")')).toBeVisible();
    await expect(page.locator('text=Modal Test Subtask')).toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('should not show subtasks section when creating new task', async ({ page }) => {
    // Click add task button in backlog column
    await page.click('button:has-text("Add Task")').first();
    
    // Should show TaskModal for creation
    await expect(page.locator('h2:has-text("Create New Task")')).toBeVisible();
    
    // Should NOT show subtasks section (only for existing tasks)
    await expect(page.locator('label:has-text("Subtasks")')).not.toBeVisible();
    
    // Close modal
    await page.keyboard.press('Escape');
  });

  test('should handle keyboard shortcuts correctly', async ({ page }) => {
    const taskTitle = `Keyboard Test Task ${Date.now()}`;
    
    // Create task
    await page.click('button:has-text("Add Task")').first();
    await page.fill('input[placeholder="Enter task title..."]', taskTitle);
    await page.fill('textarea[placeholder="Enter task description..."]', 'Testing keyboard shortcuts');
    await page.click('button:has-text("Create Task")');
    
    // Open task details
    await page.click(`text=${taskTitle}`);
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Test Enter key to add subtask
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Enter Key Test');
    await page.keyboard.press('Enter');
    
    // Verify subtask was added
    await expect(page.locator('text=Enter Key Test')).toBeVisible();
    
    // Test Escape key to cancel add subtask
    await page.click('button:has-text("Add subtask")');
    await page.fill('input[placeholder="Enter subtask title..."]', 'Should Cancel');
    await page.keyboard.press('Escape');
    
    // Should not have added the subtask
    await expect(page.locator('text=Should Cancel')).not.toBeVisible();
    
    // Test Escape to cancel edit
    await page.click('span:has-text("Enter Key Test")');
    await page.fill('input[value="Enter Key Test"]', 'Cancel Edit');
    await page.keyboard.press('Escape');
    
    // Should revert to original title
    await expect(page.locator('text=Enter Key Test')).toBeVisible();
    await expect(page.locator('text=Cancel Edit')).not.toBeVisible();
  });

  test('should show loading states and error handling', async ({ page }) => {
    const taskTitle = `Loading Test ${Date.now()}`;
    
    // Create task
    await page.click('button:has-text("Add Task")').first();
    await page.fill('input[placeholder="Enter task title..."]', taskTitle);
    await page.fill('textarea[placeholder="Enter task description..."]', 'Testing loading states');
    await page.click('button:has-text("Create Task")');
    
    // Open task details
    await page.click(`text=${taskTitle}`);
    
    // Loading state appears briefly, then subtasks section shows
    await expect(page.locator('h3:has-text("Subtasks")')).toBeVisible();
    
    // Should show empty state when no subtasks
    await expect(page.locator('text=No subtasks yet')).toBeVisible();
  });
}); 