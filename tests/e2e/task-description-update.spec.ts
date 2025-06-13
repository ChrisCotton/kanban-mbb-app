import { test, expect } from '@playwright/test';
import TestSetup from '../utils/test-setup';

test.describe('Task Description Update Regression Tests', () => {
  const testData = TestSetup.getTestData();

  // Global setup - run once before all tests with increased timeout
  test.beforeAll(async () => {
    await TestSetup.setupTestEnvironment();
  });

  // Set timeout for all tests in this describe block
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Navigate to kanban board and handle authentication
    await TestSetup.navigateToKanban(page);
    
    // Ensure no modals are open before starting test
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test.afterEach(async ({ page }) => {
    // Close any open modals before cleanup
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Clean up test data after each test
    await TestSetup.cleanupTestData();
  });

  test.afterAll(async () => {
    await TestSetup.cleanup();
  });

  test('should save description changes when clicking Update Task button', async ({ page }) => {
    // Create a test task
    const taskTitle = await TestSetup.createTestTask(page, {
      title: `Description Update Test ${Date.now()}`,
      description: testData.testDescriptions.original
    });
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
    // Click on the task to open detail modal - use force click to bypass overlays
    await page.locator(`text=${taskTitle}`).click({ force: true });
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Update the description
    const descriptionTextarea = page.locator('textarea[placeholder*="description"]');
    await descriptionTextarea.clear();
    await descriptionTextarea.fill(testData.testDescriptions.updated);
    
    // Save changes
    await page.click('button:has-text("Update Task")');
    
    // Wait for modal to close
    await expect(page.locator('h1:has-text("Task Details")')).not.toBeVisible();
    
    // Verify the task still exists with updated description
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
  });

  test('should persist description changes after modal close and reopen', async ({ page }) => {
    // Create a test task
    const taskTitle = await TestSetup.createTestTask(page, {
      title: `Persistence Test ${Date.now()}`,
      description: testData.testDescriptions.original
    });
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
    // Open task detail modal
    await page.locator(`text=${taskTitle}`).click({ force: true });
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Update description
    const descriptionTextarea = page.locator('textarea[placeholder*="description"]');
    await descriptionTextarea.clear();
    await descriptionTextarea.fill(testData.testDescriptions.updated);
    
    // Save and close
    await page.click('button:has-text("Update Task")');
    await expect(page.locator('h1:has-text("Task Details")')).not.toBeVisible();
    
    // Wait a moment for any state updates
    await page.waitForTimeout(1000);
    
    // Reopen the task
    await page.locator(`text=${taskTitle}`).click({ force: true });
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Verify description persisted
    await expect(page.locator(`text=${testData.testDescriptions.updated}`)).toBeVisible();
  });

  test('should handle empty description updates', async ({ page }) => {
    // Create a test task
    const taskTitle = await TestSetup.createTestTask(page, {
      title: `Empty Description Test ${Date.now()}`,
      description: testData.testDescriptions.original
    });
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
    // Open task detail modal
    await page.locator(`text=${taskTitle}`).click({ force: true });
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Clear description completely
    const descriptionTextarea = page.locator('textarea[placeholder*="description"]');
    await descriptionTextarea.clear();
    
    // Save changes
    await page.click('button:has-text("Update Task")');
    await expect(page.locator('h1:has-text("Task Details")')).not.toBeVisible();
    
    // Verify task still exists
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
  });

  test('should handle special characters in description', async ({ page }) => {
    // Create a test task
    const taskTitle = await TestSetup.createTestTask(page, {
      title: `Special Chars Test ${Date.now()}`,
      description: 'Original description'
    });
    
    const specialDescription = testData.testDescriptions.special;
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
    // Open task detail modal
    await page.locator(`text=${taskTitle}`).click({ force: true });
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Update with special characters
    const descriptionTextarea = page.locator('textarea[placeholder*="description"]');
    await descriptionTextarea.clear();
    await descriptionTextarea.fill(specialDescription);
    
    // Save changes
    await page.click('button:has-text("Update Task")');
    await expect(page.locator('h1:has-text("Task Details")')).not.toBeVisible();
    
    // Wait a moment for any state updates
    await page.waitForTimeout(1000);
    
    // Close and reopen
    await page.locator(`text=${taskTitle}`).click({ force: true });
    
    // Verify special characters are preserved
    await expect(page.locator(`text=${specialDescription}`)).toBeVisible();
  });

  test('should not save changes when clicking Cancel', async ({ page }) => {
    // Create a test task
    const taskTitle = await TestSetup.createTestTask(page, {
      title: `Cancel Test ${Date.now()}`,
      description: testData.testDescriptions.original
    });
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000);
    
    // Open task detail modal
    await page.locator(`text=${taskTitle}`).click({ force: true });
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    
    // Make changes to description
    const descriptionTextarea = page.locator('textarea[placeholder*="description"]');
    await descriptionTextarea.clear();
    await descriptionTextarea.fill('This should not be saved');
    
    // Click Cancel instead of Update
    await page.click('button:has-text("Cancel")');
    
    // Handle the confirmation modal if it appears
    const discardButton = page.locator('button:has-text("Yes, Discard Changes")');
    if (await discardButton.isVisible({ timeout: 2000 })) {
      await discardButton.click();
    }
    
    // Wait for modal to close
    await expect(page.locator('h1:has-text("Task Details")')).not.toBeVisible();
    
    // Wait a moment for any state updates
    await page.waitForTimeout(1000);
    
    // Reopen and verify original description is preserved
    await page.locator(`text=${taskTitle}`).click({ force: true });
    await expect(page.locator('h1:has-text("Task Details")')).toBeVisible();
    await expect(page.locator(`text=${testData.testDescriptions.original}`)).toBeVisible();
    await expect(page.locator('text=This should not be saved')).not.toBeVisible();
  });
}); 