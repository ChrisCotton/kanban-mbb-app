import { test, expect } from '@playwright/test';
import { KanbanHelpers } from '../utils/test-helpers';

test.describe('Kanban Board - Basic Functionality', () => {
  let kanban: KanbanHelpers;

  test.beforeEach(async ({ page }) => {
    kanban = new KanbanHelpers(page);
    await kanban.navigateToHome();
  });

  test('should load the kanban board', async ({ page }) => {
    // Verify page loads and shows kanban board
    await kanban.verifyPageTitle('Kanban');
    
    // Check that main kanban columns are visible
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
    
    // Verify we have the expected columns (adjust these based on your actual columns)
    const expectedColumns = ['todo', 'in_progress', 'done'];
    for (const status of expectedColumns) {
      await expect(kanban.getColumnByStatus(status)).toBeVisible();
    }
  });

  test('should create a new task', async ({ page }) => {
    const taskTitle = `Test Task ${Date.now()}`;
    const taskDescription = 'This is a test task created by Playwright';

    // Create a new task
    await kanban.createTask(taskTitle, taskDescription, 'medium');

    // Verify task appears in the todo column
    await kanban.verifyTaskInColumn(taskTitle, 'todo');
    
    // Verify task contains the description when clicked
    const task = kanban.getTaskByTitle(taskTitle);
    await task.click();
    await expect(page.locator('[data-testid="task-description"]')).toContainText(taskDescription);
  });

  test('should move task between columns', async ({ page }) => {
    const taskTitle = `Moveable Task ${Date.now()}`;

    // Create a task
    await kanban.createTask(taskTitle);
    await kanban.verifyTaskInColumn(taskTitle, 'todo');

    // Move task to in_progress
    await kanban.dragTaskToColumn(taskTitle, 'in_progress');
    await kanban.verifyTaskInColumn(taskTitle, 'in_progress');

    // Move task to done
    await kanban.dragTaskToColumn(taskTitle, 'done');
    await kanban.verifyTaskInColumn(taskTitle, 'done');
  });

  test('should edit an existing task', async ({ page }) => {
    const originalTitle = `Original Task ${Date.now()}`;
    const updatedTitle = `Updated Task ${Date.now()}`;

    // Create a task
    await kanban.createTask(originalTitle);
    
    // Click on task to open edit modal
    const task = kanban.getTaskByTitle(originalTitle);
    await task.click();
    
    // Edit the task title
    await page.click('[data-testid="edit-task-button"]');
    await kanban.fillAndVerify('[data-testid="task-title-input"]', updatedTitle);
    await page.click('[data-testid="save-task-button"]');
    
    // Verify task title was updated
    await expect(kanban.getTaskByTitle(updatedTitle)).toBeVisible();
    await expect(kanban.getTaskByTitle(originalTitle)).not.toBeVisible();
  });

  test('should delete a task', async ({ page }) => {
    const taskTitle = `Deletable Task ${Date.now()}`;

    // Create a task
    await kanban.createTask(taskTitle);
    await kanban.verifyTaskInColumn(taskTitle, 'todo');

    // Delete the task
    await kanban.deleteTask(taskTitle);

    // Verify task is no longer visible
    await expect(kanban.getTaskByTitle(taskTitle)).not.toBeVisible();
  });

  test('should filter tasks by priority', async ({ page }) => {
    const highPriorityTask = `High Priority Task ${Date.now()}`;
    const lowPriorityTask = `Low Priority Task ${Date.now()}`;

    // Create tasks with different priorities
    await kanban.createTask(highPriorityTask, 'High priority task', 'high');
    await kanban.createTask(lowPriorityTask, 'Low priority task', 'low');

    // Apply high priority filter (adjust selector based on your UI)
    await page.click('[data-testid="priority-filter"]');
    await page.click('[data-testid="filter-high-priority"]');

    // Verify only high priority task is visible
    await expect(kanban.getTaskByTitle(highPriorityTask)).toBeVisible();
    await expect(kanban.getTaskByTitle(lowPriorityTask)).not.toBeVisible();

    // Clear filter
    await page.click('[data-testid="clear-filters"]');

    // Verify both tasks are visible again
    await expect(kanban.getTaskByTitle(highPriorityTask)).toBeVisible();
    await expect(kanban.getTaskByTitle(lowPriorityTask)).toBeVisible();
  });

  test('should search for tasks', async ({ page }) => {
    const searchableTask = `Searchable Task ${Date.now()}`;
    const nonSearchableTask = `Different Task ${Date.now()}`;

    // Create tasks
    await kanban.createTask(searchableTask);
    await kanban.createTask(nonSearchableTask);

    // Search for specific task
    await kanban.fillAndVerify('[data-testid="search-input"]', 'Searchable');

    // Verify search results
    await expect(kanban.getTaskByTitle(searchableTask)).toBeVisible();
    await expect(kanban.getTaskByTitle(nonSearchableTask)).not.toBeVisible();

    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await page.keyboard.press('Enter');

    // Verify all tasks are visible again
    await expect(kanban.getTaskByTitle(searchableTask)).toBeVisible();
    await expect(kanban.getTaskByTitle(nonSearchableTask)).toBeVisible();
  });
}); 