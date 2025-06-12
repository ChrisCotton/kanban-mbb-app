import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../utils/test-helpers';

test.describe('Authentication - Core Tests', () => {
  let auth: AuthHelpers;
  const testEmail = 'thediabolicalmr4dee@gmail.com';
  const testPassword = '12345';

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page);
  });

  test('should successfully log in with valid credentials', async ({ page }) => {
    // This is the main test - if this passes, auth is working
    await auth.signIn(testEmail, testPassword);
    await auth.verifySignedIn();
    
    // Verify we can see the dashboard
    await expect(page.locator('h1:has-text("Mental Bank Balance Dashboard")')).toBeVisible();
    await expect(page.locator('.kanban-board')).toBeVisible();
  });

  test('should stay on login page with invalid credentials', async ({ page }) => {
    // Try with wrong password
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should stay on login page (no redirect)
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL('/auth/login');
    await expect(page.locator('h2:has-text("Sign In")')).toBeVisible();
  });
}); 