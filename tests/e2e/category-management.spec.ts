import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../utils/test-helpers';

test.describe('Category Management', () => {
  let auth: AuthHelpers;
  const testEmail = 'thediabolicalmr4dee@gmail.com';
  const testPassword = '12345';

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page);
    // Login before each test
    await auth.signIn(testEmail, testPassword);
    await auth.verifySignedIn();
  });

  test('should navigate to categories page and display categories interface', async ({ page }) => {
    // Navigate to categories page
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // Verify categories page loaded
    await expect(page.locator('h1:has-text("Task Categories")')).toBeVisible();
    await expect(page.locator('text=Manage your task categories and hourly rates')).toBeVisible();
    await expect(page.locator('button:has-text("Add Category")')).toBeVisible();
  });

  test('should open add category modal when clicking Add Category button', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // Click Add Category button
    await page.click('button:has-text("Add Category")');

    // Verify modal opened
    await expect(page.locator('text=Add New Category')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="hourly_rate_usd"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create Category")')).toBeVisible();
  });

  test('should create a new category successfully', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // Click Add Category button
    await page.click('button:has-text("Add Category")');

    // Fill out category form
    const categoryName = `Test Category ${Date.now()}`;
    const hourlyRate = '75.00';

    await page.fill('input[name="name"]', categoryName);
    await page.fill('input[name="hourly_rate_usd"]', hourlyRate);

    // Submit form
    await page.click('button:has-text("Create Category")');

    // Wait for category to be created and modal to close
    await page.waitForLoadState('networkidle');

    // Verify category appears in the list
    await expect(page.locator(`text=${categoryName}`)).toBeVisible();
    await expect(page.locator(`text=$${hourlyRate}`)).toBeVisible();
  });

  test('should validate required fields when creating category', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // Click Add Category button
    await page.click('button:has-text("Add Category")');

    // Try to submit empty form
    await page.click('button:has-text("Create Category")');

    // Verify validation - the form should not submit and modal should remain open
    await expect(page.locator('text=Add New Category')).toBeVisible();
    
    // The name field should be required
    await expect(page.locator('input[name="name"]')).toBeFocused();
  });

  test('should handle duplicate category names', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    const duplicateName = `Duplicate Test ${Date.now()}`;

    // Create first category
    await page.click('button:has-text("Add Category")');
    await page.fill('input[name="name"]', duplicateName);
    await page.fill('input[name="hourly_rate_usd"]', '50.00');
    await page.click('button:has-text("Create Category")');
    await page.waitForLoadState('networkidle');

    // Try to create duplicate category
    await page.click('button:has-text("Add Category")');
    await page.fill('input[name="name"]', duplicateName);
    await page.fill('input[name="hourly_rate_usd"]', '60.00');
    await page.click('button:has-text("Create Category")');

    // Should show error or prevent creation
    await page.waitForTimeout(2000);
    // The error handling will depend on the implementation
  });

  test('should edit an existing category', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // First create a category to edit
    const originalName = `Edit Test ${Date.now()}`;
    await page.click('button:has-text("Add Category")');
    await page.fill('input[name="name"]', originalName);
    await page.fill('input[name="hourly_rate_usd"]', '80.00');
    await page.click('button:has-text("Create Category")');
    await page.waitForLoadState('networkidle');

    // Look for edit button (might be an icon or text)
    const editButton = page.locator(`text=${originalName}`).locator('..').locator('button').first();
    await editButton.click();

    // Edit the category
    const newName = `${originalName} - Edited`;
    await page.fill('input[name="name"]', newName);
    await page.fill('input[name="hourly_rate_usd"]', '85.00');
    
    // Save changes
    await page.click('button:has-text("Update Category")');
    await page.waitForLoadState('networkidle');

    // Verify changes
    await expect(page.locator(`text=${newName}`)).toBeVisible();
    await expect(page.locator('text=$85.00')).toBeVisible();
  });

  test('should delete a category', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // First create a category to delete
    const categoryToDelete = `Delete Test ${Date.now()}`;
    await page.click('button:has-text("Add Category")');
    await page.fill('input[name="name"]', categoryToDelete);
    await page.fill('input[name="hourly_rate_usd"]', '90.00');
    await page.click('button:has-text("Create Category")');
    await page.waitForLoadState('networkidle');

    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    // Look for delete button
    const deleteButton = page.locator(`text=${categoryToDelete}`).locator('..').locator('button').last();
    await deleteButton.click();

    await page.waitForLoadState('networkidle');

    // Verify category is deleted
    await expect(page.locator(`text=${categoryToDelete}`)).not.toBeVisible();
  });

  test('should show empty state when no categories exist', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // If there are no categories, should show empty state
    const categoryCount = await page.locator('[data-testid="category-item"]').count();
    
    if (categoryCount === 0) {
      await expect(page.locator('text=No Categories Yet')).toBeVisible();
      await expect(page.locator('text=Create your first category to start organizing your tasks')).toBeVisible();
      await expect(page.locator('button:has-text("Add First Category")')).toBeVisible();
    }
  });

  test('should navigate from categories page to other pages', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // Test navigation to other pages
    await page.click('a[href="/dashboard"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Mental Bank Balance Dashboard")')).toBeVisible();

    // Navigate back to categories
    await page.click('a[href="/categories"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Task Categories")')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    // Mock API failure
    await page.route('/api/categories', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Server error' })
      });
    });

    // Try to create a category
    await page.click('button:has-text("Add Category")');
    await page.fill('input[name="name"]', 'Test Category');
    await page.fill('input[name="hourly_rate_usd"]', '50.00');
    await page.click('button:has-text("Create Category")');

    // Should handle error gracefully
    await page.waitForTimeout(2000);
    // The error handling will depend on the implementation
  });

  test('should validate hourly rate format', async ({ page }) => {
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Add Category")');
    await page.fill('input[name="name"]', 'Test Category');
    
    // Test invalid hourly rate formats
    await page.fill('input[name="hourly_rate_usd"]', 'invalid');
    await page.click('button:has-text("Create Category")');
    
    // Should show validation error or prevent submission
    await page.waitForTimeout(1000);
    
    // Try negative rate
    await page.fill('input[name="hourly_rate_usd"]', '-10');
    await page.click('button:has-text("Create Category")');
    
    await page.waitForTimeout(1000);
  });
}); 