import { test, expect } from "@playwright/test";
import { AuthHelpers } from "../utils/test-helpers";

test.describe("Category Creation - Fix MBB Bugs", () => {
  let auth: AuthHelpers;
  const testEmail = "thediabolicalmr4dee@gmail.com";
  const testPassword = "12345";

  test.beforeEach(async ({ page }) => {
    auth = new AuthHelpers(page);
  });

  test("should login and create FIX MBB BUGS category with 100 hourly rate", async ({ page }) => {
    console.log("Step 1: Logging in...");
    await auth.signIn(testEmail, testPassword);
    await auth.verifySignedIn();
    
    console.log("Step 2: Navigating to categories page...");
    
    let categoriesUrl = "http://localhost:3000/categories";
    try {
      await page.goto(categoriesUrl, { timeout: 5000 });
    } catch (error) {
      console.log("Port 3000 failed, trying 3001...");
      categoriesUrl = "http://localhost:3001/categories";
      await page.goto(categoriesUrl);
    }
    
    await page.waitForLoadState("networkidle");
    
    await expect(page.locator("h1:has-text(\"Task Categories\")")).toBeVisible();
    console.log("✓ Categories page loaded successfully");

    console.log("Step 3: Clicking Add Category button...");
    await page.click("button:has-text(\"Add Category\")");
    
    await expect(page.locator("text=Add New Category")).toBeVisible();
    console.log("✓ Add Category modal opened");

    console.log("Step 4: Filling in category details...");
    
    const nameInput = page.locator("input").first();
    await nameInput.fill("FIX MBB BUGS");
    
    const rateInput = page.locator("input[type=\"number\"]").first();
    await rateInput.fill("100");
    
    console.log("✓ Category details filled in");

    console.log("Step 5: Submitting category...");
    
    const responsePromise = page.waitForResponse(response => 
      response.url().includes("/api/categories") && 
      response.request().method() === "POST"
    );
    
    await page.click("text=Add Category");
    
    const response = await responsePromise;
    console.log(`API Response Status: ${response.status()}`);
    
    if (response.status() === 201 || response.status() === 200) {
      console.log("✓ Category created successfully via API");
    } else {
      const responseBody = await response.text();
      console.log(`API Error: ${responseBody}`);
      throw new Error(`Category creation failed with status ${response.status()}: ${responseBody}`);
    }
  });
});
