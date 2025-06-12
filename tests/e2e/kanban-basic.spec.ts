import { test, expect } from '@playwright/test';
import { KanbanHelpers, AuthHelpers } from '../utils/test-helpers';

test.describe('Kanban Board - Basic Functionality', () => {
  let kanban: KanbanHelpers;
  let auth: AuthHelpers;
  const testEmail = 'thediabolicalmr4dee@gmail.com';
  const testPassword = '12345';

  test.beforeEach(async ({ page }) => {
    kanban = new KanbanHelpers(page);
    auth = new AuthHelpers(page);
    
    // Sign in before each test
    await auth.signIn(testEmail, testPassword);
    await auth.verifySignedIn();
  });

  test('should load the kanban board', async ({ page }) => {
    // Verify we're on the dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify kanban board is loaded
    await kanban.verifyKanbanBoardLoaded();
  });

  test('should show task statistics', async ({ page }) => {
    // Wait for board to load
    await kanban.verifyKanbanBoardLoaded();
    
    // Check that statistics section is visible
    await expect(page.locator('text=Total tasks:')).toBeVisible();
    await expect(page.locator('text=Completed:')).toBeVisible();
    await expect(page.locator('text=In progress:')).toBeVisible();
  });

  test('should display swim lanes with task counts', async ({ page }) => {
    // Wait for board to load
    await kanban.verifyKanbanBoardLoaded();
    
    // Check that all swim lanes show task counts
    const backlogCount = await kanban.getTaskCount('backlog');
    const todoCount = await kanban.getTaskCount('todo');
    const doingCount = await kanban.getTaskCount('doing');
    const doneCount = await kanban.getTaskCount('done');
    
    // All counts should be non-negative numbers
    expect(backlogCount).toBeGreaterThanOrEqual(0);
    expect(todoCount).toBeGreaterThanOrEqual(0);
    expect(doingCount).toBeGreaterThanOrEqual(0);
    expect(doneCount).toBeGreaterThanOrEqual(0);
  });

  test('should show add task buttons in each swim lane', async ({ page }) => {
    // Wait for board to load
    await kanban.verifyKanbanBoardLoaded();
    
    // Check that add task buttons are visible in each swim lane
    await expect(kanban.getAddTaskButton('backlog')).toBeVisible();
    await expect(kanban.getAddTaskButton('todo')).toBeVisible();
    await expect(kanban.getAddTaskButton('doing')).toBeVisible();
    await expect(kanban.getAddTaskButton('done')).toBeVisible();
  });
}); 