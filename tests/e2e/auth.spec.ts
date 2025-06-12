import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../utils/test-helpers';

test.describe('Authentication Flow', () => {
  let auth: AuthHelpers;
  // Use the specific credentials provided by the user
  const testEmail = 'thediabolicalmr4dee@gmail.com';
  const testPassword = '12345';

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page);
  });

  test('should sign in with existing user credentials', async ({ page }) => {
    // Sign in with provided credentials
    await auth.signIn(testEmail, testPassword);
    
    // Verify successful sign in - should redirect to dashboard
    await auth.verifySignedIn();
  });

  test('should handle invalid credentials', async ({ page }) => {
    // Try to sign in with wrong password
    await auth.signIn(testEmail, 'wrongpassword');
    
    // Should stay on login page and show error via toast
    await expect(page).toHaveURL('/auth/login');
    
    // Verify we're still on the sign in page
    await auth.verifySignedOut();
  });

  test('should handle invalid email', async ({ page }) => {
    // Try to sign in with non-existent email
    await auth.signIn('nonexistent@email.com', testPassword);
    
    // Should stay on login page
    await expect(page).toHaveURL('/auth/login');
    
    // Verify we're still on the sign in page
    await auth.verifySignedOut();
  });

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Try to access protected route without authentication
    try {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (error) {
      // Ignore navigation errors due to redirects
      console.log('Navigation intercepted by redirect (expected)');
    }
    
    // Wait for the page to settle and check where we ended up
    await page.waitForTimeout(2000);
    
    // We should be redirected to login page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/login');
    
    // Verify we're on the sign in page
    await auth.verifySignedOut();
  });

  test('should allow access to dashboard after successful login', async ({ page }) => {
    // Clear any existing auth state first
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Sign in with valid credentials
    await auth.signIn(testEmail, testPassword);
    
    // Should be redirected to dashboard
    await auth.verifySignedIn();
    
    // Try to access dashboard directly - should work
    await page.goto('/dashboard');
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