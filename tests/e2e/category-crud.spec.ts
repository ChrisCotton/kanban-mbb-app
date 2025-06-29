
import { test, expect, Page } from '@playwright/test';
import { AuthHelpers } from '../utils/test-helpers';

test.describe('Category CRUD Operations', () => {
  let auth: AuthHelpers;
  const testEmail = 'thediabolicalmr4dee@gmail.com';
  const testPassword = '12345';

  // Function to create a category, to be reused in update and delete tests
  const createCategory = async (page: Page, name: string, rate: string) => {
    await page.click('button:has-text("Add Category")');
    await expect(page.locator('h2:has-text("Add New Category")')).toBeVisible();
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="hourly_rate_usd"]', rate);
    await page.click('button:has-text("Create Category")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${name}`)).toBeVisible();
  };

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page);
    // Sign in and navigate to the categories page before each test
    await auth.signIn(testEmail, testPassword);
    await auth.verifySignedIn();
    await page.goto('/categories');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Task Categories")')).toBeVisible();
  });

  test('should create, update, and then delete a category', async ({ page }) => {
    const initialCategoryName = `Test Category ${Date.now()}`;
    const initialRate = '50.00';
    const updatedCategoryName = `${initialCategoryName} (Updated)`;
    const updatedRate = '75.50';

    // 1. CREATE a new category
    console.log(`Creating category: ${initialCategoryName}`);
    await createCategory(page, initialCategoryName, initialRate);
    await expect(page.locator(`text=${initialCategoryName}`)).toBeVisible();
    await expect(page.locator(`text=${initialRate}`)).toBeVisible();
    console.log('Category created successfully.');

    // 2. UPDATE the newly created category
    console.log(`Updating category: ${initialCategoryName}`);
    const categoryRow = page.locator(`div.flex.items-center.justify-between:has(h4:has-text("${initialCategoryName}"))`);
    await categoryRow.locator('button[title="Edit category"]').click();
    
    await expect(page.locator('h2:has-text("Edit Category")')).toBeVisible();
    await page.fill('input[name="name"]', updatedCategoryName);
    await page.fill('input[name="hourly_rate_usd"]', updatedRate);
    await page.click('button:has-text("Update Category")');
    await page.waitForLoadState('networkidle');

    // Verify the update
    await expect(page.locator(`text=${updatedCategoryName}`)).toBeVisible();
    await expect(page.locator(`text=${updatedRate}`)).toBeVisible();
    await expect(page.locator(`text=${initialCategoryName}`)).not.toBeVisible();
    console.log('Category updated successfully.');

    // 3. DELETE the updated category
    console.log(`Deleting category: ${updatedCategoryName}`);
    // Set up a handler for the confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toContain('confirm');
      expect(dialog.message()).toContain(`Are you sure you want to delete "${updatedCategoryName}"`);
      await dialog.accept();
    });

    const updatedCategoryRow = page.locator(`div.flex.items-center.justify-between:has(h4:has-text("${updatedCategoryName}"))`);
    await updatedCategoryRow.locator('button[title="Delete category"]').click();
    
    // Wait for the deletion to process
    await page.waitForLoadState('networkidle');

    // Verify the category is no longer in the list
    await expect(page.locator(`text=${updatedCategoryName}`)).not.toBeVisible();
    console.log('Category deleted successfully.');
  });
});
