import { Page, Locator, expect } from '@playwright/test';

/**
 * Helper class for common test utilities
 */
export class TestHelpers {
  constructor(public readonly page: Page) {}

  /**
   * Navigate to the homepage and wait for it to load
   */
  async navigateToHome() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for an element to be visible with timeout
   */
  async waitForElement(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Verify page title contains expected text
   */
  async verifyPageTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(new RegExp(expectedTitle, 'i'));
  }

  /**
   * Wait for network requests to complete
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill form field and verify value
   */
  async fillAndVerify(selector: string, value: string) {
    await this.page.fill(selector, value);
    await expect(this.page.locator(selector)).toHaveValue(value);
  }

  /**
   * Click element and wait for navigation if needed
   */
  async clickAndWait(selector: string, waitForNavigation = false) {
    if (waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation(),
        this.page.click(selector)
      ]);
    } else {
      await this.page.click(selector);
    }
  }
}

/**
 * Kanban-specific helper methods
 */
export class KanbanHelpers extends TestHelpers {
  /**
   * Get a task card by its title
   */
  getTaskByTitle(title: string): Locator {
    return this.page.locator(`[data-testid="task-card"]:has-text("${title}")`);
  }

  /**
   * Get a column by its status
   */
  getColumnByStatus(status: string): Locator {
    return this.page.locator(`[data-testid="kanban-column"][data-status="${status}"]`);
  }

  /**
   * Create a new task
   */
  async createTask(title: string, description?: string, priority?: string) {
    await this.page.click('[data-testid="add-task-button"]');
    await this.fillAndVerify('[data-testid="task-title-input"]', title);
    
    if (description) {
      await this.fillAndVerify('[data-testid="task-description-input"]', description);
    }
    
    if (priority) {
      await this.page.selectOption('[data-testid="task-priority-select"]', priority);
    }
    
    await this.page.click('[data-testid="save-task-button"]');
    await this.waitForNetworkIdle();
  }

  /**
   * Drag task from one column to another
   */
  async dragTaskToColumn(taskTitle: string, targetStatus: string) {
    const task = this.getTaskByTitle(taskTitle);
    const targetColumn = this.getColumnByStatus(targetStatus);
    
    await task.dragTo(targetColumn);
    await this.waitForNetworkIdle();
  }

  /**
   * Verify task exists in specific column
   */
  async verifyTaskInColumn(taskTitle: string, columnStatus: string) {
    const column = this.getColumnByStatus(columnStatus);
    const task = column.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`);
    await expect(task).toBeVisible();
  }

  /**
   * Delete a task
   */
  async deleteTask(taskTitle: string) {
    const task = this.getTaskByTitle(taskTitle);
    await task.click();
    await this.page.click('[data-testid="delete-task-button"]');
    await this.page.click('[data-testid="confirm-delete-button"]');
    await this.waitForNetworkIdle();
  }
}

/**
 * Authentication helpers (if using Supabase auth)
 */
export class AuthHelpers extends TestHelpers {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string) {
    await this.page.goto('/auth/signup');
    await this.fillAndVerify('[data-testid="email-input"]', email);
    await this.fillAndVerify('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="signup-button"]');
    await this.waitForNetworkIdle();
  }

  /**
   * Sign in an existing user
   */
  async signIn(email: string, password: string) {
    await this.page.goto('/auth/signin');
    await this.fillAndVerify('[data-testid="email-input"]', email);
    await this.fillAndVerify('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="signin-button"]');
    await this.waitForNetworkIdle();
  }

  /**
   * Sign out current user
   */
  async signOut() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="signout-button"]');
    await this.waitForNetworkIdle();
  }

  /**
   * Verify user is signed in
   */
  async verifySignedIn() {
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
  }

  /**
   * Verify user is signed out
   */
  async verifySignedOut() {
    await expect(this.page.locator('[data-testid="signin-button"]')).toBeVisible();
  }
} 