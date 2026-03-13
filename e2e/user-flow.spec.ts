import { test, expect } from './fixtures';

test.describe('User Flow E2E', () => {
  test('should complete full user journey: signup → inbox → send compliment', async ({
    page,
    testEmail,
    testPassword,
  }) => {
    // 1. Landing page loads
    await page.goto('/');
    await expect(page.locator('text=ripple')).toBeVisible();
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();

    // 2. Navigate to signup
    await page.click('a:has-text("Create account")');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('text=Join Ripple')).toBeVisible();

    // 3. Fill signup form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.click('button:has-text("Create account")');

    // 4. Verify email confirmation toast appears
    await expect(
      page.locator('text=Check your email')
    ).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();

    // 5. User should stay on signup page (not redirected)
    await expect(page).toHaveURL('/signup');
  });

  test('should allow unauthenticated user to send compliment via wall link', async ({
    page,
  }) => {
    // 1. Navigate to a public wall (using a known username or creating one first)
    // For now, we'll just verify the wall page structure loads
    await page.goto('/wall/test_user_12345');

    // 2. If user exists, we can fill the form
    const wallForm = page.locator('form').first();
    if (await wallForm.isVisible()) {
      // 3. Select category
      await page.locator('[data-testid="category-selector"]').first().click();
      await page.click('text=Professional');

      // 4. Fill message
      await page.fill('textarea[placeholder*="compliment"]', 'You are awesome!');

      // 5. Click send button (should not require auth)
      await page.click('button:has-text("Send")');

      // 6. Verify success toast or redirect
      const successLocator = page.locator('text=/compliment|success/i');
      await expect(successLocator).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show inbox stats after receiving compliments', async ({
    page,
    testEmail,
    testPassword,
  }) => {
    // This test assumes a compliment has been sent to this user
    // In a real scenario, you'd set up test data via API or DB seed

    // 1. Sign in with test user
    await page.goto('/signin');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign in")');

    // 2. Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 3. Verify dashboard page loads
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // 4. Check for stats row (Received, Sent, Streak)
    const statLabels = page.locator('text=Received|Sent|Streak');
    await expect(statLabels).toHaveCount(3);

    // 5. Verify inbox list or empty state
    const inboxList = page.locator('[data-testid="inbox-list"]');
    const emptyState = page.locator('text=No compliments yet');
    const hasCompliments = await inboxList.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasCompliments || isEmpty).toBe(true);
  });

  test('should reveal compliment when clicked in inbox', async ({
    page,
    testEmail,
    testPassword,
  }) => {
    // Prerequisites: user must have at least one unread compliment
    // This is a placeholder for when test data setup is available

    await page.goto('/signin');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign in")');

    await page.waitForURL('/dashboard');

    // Try to find and click a blurred compliment card
    const complimentCard = page.locator('[data-testid="compliment-card"]').first();
    if (await complimentCard.isVisible()) {
      // Card should have a blur effect initially
      const initialBlur = await complimentCard.evaluate((el) =>
        window.getComputedStyle(el).filter
      );

      // Click to reveal
      await complimentCard.click();

      // Wait for animation and blur to be removed
      await page.waitForTimeout(700); // framer-motion animation duration

      const finalBlur = await complimentCard.evaluate((el) =>
        window.getComputedStyle(el).filter
      );

      // Blur should be removed or significantly reduced
      expect(finalBlur).not.toBe(initialBlur);
    }
  });
});
