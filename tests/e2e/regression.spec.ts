import { test, expect } from '@playwright/test';
import { KanbanHelpers } from '../utils/test-helpers';

test.describe('Regression Tests - Critical Bug Prevention', () => {
  let kanban: KanbanHelpers;

  test.beforeEach(async ({ page }) => {
    kanban = new KanbanHelpers(page);
    await kanban.navigateToHome();
  });

  test('regression: task data persists after page reload', async ({ page }) => {
    const taskTitle = `Persistent Task ${Date.now()}`;
    const taskDescription = 'This task should persist after reload';

    // Create a task
    await kanban.createTask(taskTitle, taskDescription);
    await kanban.verifyTaskInColumn(taskTitle, 'todo');

    // Reload the page
    await page.reload();
    await kanban.waitForNetworkIdle();

    // Verify task still exists
    await kanban.verifyTaskInColumn(taskTitle, 'todo');
    
    // Verify task details are preserved
    const task = kanban.getTaskByTitle(taskTitle);
    await task.click();
    await expect(page.locator('[data-testid="task-description"]')).toContainText(taskDescription);
  });

  test('regression: drag and drop works consistently', async ({ page }) => {
    const taskTitle = `DnD Test Task ${Date.now()}`;

    // Create multiple tasks to test drag and drop
    await kanban.createTask(taskTitle);
    await kanban.createTask(`Other Task 1 ${Date.now()}`);
    await kanban.createTask(`Other Task 2 ${Date.now()}`);

    // Test multiple drag operations
    for (let i = 0; i < 3; i++) {
      // Move to in_progress
      await kanban.dragTaskToColumn(taskTitle, 'in_progress');
      await kanban.verifyTaskInColumn(taskTitle, 'in_progress');

      // Move back to todo
      await kanban.dragTaskToColumn(taskTitle, 'todo');
      await kanban.verifyTaskInColumn(taskTitle, 'todo');
    }

    // Final move to done
    await kanban.dragTaskToColumn(taskTitle, 'done');
    await kanban.verifyTaskInColumn(taskTitle, 'done');
  });

  test('regression: form validation works correctly', async ({ page }) => {
    // Try to create task with empty title
    await page.click('[data-testid="add-task-button"]');
    await page.click('[data-testid="save-task-button"]');

    // Should show validation error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/title.*required/i);

    // Cancel the modal
    await page.click('[data-testid="cancel-button"]');
    
    // Verify modal is closed
    await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible();
  });

  test('regression: task count updates correctly', async ({ page }) => {
    // Get initial task counts
    const initialTodoCount = await page.locator('[data-testid="todo-count"]').textContent();
    const initialCount = parseInt(initialTodoCount || '0');

    // Create a task
    const taskTitle = `Count Test Task ${Date.now()}`;
    await kanban.createTask(taskTitle);

    // Verify todo count increased
    const newTodoCount = await page.locator('[data-testid="todo-count"]').textContent();
    expect(parseInt(newTodoCount || '0')).toBe(initialCount + 1);

    // Move task to in_progress
    await kanban.dragTaskToColumn(taskTitle, 'in_progress');

    // Verify todo count decreased and in_progress count increased
    const finalTodoCount = await page.locator('[data-testid="todo-count"]').textContent();
    expect(parseInt(finalTodoCount || '0')).toBe(initialCount);

    const inProgressCount = await page.locator('[data-testid="in-progress-count"]').textContent();
    expect(parseInt(inProgressCount || '0')).toBeGreaterThan(0);
  });

  test('regression: search functionality is case insensitive', async ({ page }) => {
    const taskTitle = `Search Test Task ${Date.now()}`;
    
    await kanban.createTask(taskTitle);

    // Test different case variations
    const searchTerms = [
      'search',
      'SEARCH', 
      'Search',
      'test',
      'TEST',
      'Task',
      'TASK'
    ];

    for (const term of searchTerms) {
      await page.fill('[data-testid="search-input"]', term);
      await page.keyboard.press('Enter');
      await expect(kanban.getTaskByTitle(taskTitle)).toBeVisible();
    }

    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await page.keyboard.press('Enter');
  });

  test('regression: modal dialogs handle escape key correctly', async ({ page }) => {
    const taskTitle = `Modal Test Task ${Date.now()}`;
    await kanban.createTask(taskTitle);

    // Open task modal
    await kanban.getTaskByTitle(taskTitle).click();
    await expect(page.locator('[data-testid="task-modal"]')).toBeVisible();

    // Press escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible();

    // Test with create task modal
    await page.click('[data-testid="add-task-button"]');
    await expect(page.locator('[data-testid="task-modal"]')).toBeVisible();

    // Press escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="task-modal"]')).not.toBeVisible();
  });

  test('regression: network error handling', async ({ page }) => {
    // Simulate offline condition
    await page.context().setOffline(true);

    const taskTitle = `Offline Task ${Date.now()}`;

    // Try to create a task while offline
    await page.click('[data-testid="add-task-button"]');
    await page.fill('[data-testid="task-title-input"]', taskTitle);
    await page.click('[data-testid="save-task-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText(/network.*error|offline|connection/i);

    // Go back online
    await page.context().setOffline(false);
    await kanban.waitForNetworkIdle();
  });

  test('regression: concurrent task operations', async ({ page }) => {
    const baseName = `Concurrent Task ${Date.now()}`;
    
    // Create multiple tasks rapidly
    const tasks = [];
    for (let i = 0; i < 3; i++) {
      const taskTitle = `${baseName} ${i}`;
      tasks.push(taskTitle);
      await kanban.createTask(taskTitle);
    }

    // Verify all tasks were created
    for (const taskTitle of tasks) {
      await expect(kanban.getTaskByTitle(taskTitle)).toBeVisible();
    }

    // Perform rapid operations on different tasks
    await Promise.all([
      kanban.dragTaskToColumn(tasks[0], 'in_progress'),
      kanban.dragTaskToColumn(tasks[1], 'done'),
    ]);

    // Verify final states
    await kanban.verifyTaskInColumn(tasks[0], 'in_progress');
    await kanban.verifyTaskInColumn(tasks[1], 'done');
    await kanban.verifyTaskInColumn(tasks[2], 'todo');
  });

  test('regression: responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const taskTitle = `Mobile Task ${Date.now()}`;
    
    // Test that core functionality works on mobile
    await kanban.createTask(taskTitle);
    await kanban.verifyTaskInColumn(taskTitle, 'todo');

    // Verify mobile-specific UI elements
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Test mobile navigation if applicable
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
}); 