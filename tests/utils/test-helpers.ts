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
   * Navigate to dashboard (main kanban page)
   */
  async navigateToDashboard() {
    await this.page.goto('/dashboard');
    await this.waitForNetworkIdle();
  }

  /**
   * Get a task card by its title
   */
  getTaskByTitle(title: string): Locator {
    return this.page.locator(`.kanban-board h3:has-text("${title}")`).locator('..');
  }

  /**
   * Get a swim lane by its status
   */
  getSwimLaneByStatus(status: string): Locator {
    const statusTitles = {
      'backlog': 'Backlog',
      'todo': 'To Do', 
      'doing': 'Doing',
      'done': 'Done'
    };
    const title = statusTitles[status as keyof typeof statusTitles];
    return this.page.locator(`.swim-lane:has(h2:has-text("${title}"))`);
  }

  /**
   * Get add task button for a specific swim lane
   */
  getAddTaskButton(status: string): Locator {
    const swimLane = this.getSwimLaneByStatus(status);
    return swimLane.locator('button:has-text("Add Task")');
  }

  /**
   * Create a new task
   */
  async createTask(title: string, description?: string, priority?: string, status: string = 'backlog') {
    // Click add task button in the specified column
    const addButton = this.getAddTaskButton(status);
    await addButton.click();
    
    // Fill in the task form
    await this.page.fill('input#title', title);
    
    if (description) {
      await this.page.fill('textarea#description', description);
    }
    
    if (priority) {
      await this.page.selectOption('select', priority);
    }
    
    // Submit the form
    await this.page.click('button[type="submit"]:has-text("Create Task")');
    await this.waitForNetworkIdle();
  }

  /**
   * Verify task exists in specific swim lane
   */
  async verifyTaskInColumn(taskTitle: string, columnStatus: string) {
    const swimLane = this.getSwimLaneByStatus(columnStatus);
    const task = swimLane.locator(`h3:has-text("${taskTitle}")`);
    await expect(task).toBeVisible();
  }

  /**
   * Click on a task to view details
   */
  async clickTask(taskTitle: string) {
    const task = this.getTaskByTitle(taskTitle);
    await task.click();
    await this.waitForNetworkIdle();
  }

  /**
   * Verify kanban board is loaded
   */
  async verifyKanbanBoardLoaded() {
    await expect(this.page.locator('.kanban-board')).toBeVisible();
    await expect(this.page.locator('h1:has-text("Kanban Board")')).toBeVisible();
    
    // Verify all swim lanes are present
    await expect(this.page.locator('h2:has-text("Backlog")')).toBeVisible();
    await expect(this.page.locator('h2:has-text("To Do")')).toBeVisible();  
    await expect(this.page.locator('h2:has-text("Doing")')).toBeVisible();
    await expect(this.page.locator('h2:has-text("Done")')).toBeVisible();
  }

  /**
   * Get task count for a specific status
   */
  async getTaskCount(status: string): Promise<number> {
    const swimLane = this.getSwimLaneByStatus(status);
    const badge = swimLane.locator('.rounded-full.text-xs.font-medium');
    const count = await badge.textContent();
    return parseInt(count || '0');
  }

  /**
   * Close any open modals
   */
  async closeModals() {
    // Try to close any open modals by pressing Escape
    await this.page.keyboard.press('Escape');
    await this.waitForNetworkIdle();
  }
}

/**
 * Authentication helpers (Supabase auth)
 */
export class AuthHelpers extends TestHelpers {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string) {
    await this.page.goto('/auth/signup');
    await this.waitForNetworkIdle();
    
    // Fill email field
    await this.page.fill('input[type="email"]', email);
    
    // Fill password field  
    await this.page.fill('input[type="password"]', password);
    
    // Click sign up button
    await this.page.click('button[type="submit"]');
    await this.waitForNetworkIdle();
  }

  /**
   * Sign in an existing user
   */
  async signIn(email: string, password: string) {
    await this.page.goto('/auth/login');
    await this.waitForNetworkIdle();
    
    // Wait for form to be ready
    await this.page.waitForSelector('input[type="email"]', { state: 'visible' });
    await this.page.waitForSelector('input[type="password"]', { state: 'visible' });
    
    // Fill email field
    await this.page.fill('input[type="email"]', email);
    
    // Fill password field
    await this.page.fill('input[type="password"]', password);
    
    // Click sign in button
    await this.page.click('button[type="submit"]');
    
    // Wait for either URL change or success toast
    try {
      // Wait for URL to change to dashboard (client-side navigation)
      await this.page.waitForURL('**/dashboard', { timeout: 10000 });
    } catch (e) {
      // If URL doesn't change, wait for success message
      await this.page.waitForSelector('text=Welcome back!', { timeout: 5000 });
      // Then wait a bit more for potential navigation
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    // If there's a sign out mechanism, implement here
    // For now, we'll clear the session
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.page.goto('/auth/login');
    await this.waitForNetworkIdle();
  }

  /**
   * Verify user is signed in (redirected to dashboard)
   */
  async verifySignedIn() {
    // Wait for either dashboard or check if we're already there
    try {
      await this.page.waitForURL('/dashboard', { timeout: 10000 });
    } catch (e) {
      // If we don't redirect, check current URL
      const currentUrl = this.page.url();
      console.log('Current URL after login attempt:', currentUrl);
      
      // If we're still on login page, there might be an error
      if (currentUrl.includes('/auth/login')) {
        // Check for error messages
        const errorElement = await this.page.locator('text=Invalid').first().isVisible().catch(() => false);
        if (errorElement) {
          throw new Error('Login failed - invalid credentials or server error');
        }
      }
      
      throw new Error(`Expected to be on /dashboard but on ${currentUrl}`);
    }
    
    await expect(this.page.locator('h1:has-text("Mental Bank Balance Dashboard")')).toBeVisible();
  }

  /**
   * Verify user is signed out (on login page)
   */
  async verifySignedOut() {
    await expect(this.page.locator('h2:has-text("Sign In")')).toBeVisible();
  }

  /**
   * Check if toast error message appears
   */
  async waitForErrorToast() {
    // Wait for toast error message to appear
    await this.page.waitForSelector('.go2072408551', { timeout: 5000 });
  }

  /**
   * Check if success toast appears
   */
  async waitForSuccessToast() {
    // Wait for toast success message to appear  
    await this.page.waitForSelector('.go2072408551', { timeout: 5000 });
  }
} 