import { test, expect } from '@playwright/test';

test.describe('Auth Debug - Manual Investigation', () => {
  const testEmail = 'thediabolicalmr4dee@gmail.com';
  const testPassword = '12345';

  test('debug login step by step', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('response', response => {
      if (response.url().includes('auth') || response.status() >= 400) {
        console.log('RESPONSE:', response.status(), response.url());
      }
    });

    console.log('Step 1: Navigate to login page');
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    console.log('Step 2: Take screenshot of login page');
    await page.screenshot({ path: 'debug-login-page.png' });
    
    console.log('Step 3: Check if form elements exist');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    console.log('Step 4: Fill form fields');
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    
    console.log('Step 5: Take screenshot before submit');
    await page.screenshot({ path: 'debug-before-submit.png' });
    
    console.log('Step 6: Click submit and watch what happens');
    await submitButton.click();
    
    // Wait a bit to see what happens
    await page.waitForTimeout(2000);
    
    console.log('Step 7: Check current URL');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    console.log('Step 8: Take screenshot after submit');
    await page.screenshot({ path: 'debug-after-submit.png' });
    
    console.log('Step 9: Check for any error messages');
    const errors = await page.locator('text=error, text=invalid, text=wrong').all();
    for (const error of errors) {
      const text = await error.textContent();
      console.log('Found error text:', text);
    }
    
    console.log('Step 10: Check for loading states');
    const loadingElements = await page.locator('text=loading, text=signing, [disabled]').all();
    console.log('Loading elements found:', loadingElements.length);
    
    // Final status
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS: Redirected to dashboard');
    } else if (currentUrl.includes('/auth/login')) {
      console.log('❌ FAILED: Still on login page');
    } else {
      console.log('❓ UNKNOWN: On unexpected page:', currentUrl);
    }
  });
}); 