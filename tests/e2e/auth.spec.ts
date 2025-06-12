import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../utils/test-helpers';

test.describe('Authentication Flow', () => {
  let auth: AuthHelpers;
  const testEmail = `test+${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page);
  });

  // Skip this test if your app doesn't have authentication yet
  test.skip('should sign up a new user', async ({ page }) => {
    await auth.signUp(testEmail, testPassword);
    
    // Verify successful signup (adjust based on your UI)
    await expect(page.locator('[data-testid="signup-success"]')).toBeVisible();
    
    // Or verify redirect to main app
    await expect(page).toHaveURL('/');
    await auth.verifySignedIn();
  });

  // Skip this test if your app doesn't have authentication yet
  test.skip('should sign in existing user', async ({ page }) => {
    // First create an account (you might want to use a test database)
    await auth.signUp(testEmail, testPassword);
    await auth.signOut();
    
    // Now test sign in
    await auth.signIn(testEmail, testPassword);
    await auth.verifySignedIn();
  });

  // Skip this test if your app doesn't have authentication yet
  test.skip('should handle invalid credentials', async ({ page }) => {
    await auth.signIn('invalid@email.com', 'wrongpassword');
    
    // Should show error message
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-error"]')).toContainText(/invalid.*credentials|email.*password/i);
    
    // Should not be signed in
    await auth.verifySignedOut();
  });

  // Skip this test if your app doesn't have authentication yet
  test.skip('should sign out user', async ({ page }) => {
    // Sign in first
    await auth.signIn(testEmail, testPassword);
    await auth.verifySignedIn();
    
    // Sign out
    await auth.signOut();
    await auth.verifySignedOut();
    
    // Should redirect to sign in page
    await expect(page).toHaveURL(/.*auth.*signin/);
  });

  // Skip this test if your app doesn't have authentication yet
  test.skip('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/');
    
    // Should redirect to sign in
    await expect(page).toHaveURL(/.*auth.*signin/);
    
    // Sign in and try again
    await auth.signIn(testEmail, testPassword);
    await page.goto('/');
    
    // Should now have access
    await expect(page).toHaveURL('/');
    await auth.verifySignedIn();
  });

  // This test can be used even without authentication
  test('should handle unauthorized API requests gracefully', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Try to access the main page
    await page.goto('/');
    
    // The page should either:
    // 1. Redirect to sign-in (if auth is required)
    // 2. Show the app (if auth is optional)
    // 3. Show a loading state
    
    // Wait for the page to settle
    await page.waitForLoadState('networkidle');
    
    // Check that the page doesn't show error states
    await expect(page.locator('[data-testid="error-boundary"]')).not.toBeVisible();
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
}); 