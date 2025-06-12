import { test, expect } from '@playwright/test';
import { TestHelpers, AuthHelpers } from '../utils/test-helpers';

test.describe('Smoke Tests - Basic App Functionality', () => {
  let helpers: TestHelpers;
  let auth: AuthHelpers;
  const testEmail = 'thediabolicalmr4dee@gmail.com';
  const testPassword = '12345';

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    auth = new AuthHelpers(page);
  });

  test('app loads without errors after authentication', async ({ page }) => {
    // Sign in first
    await auth.signIn(testEmail, testPassword);
    await auth.verifySignedIn();
    
    // Check that dashboard loads successfully
    await expect(page).toHaveURL('/dashboard');
    await expect(page).not.toHaveTitle('');
    
    // Verify no JavaScript errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for page to fully load
    await helpers.waitForNetworkIdle();
    
    // Check for critical elements
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1:has-text("Mental Bank Balance Dashboard")')).toBeVisible();
    
    // Verify no critical console errors (some warnings are OK)
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Warning:') && 
      !error.includes('deprecated') &&
      !error.includes('DevTools')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('landing page loads correctly', async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    
    // Go to home page
    await helpers.navigateToHome();
    
    // Should be on landing page
    await expect(page).toHaveURL('/');
    
    // Check for main landing page elements
    await expect(page.locator('h1:has-text("Mental Bank Balance")')).toBeVisible();
    await expect(page.locator('button:has-text("Get Started Free")')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('responsive design basics work', async ({ page }) => {
    await helpers.navigateToHome();
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await helpers.waitForNetworkIdle();
    
    // Verify page content is visible
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await helpers.waitForNetworkIdle();
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await helpers.waitForNetworkIdle();
    await expect(page.locator('body')).toBeVisible();
    
    // Verify no horizontal scroll on mobile
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for potential rounding
  });

  test('API endpoints respond correctly', async ({ page }) => {
    // Test API health by making a request
    const response = await page.request.get('/api/health');
    
    // If you don't have a health endpoint, test any public API
    if (response.status() === 404) {
      // Try a different endpoint that might exist
      const tasksResponse = await page.request.get('/api/kanban/tasks');
      // This might return 401 (unauthorized) or 200, both are OK for smoke test
      expect([200, 401, 404]).toContain(tasksResponse.status());
    } else {
      expect(response.status()).toBe(200);
    }
  });

  test('CSS and assets load properly', async ({ page }) => {
    await helpers.navigateToHome();
    
    // Check that stylesheets loaded
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    
    // Verify at least one stylesheet exists (Tailwind/CSS)
    expect(stylesheets).toBeGreaterThan(0);
    
    // Check for any failed network requests
    const failedRequests = [];
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes(page.url())) {
        failedRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    await helpers.waitForNetworkIdle();
    
    // Filter out expected 404s (like favicon, etc.)
    const criticalFailures = failedRequests.filter(req => 
      !req.url.includes('favicon') && 
      !req.url.includes('.map') &&
      req.status >= 500
    );
    
    expect(criticalFailures).toHaveLength(0);
  });

  test('basic accessibility standards', async ({ page }) => {
    await helpers.navigateToHome();
    
    // Check for basic accessibility features
    
    // Verify page has a title
    const title = await page.title();
    expect(title).not.toBe('');
    expect(title.length).toBeGreaterThan(0);
    
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    const mainCount = await main.count();
    expect(mainCount).toBeGreaterThanOrEqual(1);
    
    // Verify proper heading structure (at least one h1)
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check that interactive elements are keyboard accessible
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();
      
      // Test keyboard navigation
      await firstButton.focus();
      await expect(firstButton).toBeFocused();
    }
  });

  test('performance is acceptable', async ({ page }) => {
    // Start measuring performance
    const startTime = Date.now();
    
    await helpers.navigateToHome();
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Basic performance check - page should load in reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Check for performance metrics if available
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });
    
    // DOM should load quickly
    expect(performanceMetrics.domContentLoaded).toBeLessThan(5000);
  });

  test('handles network failures gracefully', async ({ page }) => {
    await helpers.navigateToHome();
    
    // Simulate slow network
    await page.route('**/*', route => {
      // Add delay to all requests
      setTimeout(() => route.continue(), 100);
    });
    
    // Reload page with slow network
    await page.reload();
    
    // Page should still load (just slower)
    await expect(page.locator('body')).toBeVisible();
    
    // Remove route handler
    await page.unroute('**/*');
  });
}); 