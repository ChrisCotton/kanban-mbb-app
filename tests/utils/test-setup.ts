import { Page, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import testData from '../fixtures/test-data.json';

const execAsync = promisify(exec);

export class TestSetup {
  private static serverStarted = false;
  private static readonly SERVER_PORT = 3000;
  private static readonly SERVER_URL = `http://localhost:${TestSetup.SERVER_PORT}`;
  private static testUserCreated = false;
  private static setupLock = false;

  /**
   * Complete test environment setup
   */
  static async setupTestEnvironment(): Promise<void> {
    // Prevent multiple parallel setups
    if (TestSetup.setupLock) {
      console.log('⏳ Waiting for setup to complete...');
      while (TestSetup.setupLock) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return;
    }

    TestSetup.setupLock = true;
    
    try {
      console.log('🔧 Setting up test environment...');
      
      // Only setup once per test run
      if (!TestSetup.serverStarted) {
        // 1. Kill all existing dev servers
        await this.killDevServers();
        
        // 2. Clear Next.js cache (ignore errors)
        await this.clearNextCache();
        
        // 3. Start server on consistent port
        await this.startDevServer();
        
        // 4. Wait for server to be ready
        await this.waitForServer();
        
        TestSetup.serverStarted = true;
      }
      
      // 5. Ensure test user exists (only once)
      if (!TestSetup.testUserCreated) {
        await this.ensureTestUserExists();
        TestSetup.testUserCreated = true;
      }
      
      console.log('✅ Test environment ready');
    } finally {
      TestSetup.setupLock = false;
    }
  }

  /**
   * Kill all existing dev servers
   */
  private static async killDevServers(): Promise<void> {
    console.log('💀 Killing existing dev servers...');
    try {
      await execAsync('pkill -f "next dev" || true');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processes to die
    } catch (error) {
      // Ignore errors - processes might not exist
    }
  }

  /**
   * Clear Next.js cache
   */
  private static async clearNextCache(): Promise<void> {
    console.log('🗑️  Clearing Next.js cache...');
    try {
      await execAsync('rm -rf .next');
    } catch (error) {
      console.log('⚠️  Could not clear cache:', error.message);
      // Continue anyway - not critical
    }
  }

  /**
   * Start development server
   */
  private static async startDevServer(): Promise<void> {
    console.log('🚀 Starting development server...');
    
    // Start server in background
    execAsync('npm run dev > dev-server.log 2>&1 &').catch(() => {
      // Ignore errors - server might already be running
    });
  }

  /**
   * Wait for server to be ready
   */
  private static async waitForServer(): Promise<void> {
    console.log('⏳ Waiting for server to be ready...');
    
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${TestSetup.SERVER_URL}/api/health`);
        if (response.ok) {
          console.log('✅ Server is ready');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Server failed to start within timeout period');
  }

  /**
   * Ensure test user exists
   */
  private static async ensureTestUserExists(): Promise<void> {
    console.log('👤 Ensuring test user exists...');
    
    // For now, we'll assume the user exists or will be created during signin
    // This can be enhanced later with actual user creation logic
  }

  /**
   * Navigate to the kanban board and handle authentication
   */
  static async navigateToKanban(page: Page): Promise<void> {
    console.log('🔐 Navigating to kanban board...');
    
    // Navigate to the dashboard first
    await page.goto('/dashboard');
    
    // Check if we're redirected to login
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/auth/login')) {
      console.log('🔑 Redirected to login, signing in...');
      await this.signIn(page);
    } else {
      console.log('ℹ️  No auth redirect, checking if already authenticated...');
    }
    
    // Wait for dashboard to load
    console.log('⏳ Waiting for dashboard to load...');
    await expect(page.locator('h1:has-text("Mental Bank Balance Dashboard")')).toBeVisible({ timeout: 15000 });
    
    // Wait for the kanban board to be visible within the dashboard
    await expect(page.locator('h1:has-text("Kanban Board")')).toBeVisible({ timeout: 15000 });
    
    console.log('✅ Successfully navigated to kanban board');
  }

  /**
   * Sign in with test credentials
   */
  static async signIn(page: Page): Promise<void> {
    const { email, password } = testData.testUser;
    
    console.log(`🔑 Signing in with email: ${email}`);
    
    // Wait for login form to be visible
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible({ timeout: 10000 });
    
    // Fill in credentials
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // Click sign in and wait for navigation
    await page.click('button:has-text("Sign In")');
    
    // Wait for successful authentication (dashboard should load)
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    console.log('✅ Successfully signed in');
  }

  /**
   * Create a test task and return its title
   */
  static async createTestTask(page: Page, taskData: { title: string; description: string }): Promise<string> {
    console.log(`📝 Creating test task: ${taskData.title}`);
    
    // Wait for any existing modals to close
    await page.waitForTimeout(1000);
    
    // Click "Add Task" button in the first column (Backlog)
    await page.locator('button:has-text("Add Task")').first().click();
    
    // Wait for modal to appear
    await expect(page.locator('h2:has-text("Create New Task")')).toBeVisible();
    
    // Fill in task details
    await page.fill('input[placeholder="Enter task title..."]', taskData.title);
    await page.fill('textarea[placeholder="Enter task description..."]', taskData.description);
    
    // Create the task
    await page.click('button:has-text("Create Task")');
    
    // Wait for modal to close and task to appear
    await expect(page.locator('h2:has-text("Create New Task")')).not.toBeVisible();
    await expect(page.locator(`text=${taskData.title}`)).toBeVisible();
    
    console.log('✅ Test task created successfully');
    return taskData.title;
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Fetch all tasks
      const response = await fetch(`${TestSetup.SERVER_URL}/api/kanban/tasks`);
      if (!response.ok) {
        console.log('⚠️  Could not fetch tasks for cleanup');
        return;
      }
      
      const data = await response.json();
      const tasks = Array.isArray(data) ? data : (data.tasks || []);
      
      // Delete test tasks (those with "Test" in the title)
      const testTasks = tasks.filter((task: any) => 
        task.title && task.title.includes('Test')
      );
      
      for (const task of testTasks) {
        try {
          await fetch(`${TestSetup.SERVER_URL}/api/kanban/tasks/${task.id}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.log(`⚠️  Could not delete task ${task.id}:`, error.message);
        }
      }
      
    } catch (error) {
      console.log('⚠️  Error during test data cleanup:', error.message);
    }
  }

  /**
   * Cleanup test environment
   */
  static async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');
    await this.cleanupTestData();
    console.log('✅ Cleanup complete');
  }

  /**
   * Get test data
   */
  static getTestData() {
    return testData;
  }
}

export default TestSetup; 